import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.routers.practice import clear_practice_caches

client = TestClient(app)

def test_v1_and_v2_response_formats():
    print("[*] Testing Phase 3 deduplication for Part 7 Level 3...")
    clear_practice_caches()

    # 1. Fetch v1 legacy format
    res_v1 = client.get("/api/v1/practice-by-level/questions?part=7&level=3&response_format=v1")
    assert res_v1.status_code == 200, f"v1 failed: {res_v1.status_code}"
    data_v1 = res_v1.json()
    assert "passages" not in data_v1
    assert "questions" in data_v1
    size_v1 = len(res_v1.content)

    # 2. Fetch v2 deduplicated format
    res_v2 = client.get("/api/v1/practice-by-level/questions?part=7&level=3&response_format=v2")
    assert res_v2.status_code == 200, f"v2 failed: {res_v2.status_code}"
    data_v2 = res_v2.json()
    assert "passages" in data_v2
    assert "questions" in data_v2
    size_v2 = len(res_v2.content)

    # 3. Verify total questions count matches
    assert len(data_v1["questions"]) == len(data_v2["questions"])
    assert data_v1["total_questions"] == data_v2["total_questions"]

    # 4. Verify unpacking v2 produces identical data to v1
    passages = data_v2["passages"]
    for q1, q2 in zip(data_v1["questions"], data_v2["questions"]):
        assert q1["id"] == q2["id"]
        pid = q2.get("passage_id")
        if pid and pid in passages:
            passage_data = passages[pid]
            for field, val in passage_data.items():
                assert q1.get(field) == val, f"Mismatch on field {field} for question {q1['id']}"

    # 5. Verify payload reduction
    reduction_bytes = size_v1 - size_v2
    reduction_pct = (reduction_bytes / size_v1) * 100
    print(f"[+] Part 7 v1 size: {size_v1:,} bytes")
    print(f"[+] Part 7 v2 size: {size_v2:,} bytes")
    print(f"[+] Savings: {reduction_bytes:,} bytes ({reduction_pct:.1f}% reduction)")
    assert size_v2 < size_v1, "v2 response size must be smaller than v1"
    print("[+] Phase 3 deduplication verified successfully!")


if __name__ == "__main__":
    test_v1_and_v2_response_formats()
    print("[SUCCESS] All Phase 3 deduplication tests passed cleanly!")
