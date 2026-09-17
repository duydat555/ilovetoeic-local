import asyncio
import os
import sys
import time

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.db import db
from app.services.gemini_service import gemini_service
from fastapi.testclient import TestClient
from main import app

async def test_phase3():
    print("=" * 60)
    print("PHASE 3 VERIFICATION: WRITE OPTIMIZATION & CACHE BUFFERING")
    print("=" * 60)

    # 1. Targeted Cache Invalidation in Database
    print("\n[+] 1. Testing targeted query_ram_cache invalidation in db.py...")
    db.query_ram_cache["SELECT * FROM test_sets:()"] = [{"id": 1}]
    db.query_ram_cache["SELECT * FROM passages:()"] = [{"id": 2}]
    db.query_ram_cache["SELECT * FROM user_feedback:()"] = [{"id": 3}]

    # When updating user_feedback with targeted invalidation:
    db._invalidate_cache("UPDATE user_feedback SET status = 1 WHERE id = 1", invalidate=True)
    assert "SELECT * FROM user_feedback:()" not in db.query_ram_cache, "user_feedback cache should have been removed!"
    assert "SELECT * FROM test_sets:()" in db.query_ram_cache, "test_sets cache should NOT have been cleared!"
    assert "SELECT * FROM passages:()" in db.query_ram_cache, "passages cache should NOT have been cleared!"
    print("   [PASSED] Targeted invalidation successfully evicted ONLY user_feedback!")

    # When executing with invalidate_cache=False:
    db._invalidate_cache("UPDATE test_sets SET name = 'new' WHERE id = 1", invalidate=False)
    assert "SELECT * FROM test_sets:()" in db.query_ram_cache, "test_sets cache should NOT have been cleared when invalidate=False!"
    print("   [PASSED] invalidate_cache=False correctly preserves entire query_ram_cache!")

    # 2. Setup a test record in community_translations
    print("\n[+] 2. Testing community_translations hit buffering...")
    test_word = "phase3_test_word"
    test_hash = "phase3_context_hash_xyz"

    # Insert test record into community_translations
    await db.async_execute(
        """
        INSERT INTO community_translations (word, context_hash, translated_text, hit_count)
        VALUES (?, ?, 'bản dịch thử nghiệm', 10)
        ON DUPLICATE KEY UPDATE hit_count = 10
        """,
        (test_word, test_hash),
        invalidate_cache=False,
    )
    record = await db.async_fetch_one(
        "SELECT id, hit_count FROM community_translations WHERE word = ? AND context_hash = ?",
        (test_word, test_hash),
        use_cache=False,
    )
    assert record is not None, "Test record was not found in DB!"
    record_id = record["id"]
    initial_hit_count = record["hit_count"]
    print(f"   Created test record id={record_id} with initial hit_count={initial_hit_count}")

    # Set dummy value in query_ram_cache to verify translation does not wipe it
    db.query_ram_cache["test_cache_protection_key"] = "safe"

    # Trigger read hit on Tier 3
    print("   Triggering read on community_translations...")
    found_record = await gemini_service._get_community_translation(test_word, test_hash)
    assert found_record is not None
    assert found_record["id"] == record_id

    # VERIFICATION A: query_ram_cache is NOT cleared!
    assert "test_cache_protection_key" in db.query_ram_cache, "CRITICAL ERROR: query_ram_cache was wiped during translation read!"
    print("   [PASSED] query_ram_cache was NOT cleared during translation read.")

    # VERIFICATION B: MySQL was NOT updated immediately!
    db_record_after_read = await db.async_fetch_one(
        "SELECT hit_count FROM community_translations WHERE id = ?",
        (record_id,),
        use_cache=False,
    )
    assert db_record_after_read["hit_count"] == initial_hit_count, (
        f"CRITICAL ERROR: MySQL was immediately written to! Expected {initial_hit_count}, got {db_record_after_read['hit_count']}"
    )
    print(f"   [PASSED] MySQL hit_count remains {initial_hit_count} immediately after read (Zero write amplification).")

    # VERIFICATION C: Buffered in Redis (or local buffer)
    redis_client = await gemini_service.get_redis()
    if redis_client:
        buffered_val = await redis_client.hget("hit_counts:community", str(record_id))
        assert buffered_val is not None and int(buffered_val) >= 1, f"Expected Redis buffer >= 1, got {buffered_val}"
        print(f"   [PASSED] Redis hash hit_counts:community has buffered increment = {buffered_val}")
    else:
        local_val = gemini_service._local_hit_counts.get("community", {}).get(record_id, 0)
        assert local_val >= 1, f"Expected local buffer >= 1, got {local_val}"
        print(f"   [PASSED] Local in-memory hit_counts buffer has increment = {local_val}")

    # 3. Test Flush Task
    print("\n[+] 3. Flushing buffered writes to MySQL...")
    await gemini_service.flush_all_buffered_writes()

    # VERIFICATION D: MySQL now has the updated hit_count (+1)
    db_record_after_flush = await db.async_fetch_one(
        "SELECT hit_count FROM community_translations WHERE id = ?",
        (record_id,),
        use_cache=False,
    )
    assert db_record_after_flush["hit_count"] == initial_hit_count + 1, (
        f"Expected {initial_hit_count + 1}, got {db_record_after_flush['hit_count']}"
    )
    print(f"   [PASSED] After flush, MySQL hit_count is properly updated to {db_record_after_flush['hit_count']}.")

    # VERIFICATION E: Redis key is now drained/cleared
    if redis_client:
        remaining = await redis_client.hget("hit_counts:community", str(record_id))
        assert remaining is None, f"Expected Redis buffer to be empty after flush, got {remaining}"
        print("   [PASSED] Redis buffer was atomically drained.")

    # 4. Clean up test record
    await db.async_execute(
        "DELETE FROM community_translations WHERE id = ?",
        (record_id,),
        invalidate_cache=False,
    )
    print("   Cleaned up test record.")

    # 5. Full REST API Endpoint verification with TestClient (Lifespan context)
    print("\n[+] 4. Verifying REST API endpoints with lifespan...")
    with TestClient(app) as client:
        res = client.post("/api/v1/translate", json={"text": "accommodate", "context": "toeic"})
        assert res.status_code == 200
        assert "translated_text" in res.json()

        res = client.post("/api/v1/translate/batch", json={"items": ["schedule", "proposal"]})
        assert res.status_code == 200
        assert res.json()["count"] == 2

        res = client.get("/api/v1/translate/cache-stats")
        assert res.status_code == 200
        print(f"   Stats: {res.json()['metrics']}")

    print("\n=======================================================")
    print("[+] ALL PHASE 3 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase3())
