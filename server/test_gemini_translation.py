import asyncio
import time
from app.services.gemini_service import gemini_service

async def test_translation():
    print("=" * 60)
    print("TESTING GEMINI TRANSLATION SERVICE ON TERMUX SERVER")
    print("=" * 60)

    test_words = ["accommodate", "schedule", "budget", "accommodate", "proposal", "accommodate"]

    print("\n--- 1. Single Translation & Cache Test ---")
    for i, word in enumerate(test_words):
        start = time.time()
        res = await gemini_service.translate_text(word)
        elapsed = (time.time() - start) * 1000
        print(f"Request {i+1} [{word}]: {elapsed:.2f}ms | Cache: {res.get('cached')} ({res.get('cache_source')}) | Trans: {res.get('translated_text')}")


    print("\n--- 2. Cache Statistics ---")
    stats = gemini_service.get_cache_stats()
    print(stats)

if __name__ == "__main__":
    asyncio.run(test_translation())
