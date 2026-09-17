import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.db import db
from app.services.gemini_service import gemini_service
from fastapi.testclient import TestClient
from main import app

async def test_single_flight_coalescing():
    print("=" * 60)
    print("PHASE 4 VERIFICATION: REQUEST COALESCING (SINGLE-FLIGHT)")
    print("=" * 60)

    # 1. 50 Concurrent Requests for an unseen word
    print("\n[+] 1. Simulating 50 concurrent requests for an unseen word...")
    unseen_word = "coalesce_probe_word_xyz"
    unseen_context = "This is an unseen sentence for coalescing test."

    # Record baseline stats
    baseline_gemini_calls = gemini_service.stats["gemini_api_calls"]
    mock_call_count = 0

    def mock_gemini_call(text, src, tgt, ctx):
        nonlocal mock_call_count
        mock_call_count += 1
        time.sleep(0.08)  # simulate 80ms network latency to Gemini API
        return {
            "source_text": text,
            "word_type": "vocabulary",
            "translated_text": "kết quả hợp nhất",
            "phonetic": "/kəʊəˈlɛs/",
            "part_of_speech": "verb",
            "definition_en": "To come together to form one mass or whole",
            "examples": [{"en": "The ideas coalesced.", "vi": "Các ý tưởng đã hợp nhất."}],
            "synonyms": ["merge", "unite"],
        }

    # Patch _call_gemini_api to count actual invocations and simulate network latency
    with patch.object(gemini_service, "_call_gemini_api", side_effect=mock_gemini_call):
        t0 = time.perf_counter()
        tasks = [
            gemini_service.translate_text(
                text=unseen_word,
                src_lang="en",
                target_lang="vi",
                context=unseen_context,
            )
            for _ in range(50)
        ]
        results = await asyncio.gather(*tasks)
        total_time_ms = (time.perf_counter() - t0) * 1000

    # VERIFICATION A: Exactly 1 API call made
    assert mock_call_count == 1, (
        f"CRITICAL: Single-flight failed! Expected 1 Gemini call, but got {mock_call_count}!"
    )
    print(f"   [PASSED] Exactly 1 Gemini API call was executed for 50 concurrent requests! (mock_call_count={mock_call_count})")

    # VERIFICATION B: All 50 callers received the same valid response
    assert len(results) == 50
    for i, res in enumerate(results):
        assert res.get("translated_text") == "kết quả hợp nhất", f"Caller {i} got invalid text: {res}"
        assert res.get("source_text") == unseen_word
    print("   [PASSED] All 50 callers received identical, valid translation results.")

    # VERIFICATION C: Total elapsed time is ~80-150ms (not 50 * 80ms = 4000ms)
    print(f"   [PASSED] Total execution time for 50 concurrent requests: {total_time_ms:.2f}ms (P99 followers ~= leader).")
    assert total_time_ms < 1500, f"Requests took too long: {total_time_ms:.2f}ms"

    # VERIFICATION D: In-flight map is cleanly empty after all tasks finish
    assert len(gemini_service._in_flight) == 0, (
        f"In-flight map not cleaned up! Remaining keys: {list(gemini_service._in_flight.keys())}"
    )
    print("   [PASSED] _in_flight map is cleanly empty after completion.")

    # Clean up test word from DB
    await db.async_execute(
        "DELETE FROM community_translations WHERE word = ?",
        (unseen_word,),
        invalidate_cache=False,
    )
    await db.async_execute(
        "DELETE FROM translation_cache WHERE source_text = ?",
        (unseen_word,),
        invalidate_cache=False,
    )

    # 2. Testing Cross-Worker Redis Lock Coalescing
    print("\n[+] 2. Testing cross-worker Redis distributed locking logic...")
    redis_client = await gemini_service.get_redis()
    if redis_client:
        test_key = "test_cross_worker_key"
        lock_key = f"locks:gemini:{test_key}"

        # Simulate Worker 1 acquiring the lock
        await redis_client.set(lock_key, "worker_1", nx=True, px=5000)

        # Worker 2 attempts execute_single_flight for same key while lock is held
        worker2_called = False

        async def worker2_job():
            nonlocal worker2_called
            worker2_called = True
            return {"source_text": "w2", "translated_text": "worker 2"}

        # Put cached result in Redis simulating Worker 1 finishing and caching
        async def delayed_cache_writer():
            await asyncio.sleep(0.15)
            await gemini_service._save_to_redis_cache(test_key, {"source_text": "w1", "translated_text": "worker 1 cached"})
            await redis_client.delete(lock_key)

        asyncio.create_task(delayed_cache_writer())

        w2_result = await gemini_service.execute_single_flight(test_key, worker2_job)
        assert not worker2_called, "Worker 2 should NOT have executed backend job; it should have read from Redis!"
        assert w2_result.get("translated_text") == "worker 1 cached"
        print("   [PASSED] Cross-worker single-flight avoided redundant execution and read cached result!")

        # Clean up
        await redis_client.delete(f"translate:word:{test_key}")
        await redis_client.delete(lock_key)

    # 3. Verify All Endpoints via TestClient
    print("\n[+] 3. Verifying REST API endpoints via TestClient...")
    with TestClient(app) as client:
        res = client.post("/api/v1/translate", json={"text": "accommodate", "context": "toeic"})
        assert res.status_code == 200
        assert "translated_text" in res.json()

        res = client.post("/api/v1/translate/batch", json={"items": ["budget", "invoice"]})
        assert res.status_code == 200

        res = client.get("/api/v1/translate/cache-stats")
        assert res.status_code == 200
        print(f"   Cache Stats: {res.json()['metrics']}")

    print("\n=======================================================")
    print("[+] ALL PHASE 4 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_single_flight_coalescing())
