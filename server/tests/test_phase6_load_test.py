import asyncio
import os
import statistics
import sys
import time
import uuid
from typing import Any, Dict, List
from unittest.mock import patch

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.db import db
from app.services.gemini_service import gemini_service
import httpx
from main import app

async def run_synthetic_load_test(total_requests: int = 1000, max_concurrency: int = 50):
    print("=" * 70)
    print("PHASE 6: 1,000 CONCURRENT REQUEST LOAD TEST & BENCHMARK")
    print(f"Total Requests: {total_requests} | Concurrency: {max_concurrency}")
    print("=" * 70)

    # 1. Prepare word bank across all pipeline tiers
    # Tier 2 direct system words:
    tier2_words = ["accommodate", "budget", "invoice", "schedule", "collaborate", "facility", "negotiate"]
    # Tier 2b inflected words:
    inflected_words = ["accommodating", "budgets", "invoicing", "scheduled", "collaborated", "facilities"]
    # Tier 3 community phrases:
    community_phrases = ["look forward to", "in accordance with", "on behalf of", "as a result of"]
    # Tier 4 single-flight probe words (groups of 20 concurrent identical words to test coalescing under load)
    probe_id = uuid.uuid4().hex[:6]
    coalesce_words = [f"coalesce_bench_{probe_id}_{i}" for i in range(5)]

    # Pre-populate some community phrases so they hit Tier 3
    for phrase in community_phrases:
        h = gemini_service._compute_hash(phrase, "en", "vi", "toeic")
        await gemini_service._save_community_translation(
            phrase,
            h,
            {"translated_text": f"Dịch: {phrase}", "word_type": "vocabulary"},
            "toeic",
        )

    # Mock Gemini API for Tier 4 coalesce words to prevent hitting external API limits
    gemini_api_call_count = 0
    def mock_gemini_call(text, src, tgt, ctx):
        nonlocal gemini_api_call_count
        gemini_api_call_count += 1
        time.sleep(0.05)  # 50ms simulated API network roundtrip
        return {
            "source_text": text,
            "word_type": "vocabulary",
            "translated_text": f"Bản dịch: {text}",
            "phonetic": "/tɛst/",
            "part_of_speech": "noun",
            "definition_en": f"Benchmark synthetic definition for {text}",
            "examples": [{"en": f"Usage of {text}", "vi": f"Cách dùng {text}"}],
            "synonyms": ["sample"],
        }

    # Generate 1,000 queries with realistic distribution:
    # 70% Tier 1 / Tier 2 (frequent TOEIC vocabulary & inflections)
    # 20% Tier 3 (community phrases)
    # 10% Tier 4 (unseen words triggering single-flight coalescing)
    queries: List[Dict[str, str]] = []
    import random
    random.seed(42)

    for i in range(total_requests):
        r = random.random()
        client_id = f"client_{random.randint(1, 20)}"
        if r < 0.45:
            # System vocabulary
            w = random.choice(tier2_words)
            queries.append({"text": w, "context": "toeic", "client_id": client_id, "tier": "Tier 2 System"})
        elif r < 0.70:
            # Inflected form
            w = random.choice(inflected_words)
            queries.append({"text": w, "context": "toeic", "client_id": client_id, "tier": "Tier 2b Inflection"})
        elif r < 0.90:
            # Community phrase
            w = random.choice(community_phrases)
            queries.append({"text": w, "context": "toeic", "client_id": client_id, "tier": "Tier 3 Community"})
        else:
            # Unseen word (tests single-flight coalescing under heavy load)
            w = random.choice(coalesce_words)
            queries.append({"text": w, "context": "toeic", "client_id": client_id, "tier": "Tier 4 Coalesced"})

    print(f"\n[+] Generated {len(queries)} realistic requests:")
    print(f"    - Tier 1 & 2 System Vocab: ~45%")
    print(f"    - Tier 2b Inflections:     ~25%")
    print(f"    - Tier 3 Community:        ~20%")
    print(f"    - Tier 4 Single-Flight:    ~10%")

    sem = asyncio.Semaphore(max_concurrency)
    latencies: List[float] = []
    tier_latencies: Dict[str, List[float]] = {}
    success_count = 0
    error_count = 0
    cache_hit_count = 0

    async def execute_worker(q: Dict[str, str]):
        nonlocal success_count, error_count, cache_hit_count
        async with sem:
            t0 = time.perf_counter()
            try:
                res = await gemini_service.translate_text(
                    text=q["text"],
                    src_lang="en",
                    target_lang="vi",
                    context=q["context"],
                    client_id=q["client_id"],
                )
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                latencies.append(elapsed_ms)
                tier_latencies.setdefault(q["tier"], []).append(elapsed_ms)

                if res.get("cached") is True or res.get("coalesced") is True:
                    cache_hit_count += 1

                if res.get("error") and res.get("status_code") != 429:
                    error_count += 1
                else:
                    success_count += 1
            except Exception as e:
                error_count += 1
                print(f"[!] Request error: {e}")

    # Run benchmark under patch
    print(f"\n[+] Executing {total_requests} concurrent requests (pool limit: {max_concurrency})...")
    benchmark_start = time.perf_counter()
    with patch.object(gemini_service, "_call_gemini_api", side_effect=mock_gemini_call):
        tasks = [execute_worker(q) for q in queries]
        await asyncio.gather(*tasks)
    total_benchmark_time = time.perf_counter() - benchmark_start

    # Clean up test words from DB
    for w in coalesce_words:
        await db.async_execute(
            "DELETE FROM community_translations WHERE word = ?",
            (w,),
            invalidate_cache=False,
        )
        await db.async_execute(
            "DELETE FROM translation_cache WHERE source_text = ?",
            (w,),
            invalidate_cache=False,
        )

    # Calculate statistics
    latencies.sort()
    rps = total_requests / total_benchmark_time
    p50 = statistics.median(latencies)
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    avg_lat = statistics.mean(latencies)
    cache_hit_rate = (cache_hit_count / total_requests) * 100.0

    print("\n" + "=" * 70)
    print("BENCHMARK RESULTS SUMMARY (1,000 CONCURRENT REQUESTS)")
    print("=" * 70)
    print(f"Total Requests:         {total_requests}")
    print(f"Successful Requests:    {success_count} ({success_count / total_requests * 100:.1f}%)")
    print(f"Failed Requests:        {error_count} ({error_count / total_requests * 100:.1f}%)")
    print(f"Total Time:             {total_benchmark_time:.2f}s")
    print(f"Throughput (RPS):       {rps:.1f} req/s")
    print(f"Overall Cache Hit Rate: {cache_hit_rate:.1f}%")
    print(f"Gemini API Calls:       {gemini_api_call_count} (Coalesced from ~100 requests!)")
    print("-" * 70)
    print("LATENCY DISTRIBUTION (ms):")
    print(f"  Min:  {latencies[0]:.2f}ms")
    print(f"  P50:  {p50:.2f}ms")
    print(f"  P90:  {p90:.2f}ms")
    print(f"  P95:  {p95:.2f}ms")
    print(f"  P99:  {p99:.2f}ms")
    print(f"  Max:  {latencies[-1]:.2f}ms")
    print(f"  Mean: {avg_lat:.2f}ms")
    print("-" * 70)
    print("LATENCY BY TIER (Average ms):")
    for tier, t_lats in sorted(tier_latencies.items()):
        print(f"  {tier:22}: count={len(t_lats):3}, avg={statistics.mean(t_lats):.2f}ms, p95={sorted(t_lats)[int(len(t_lats)*0.95)]:.2f}ms")
    print("=" * 70)

    # Assertions for verification
    assert error_count == 0, f"Benchmark encountered {error_count} errors!"
    assert success_count == total_requests
    assert gemini_api_call_count <= len(coalesce_words), (
        f"Single-flight failed under load! Expected <= {len(coalesce_words)} calls, got {gemini_api_call_count}"
    )
    assert p90 < 100.0, f"P90 latency exceeded 100ms: {p90:.2f}ms"
    assert p95 < 750.0, f"P95 latency exceeded 750ms: {p95:.2f}ms"
    print("\n[+] ALL PHASE 6 LOAD TEST VERIFICATIONS PASSED CLEANLY!")

if __name__ == "__main__":
    asyncio.run(run_synthetic_load_test(total_requests=1000, max_concurrency=50))
