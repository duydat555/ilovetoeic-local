import sys
import os
import time

# Ensure server root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.services.cache_service import cache_service
from app.routers.practice import clear_practice_caches, _L0_CACHE

client = TestClient(app)

def test_practice_level_summary_redis_caching():
    print("[*] Running test_practice_level_summary_redis_caching...")
    # 1. Clear any prior cache
    clear_practice_caches()
    assert len(_L0_CACHE) == 0, f"Expected L0 to be empty, got {len(_L0_CACHE)}"

    # 2. First request - should fetch from DB and populate Redis + L0
    res1 = client.get("/api/v1/practice-by-level/summary")
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    data1 = res1.json()
    assert data1["success"] is True
    assert len(data1["data"]) > 0

    # 3. Check Redis key exists
    cached_redis = cache_service.get("practice:summary")
    assert cached_redis is not None, "Expected Redis key practice:summary to exist"
    assert cached_redis["success"] is True
    assert len(cached_redis["data"]) == len(data1["data"])

    # 4. Check L0 cache exists
    assert "practice:summary" in _L0_CACHE, "Expected practice:summary in L0 cache"

    # 5. Clear L0 only (simulating worker B that does not have worker A's L0)
    _L0_CACHE.clear()
    res2 = client.get("/api/v1/practice-by-level/summary")
    assert res2.status_code == 200
    assert res2.json() == data1

    # 6. Global invalidation via clear_practice_caches()
    clear_practice_caches()
    assert cache_service.get("practice:summary") is None, "Expected practice:summary deleted in Redis"
    assert len(_L0_CACHE) == 0
    print("[+] test_practice_level_summary_redis_caching passed!")


def test_practice_level_questions_redis_caching():
    print("[*] Running test_practice_level_questions_redis_caching...")
    clear_practice_caches()

    # Request Part 5 Level 3
    res1 = client.get("/api/v1/practice-by-level/questions?part=5&level=3")
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["part"] == 5
    assert data1["level"] == 3

    # Check Redis cache
    cached = cache_service.get("practice:questions:5:3")
    assert cached is not None, "Expected Redis key practice:questions:5:3 to exist"
    assert cached["part"] == 5
    assert cached["level"] == 3
    assert cached["total_questions"] == data1["total_questions"]

    # Clear practice caches
    clear_practice_caches()
    assert cache_service.get("practice:questions:5:3") is None, "Expected Redis key deleted"
    print("[+] test_practice_level_questions_redis_caching passed!")


if __name__ == "__main__":
    test_practice_level_summary_redis_caching()
    test_practice_level_questions_redis_caching()
    print("[SUCCESS] All Phase 1 Redis tests passed cleanly!")
