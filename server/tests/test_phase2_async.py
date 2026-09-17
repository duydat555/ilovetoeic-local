import os
import sys
import time
import asyncio
import statistics
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.services.gemini_service import gemini_service
from main import app

def test_endpoints():
    client = TestClient(app)

    print("   Testing POST /api/v1/translate (exact match)...")
    res = client.post("/api/v1/translate", json={"text": "accommodate", "context": "We can accommodate your request."})
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "translated_text" in data
    assert data.get("cache_source") in ("system_vocabulary", "redis", "memory", "community")

    print("   Testing POST /api/v1/translate (inflection match)...")
    res = client.post("/api/v1/translate", json={"text": "accommodated", "context": "They accommodated the guests."})
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "translated_text" in data

    print("   Testing POST /api/v1/translate/batch...")
    res = client.post("/api/v1/translate/batch", json={"items": ["schedule", "budget", "invoice"], "context": "Review budget."})
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "data" in data and data["count"] == 3

    print("   Testing POST /api/v1/translate/details (examples)...")
    res = client.post("/api/v1/translate/details", json={"text": "accommodate", "section": "examples"})
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "items" in data

    print("   Testing GET /api/v1/translate/passage/1...")
    res = client.get("/api/v1/translate/passage/1")
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "passage_id" in data

    print("   Testing GET /api/v1/translate/cache-stats...")
    res = client.get("/api/v1/translate/cache-stats")
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert "redis_connected" in data
    print(f"   Cache Stats: {data}")

async def benchmark_concurrent_lookups(n=100):
    words = ["schedule", "accommodate", "proposal", "budget", "conference", "incurred", "complied", "expedited"] * (n // 8 + 1)
    words = words[:n]
    
    start_all = time.perf_counter()
    latencies = []

    async def single_lookup(w):
        t0 = time.perf_counter()
        res = await gemini_service._lookup_system_vocabulary(w)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)
        return res

    tasks = [single_lookup(w) for w in words]
    results = await asyncio.gather(*tasks)
    total_time = (time.perf_counter() - start_all) * 1000

    assert len(results) == n
    assert all(r is not None for r in results)
    
    latencies.sort()
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    avg = statistics.mean(latencies)
    
    print(f"   Total time for {n} concurrent lookups: {total_time:.2f}ms")
    print(f"   Latency: avg={avg:.2f}ms, P50={p50:.2f}ms, P95={p95:.2f}ms, P99={p99:.2f}ms")
    return p99

async def run_suite():
    print(f"\n=======================================================")
    print(f"MODE: USE_ASYNC_MYSQL_DRIVER = {config.USE_ASYNC_MYSQL_DRIVER}")
    print(f"=======================================================")
    
    print("\n[+] 1. Running 100 concurrent async Tier 2 DB lookups...")
    p99 = await benchmark_concurrent_lookups(100)
    print(f"   P99 latency: {p99:.2f}ms")

if __name__ == "__main__":
    asyncio.run(run_suite())
    print("\n[+] 2. Testing all 5 Translation API Endpoints via TestClient...")
    test_endpoints()
    print("\n[+] All tests in this mode PASSED cleanly!")
