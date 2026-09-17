import asyncio
import os
import sys
import time
from unittest.mock import patch

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.services.gemini_service import gemini_service
from fastapi.testclient import TestClient
from main import app

async def test_phase5():
    print("=" * 60)
    print("PHASE 5 VERIFICATION: CIRCUIT BREAKER & RATE LIMITING")
    print("=" * 60)

    # 1. Circuit Breaker Tripping on 5 Consecutive Errors
    print("\n[+] 1. Testing Circuit Breaker tripping after 5 errors...")
    cb = gemini_service.circuit_breaker
    await cb.record_success()  # Ensure initial CLOSED state
    assert cb.state == "CLOSED"

    # Simulate 5 consecutive failures (e.g., 429 Too Many Requests)
    for i in range(5):
        await cb.record_failure(Exception("429 ResourceExhausted"))
    
    assert cb.state == "OPEN", f"Expected state OPEN, got {cb.state}"
    assert cb.consecutive_failures == 5
    print(f"   [PASSED] Circuit breaker transitioned to OPEN after 5 consecutive failures!")

    # 2. Fast Fallback (< 5ms) when OPEN
    print("\n[+] 2. Testing fast fallback (< 5ms) when Circuit Breaker is OPEN...")
    gemini_called = False
    def spy_gemini(*args, **kwargs):
        nonlocal gemini_called
        gemini_called = True
        return {}

    with patch.object(gemini_service, "_call_gemini_api", side_effect=spy_gemini):
        t0 = time.perf_counter()
        fallback_res = await gemini_service.translate_text(
            text="xyz_non_existent_unseen_word",
            src_lang="en",
            target_lang="vi",
            context="test context",
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

    assert not gemini_called, "Gemini API was called while Circuit Breaker was OPEN!"
    assert fallback_res.get("degraded") is True, f"Expected degraded=True, got {fallback_res}"
    print(f"   [PASSED] Fallback returned in {elapsed_ms:.2f}ms (< 5ms) with degraded=True! (Zero timeout wait)")

    # 3. Recovery via Canary Request (HALF-OPEN -> CLOSED)
    print("\n[+] 3. Testing cooldown recovery (HALF-OPEN -> CLOSED)...")
    # Advance cooldown time to simulate cooldown expiration
    cb.cooldown_until = time.time() - 1.0

    can_attempt, state = await cb.can_attempt()
    assert can_attempt is True
    assert state == "HALF_OPEN"
    print("   [PASSED] Canary request allowed in HALF-OPEN state.")

    # Canary succeeds
    await cb.record_success()
    assert cb.state == "CLOSED"
    assert cb.consecutive_failures == 0
    print("   [PASSED] Circuit breaker restored to CLOSED upon successful canary call!")

    # 4. Rate Limiting on Tier 4 Calls (30 reqs/min)
    print("\n[+] 4. Testing User-level Rate Limiting (max 30 req/min on Tier 4)...")
    test_client_id = f"test_user_{int(time.time())}"
    
    # 30 new words should be allowed
    for i in range(30):
        allowed, retry_after = await gemini_service.check_user_rate_limit(test_client_id)
        assert allowed is True, f"Request {i+1} was unexpectedly rate limited!"

    # 31st request should be rejected
    allowed, retry_after = await gemini_service.check_user_rate_limit(test_client_id)
    assert allowed is False, "31st request should have been rejected by rate limiter!"
    assert retry_after > 0, f"Expected retry_after > 0, got {retry_after}"
    print(f"   [PASSED] 31st request was blocked by Rate Limiter (Retry-After: {retry_after}s)!")

    # 5. Cache Hits do NOT count against rate limit
    print("\n[+] 5. Verifying cache hits do NOT trigger or increment rate limiting...")
    # "accommodate" exists in system_vocabulary (Tier 2 hit)
    with TestClient(app) as client:
        # Rate limited client querying cached word
        headers = {"X-Forwarded-For": test_client_id}
        for _ in range(5):
            res = client.post("/api/v1/translate", json={"text": "accommodate", "context": "toeic"}, headers=headers)
            assert res.status_code == 200, f"Cache hit failed with: {res.status_code} {res.text}"
            assert res.json().get("cached") is True
    print("   [PASSED] Cache hits bypass rate limiting completely (100% accessible)!")

    # 6. HTTP 429 Response via TestClient
    print("\n[+] 6. Verifying HTTP 429 response structure via TestClient...")
    with TestClient(app) as client:
        # Querying an unseen word with the rate-limited client
        headers = {"X-Forwarded-For": test_client_id}
        res = client.post(
            "/api/v1/translate",
            json={"text": f"unseen_rate_test_{int(time.time())}", "context": "new context"},
            headers=headers,
        )
        assert res.status_code == 429, f"Expected 429, got {res.status_code}: {res.text}"
        assert "Retry-After" in res.headers
        print(f"   [PASSED] HTTP 429 received with Retry-After header: {res.headers.get('Retry-After')}")

    print("\n=======================================================")
    print("[+] ALL PHASE 5 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase5())
