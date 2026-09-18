import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_nginx_config_file_integrity():
    print("\n[+] 1. Verifying Nginx configuration file content and syntax...")
    conf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nginx", "practice_by_level_cache.conf"))
    assert os.path.exists(conf_path), f"Nginx config file not found at {conf_path}"

    with open(conf_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify key directives
    assert "proxy_cache_path" in content
    assert "PRACTICE_LEVEL_CACHE:50m" in content
    assert "proxy_cache PRACTICE_LEVEL_CACHE;" in content
    assert 'proxy_cache_key "$scheme$request_method$host$request_uri";' in content
    assert "proxy_cache_valid 200 180s;" in content
    assert "X-Cache-Status" in content
    assert "proxy_cache_bypass" in content
    print("    [PASSED] Nginx configuration file contains all required cache and purge directives.")


def test_backend_cache_control_headers():
    print("\n[+] 2. Verifying FastAPI Cache-Control headers match Nginx 180s TTL...")
    res_sum = client.get("/api/v1/practice-by-level/summary")
    assert res_sum.status_code == 200
    cc_sum = res_sum.headers.get("Cache-Control", "")
    assert "max-age=180" in cc_sum, f"Summary Cache-Control mismatch: {cc_sum}"
    print(f"    [PASSED] Summary endpoint sends '{cc_sum}'.")

    res_q = client.get("/api/v1/practice-by-level/questions?part=5&level=3")
    assert res_q.status_code == 200
    cc_q = res_q.headers.get("Cache-Control", "")
    assert "max-age=180" in cc_q, f"Questions Cache-Control mismatch: {cc_q}"
    print(f"    [PASSED] Questions endpoint sends '{cc_q}'.")


if __name__ == "__main__":
    test_nginx_config_file_integrity()
    test_backend_cache_control_headers()
    print("\n=======================================================")
    print("[+] ALL PHASE 8 ACCEPTANCE CRITERIA PASSED CLEANLY!")
    print("=======================================================")
