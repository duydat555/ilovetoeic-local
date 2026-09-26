import os
import sys
import unittest

import httpx
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.translation.models import ProviderError, ProviderTranslationResult
from app.services.translation.provider import ProviderCircuitBreaker, TranslationProvider
from app.services.translation.providers.deepl_provider import DeepLProvider
from app.services.translation.providers.gemini_overflow_provider import GeminiOverflowProvider
from app.services.translation.providers.google_translate_provider import GoogleTranslateProvider
from app.services.translation.quota import RedisQuotaTracker
from app.services.translation.router import TranslationRouter


class FakePipeline:
    def __init__(self, redis):
        self.redis = redis
        self.operations = []

    def incrby(self, key, amount):
        self.operations.append(("incrby", key, amount))
        return self

    def expire(self, key, ttl):
        self.operations.append(("expire", key, ttl))
        return self

    async def execute(self):
        for operation, key, value in self.operations:
            if operation == "incrby":
                self.redis.values[key] = int(self.redis.values.get(key, 0)) + value
        return [True] * len(self.operations)


class FakeRedis:
    def __init__(self, values=None):
        self.values = values or {}

    async def get(self, key):
        return self.values.get(key)

    async def set(self, key, value, ex=None):
        self.values[key] = value
        return True

    def pipeline(self):
        return FakePipeline(self)


class FakeProvider(TranslationProvider):
    def __init__(self, name, result=None, error=None, configured=True):
        self.name = name
        self.result = result
        self.error = error
        self._configured = configured
        self.calls = 0

    @property
    def configured(self):
        return self._configured

    async def translate(self, text, source_language, target_language):
        self.calls += 1
        if self.error:
            raise self.error
        return self.result or ProviderTranslationResult(
            translated_text=f"{self.name}:{text}",
            source_language=source_language,
            target_language=target_language,
            provider=self.name,
        )

    async def close(self):
        return None


class TranslationRouterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.redis = FakeRedis()

        async def get_redis():
            return self.redis

        self.get_redis = get_redis

    def build_router(self, deepl, overflow, *, attempts=2):
        return TranslationRouter(
            self.get_redis,
            providers={"deepl": deepl, "gemini_overflow": overflow},
            budgets={"deepl": 10000, "gemini_overflow": 10000},
            max_attempts=attempts,
        )

    async def set_usage(self, provider, amount):
        key = RedisQuotaTracker._key(provider)
        self.redis.values[key] = amount

    async def test_deepl_gets_all_traffic_above_twenty_percent_remaining(self):
        await self.set_usage("deepl", 7900)
        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        for text_hash in ("healthy-a", "healthy-b", "healthy-c"):
            result = await router.translate(
                text=f"submit the proposal {text_hash}",
                source_language="en",
                target_language="vi",
                text_hash=text_hash,
            )
            self.assertEqual(result["provider"], "deepl")
        self.assertEqual(overflow.calls, 0)

    async def test_middle_band_uses_deterministic_eighty_twenty_split(self):
        await self.set_usage("deepl", 8000)
        selected = {"deepl": 0, "gemini_overflow": 0}
        for index in range(100):
            deepl = FakeProvider("deepl")
            overflow = FakeProvider("gemini_overflow")
            router = self.build_router(deepl, overflow)
            text_hash = f"bucket-{index}"
            first = list(router._provider_order(text_hash, {
                "deepl": await router.quota.get_status("deepl", 10000),
                "gemini_overflow": await router.quota.get_status("gemini_overflow", 10000),
            }))[0]
            selected[first] += 1
            self.assertEqual(first, router._middle_band_provider(text_hash))
        self.assertGreater(selected["deepl"], selected["gemini_overflow"])
        self.assertGreater(selected["gemini_overflow"], 0)

    async def test_below_five_percent_routes_to_overflow(self):
        await self.set_usage("deepl", 9600)
        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="critical-deepl-quota",
        )

        self.assertEqual(result["provider"], "gemini_overflow")
        self.assertEqual(overflow.calls, 1)
        self.assertEqual(deepl.calls, 0)

    async def test_falls_back_to_second_provider_and_limits_attempts(self):
        deepl = FakeProvider("deepl", error=ProviderError("network", "timeout"))
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="fallback-provider",
        )

        self.assertEqual(result["provider"], "gemini_overflow")
        self.assertEqual(deepl.calls + overflow.calls, 2)

    async def test_deepl_open_circuit_routes_to_overflow(self):
        deepl = FakeProvider("deepl")
        deepl.circuit_breaker = ProviderCircuitBreaker()
        deepl.circuit_breaker.state = "OPEN"
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="deepl-open",
        )

        self.assertEqual(result["provider"], "gemini_overflow")
        self.assertEqual(deepl.calls, 0)
        self.assertEqual(overflow.calls, 1)

    async def test_both_quotas_exhausted_returns_degraded(self):
        await self.set_usage("deepl", 10000)
        await self.set_usage("gemini_overflow", 10000)
        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="all-exhausted",
        )

        self.assertTrue(result["degraded"])
        self.assertEqual(deepl.calls + overflow.calls, 0)

    async def test_overflow_request_cannot_cross_monthly_budget(self):
        await self.set_usage("deepl", 10000)
        await self.set_usage("gemini_overflow", 9998)
        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="four chars",
            source_language="en",
            target_language="vi",
            text_hash="budget-boundary",
        )

        self.assertTrue(result["degraded"])
        self.assertEqual(overflow.calls, 0)
        self.assertEqual(router.stats["gemini_overflow"]["quota_rejections"], 1)

    async def test_bad_request_does_not_try_another_provider(self):
        deepl = FakeProvider("deepl", error=ProviderError("bad_request", "invalid", status_code=400))
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        result = await router.translate(
            text="bad input",
            source_language="en",
            target_language="vi",
            text_hash="bad-input",
        )

        self.assertEqual(result["status_code"], 400)
        self.assertEqual(deepl.calls, 1)
        self.assertEqual(overflow.calls, 0)

    async def test_redis_failure_fails_safe_to_gemini_fallback(self):
        async def broken_redis():
            raise ConnectionError("redis unavailable")

        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = TranslationRouter(
            broken_redis,
            providers={"deepl": deepl, "gemini_overflow": overflow},
            budgets={"deepl": 100, "gemini_overflow": 100},
            max_attempts=2,
        )

        result = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="redis-down",
        )

        self.assertTrue(result["degraded"])
        self.assertEqual(result["cache_source"], "translation_providers_degraded")
        self.assertEqual(deepl.calls + overflow.calls, 0)

    async def test_machine_result_uses_separate_cache_key(self):
        deepl = FakeProvider("deepl")
        overflow = FakeProvider("gemini_overflow")
        router = self.build_router(deepl, overflow)

        first = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="cache-hash",
        )
        second = await router.translate(
            text="submit the proposal",
            source_language="en",
            target_language="vi",
            text_hash="cache-hash",
        )

        self.assertEqual(first["cache_source"], "deepl_api")
        self.assertEqual(second["cache_source"], "machine_cache")
        self.assertIn("translate:machine:cache-hash", self.redis.values)
        self.assertEqual(deepl.calls, 1)


class DictionaryDetailDeepLTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.redis = FakeRedis()

        async def get_redis():
            return self.redis

        self.deepl = FakeProvider("deepl")
        self.overflow = FakeProvider("gemini_overflow")
        self.router = TranslationRouter(
            get_redis,
            providers={"deepl": self.deepl, "gemini_overflow": self.overflow},
            budgets={"deepl": 10000, "gemini_overflow": 10000},
        )

    async def test_enriches_all_detail_sections_with_deepl(self):
        cases = {
            "collocations": (
                {"items": [{"phrase": "submit a proposal", "meaningVi": "old"}]},
                lambda result: result["items"][0]["meaningVi"] == "deepl:submit a proposal",
            ),
            "examples": (
                {"items": [{"en": "Please submit the proposal.", "vi": "old"}]},
                lambda result: result["items"][0]["vi"] == "deepl:Please submit the proposal.",
            ),
            "synonyms": (
                {"items": ["proposal"]},
                lambda result: result["items"] == ["proposal"]
                and result["translated_items"][0]["meaningVi"] == "deepl:proposal",
            ),
            "wordFamily": (
                {"items": [{"word": "propose", "partOfSpeech": "verb", "phonetic": "/prəˈpoʊz/"}]},
                lambda result: result["items"][0]["meaningVi"] == "deepl:propose",
            ),
        }
        with patch("app.services.translation.router.config.TRANSLATION_MULTI_PROVIDER_ENABLED", True):
            for section, (detail, assertion) in cases.items():
                result = await self.router.enrich_dictionary_detail(section, detail)
                self.assertTrue(assertion(result), section)
                self.assertEqual(result["translation_provider"], "deepl")
        self.assertEqual(self.overflow.calls, 0)

    async def test_deepl_failure_keeps_original_detail_without_throwing(self):
        self.deepl.error = ProviderError("quota_exhausted", "quota", status_code=456)
        detail = {"items": [{"en": "Please submit the proposal.", "vi": "Vui lòng gửi đề xuất."}]}
        with patch("app.services.translation.router.config.TRANSLATION_MULTI_PROVIDER_ENABLED", True):
            result = await self.router.enrich_dictionary_detail("examples", detail)
        self.assertEqual(result["items"], detail["items"])
        self.assertEqual(result["translation_provider"], "source_fallback")
        self.assertEqual(self.overflow.calls, 0)

    async def test_kill_switch_off_does_not_call_deepl(self):
        detail = {"items": [{"phrase": "submit a proposal", "meaningVi": "gửi đề xuất"}]}
        with patch("app.services.translation.router.config.TRANSLATION_MULTI_PROVIDER_ENABLED", False):
            result = await self.router.enrich_dictionary_detail("collocations", detail)
        self.assertEqual(result, detail)
        self.assertEqual(self.deepl.calls, 0)


class GeminiIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_kill_switch_off_does_not_call_translation_router(self):
        from app.services.gemini_service import gemini_service

        original = gemini_service.translation_router
        fake_router = AsyncMock()
        fake_router.translate = AsyncMock(return_value={"translated_text": "unexpected"})
        gemini_service.translation_router = fake_router
        try:
            with (
                patch("app.services.gemini_service.config.TRANSLATION_MULTI_PROVIDER_ENABLED", False),
                patch.object(gemini_service, "_get_from_memory_cache", return_value=None),
                patch.object(gemini_service, "_get_from_redis_cache", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_lookup_system_vocabulary", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_community_translation", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_invalid_selection", AsyncMock(return_value=None)),
                patch.object(gemini_service.circuit_breaker, "can_attempt", AsyncMock(return_value=(False, "OPEN"))),
                patch.object(gemini_service, "_degraded_fallback", AsyncMock(return_value={"degraded": True})),
            ):
                await gemini_service.translate_text("submit the proposal", context="test")
            fake_router.translate.assert_not_awaited()
        finally:
            gemini_service.translation_router = original

    async def test_single_word_never_calls_translation_router(self):
        from app.services.gemini_service import gemini_service

        original = gemini_service.translation_router
        fake_router = AsyncMock()
        fake_router.translate = AsyncMock(return_value={"translated_text": "unexpected"})
        gemini_service.translation_router = fake_router
        try:
            with (
                patch("app.services.gemini_service.config.TRANSLATION_MULTI_PROVIDER_ENABLED", True),
                patch.object(gemini_service, "_get_from_memory_cache", return_value=None),
                patch.object(gemini_service, "_get_from_redis_cache", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_lookup_system_vocabulary", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_community_translation", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_invalid_selection", AsyncMock(return_value=None)),
                patch.object(gemini_service.circuit_breaker, "can_attempt", AsyncMock(return_value=(False, "OPEN"))),
                patch.object(gemini_service, "_degraded_fallback", AsyncMock(return_value={"degraded": True})),
            ):
                await gemini_service.translate_text("proposal", context="test")
            fake_router.translate.assert_not_awaited()
        finally:
            gemini_service.translation_router = original

    async def test_degraded_gateway_uses_local_fallback_without_dictionary_gemini(self):
        from app.services.gemini_service import gemini_service

        original = gemini_service.translation_router
        fake_router = AsyncMock()
        fake_router.translate = AsyncMock(return_value={
            "source_text": "submit the proposal",
            "degraded": True,
            "degraded_reason": "translation_capacity_exhausted",
        })
        gemini_service.translation_router = fake_router
        degraded = {"source_text": "submit the proposal", "degraded": True}
        try:
            with (
                patch("app.services.gemini_service.config.TRANSLATION_MULTI_PROVIDER_ENABLED", True),
                patch.object(gemini_service, "_get_from_memory_cache", return_value=None),
                patch.object(gemini_service, "_get_from_redis_cache", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_lookup_system_vocabulary", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_community_translation", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_invalid_selection", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_degraded_fallback", AsyncMock(return_value=degraded)) as fallback,
                patch.object(gemini_service, "execute_single_flight", AsyncMock()) as dictionary_gemini,
            ):
                result = await gemini_service.translate_text("submit the proposal", context="toeic")
            fallback.assert_awaited_once_with("submit the proposal")
            dictionary_gemini.assert_not_awaited()
            self.assertEqual(result["translation_provider"], "degraded")
        finally:
            gemini_service.translation_router = original

    async def test_phrase_calls_translation_router_with_existing_hash(self):
        from app.services.gemini_service import gemini_service

        original = gemini_service.translation_router
        expected = {
            "source_text": "submit the proposal",
            "translated_text": "gửi đề xuất",
            "cached": False,
            "cache_source": "deepl_api",
        }
        fake_router = AsyncMock()
        fake_router.translate = AsyncMock(return_value=expected)
        gemini_service.translation_router = fake_router
        try:
            with (
                patch("app.services.gemini_service.config.TRANSLATION_MULTI_PROVIDER_ENABLED", True),
                patch.object(gemini_service, "_get_from_memory_cache", return_value=None),
                patch.object(gemini_service, "_get_from_redis_cache", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_lookup_system_vocabulary", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_community_translation", AsyncMock(return_value=None)),
                patch.object(gemini_service, "_get_invalid_selection", AsyncMock(return_value=None)),
            ):
                result = await gemini_service.translate_text("submit the proposal", context="toeic")
            self.assertEqual(result, expected)
            expected_hash = gemini_service._compute_hash("submit the proposal", "en", "vi", "toeic")
            fake_router.translate.assert_awaited_once_with(
                text="submit the proposal",
                source_language="en",
                target_language="vi",
                text_hash=expected_hash,
            )
        finally:
            gemini_service.translation_router = original


class QuotaTrackerTests(unittest.IsolatedAsyncioTestCase):
    async def test_thresholds_and_increment(self):
        redis = FakeRedis()

        async def get_redis():
            return redis

        tracker = RedisQuotaTracker(get_redis)
        self.assertEqual((await tracker.get_status("deepl", 100)).level, "normal")
        await tracker.record_usage("deepl", 80)
        self.assertEqual((await tracker.get_status("deepl", 100)).level, "soft")
        await tracker.record_usage("deepl", 15)
        self.assertEqual((await tracker.get_status("deepl", 100)).level, "critical")

    async def test_unavailable_redis_is_critical(self):
        async def get_redis():
            return None

        status = await RedisQuotaTracker(get_redis).get_status("deepl", 100)
        self.assertFalse(status.tracker_available)
        self.assertEqual(status.level, "critical")
        self.assertFalse(status.routable)


class ProviderAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_deepl_456_does_not_retry(self):
        request_count = 0

        async def handler(request):
            nonlocal request_count
            request_count += 1
            return httpx.Response(456, request=request)

        provider = DeepLProvider("key", "https://api-free.deepl.com", 2500, 1)
        provider._client = httpx.AsyncClient(
            base_url="https://api-free.deepl.com",
            transport=httpx.MockTransport(handler),
        )
        with self.assertRaises(ProviderError) as raised:
            await provider.translate("submit the proposal", "en", "vi")
        self.assertEqual(raised.exception.kind, "quota_exhausted")
        self.assertEqual(request_count, 1)
        self.assertEqual(provider.circuit_breaker.state, "OPEN")
        await provider.close()

    async def test_deepl_retries_server_error_once(self):
        request_count = 0

        async def handler(request):
            nonlocal request_count
            request_count += 1
            if request_count == 1:
                return httpx.Response(503, request=request)
            return httpx.Response(
                200,
                request=request,
                json={"translations": [{"text": "gửi đề xuất"}]},
            )

        provider = DeepLProvider("key", "https://api-free.deepl.com", 2500, 1)
        provider._client = httpx.AsyncClient(
            base_url="https://api-free.deepl.com",
            transport=httpx.MockTransport(handler),
        )
        result = await provider.translate("submit the proposal", "en", "vi")
        self.assertEqual(result.translated_text, "gửi đề xuất")
        self.assertEqual(request_count, 2)
        await provider.close()

    async def test_google_retries_server_error_once(self):
        request_count = 0

        async def handler(request):
            nonlocal request_count
            request_count += 1
            if request_count == 1:
                return httpx.Response(500, request=request)
            return httpx.Response(
                200,
                request=request,
                json={"data": {"translations": [{"translatedText": "gửi đề xuất"}]}},
            )

        provider = GoogleTranslateProvider("key", 2500, 1)
        provider._client = httpx.AsyncClient(
            base_url="https://translation.googleapis.com",
            transport=httpx.MockTransport(handler),
        )
        result = await provider.translate("submit the proposal", "en", "vi")
        self.assertEqual(result.translated_text, "gửi đề xuất")
        self.assertEqual(request_count, 2)
        await provider.close()


class GeminiOverflowIsolationTests(unittest.IsolatedAsyncioTestCase):
    async def test_overflow_resources_are_independent_from_dictionary_gemini(self):
        from app.services.gemini_service import gemini_service

        provider = GeminiOverflowProvider("", "test-model", 2)
        self.assertIsNot(provider.semaphore, gemini_service.semaphore)
        self.assertIsNot(provider.circuit_breaker, gemini_service.circuit_breaker)
        self.assertIsNot(provider.client, gemini_service.client)

    async def test_overflow_failure_does_not_open_dictionary_circuit(self):
        from app.services.gemini_service import gemini_service

        dictionary_state = gemini_service.circuit_breaker.state
        overflow_breaker = ProviderCircuitBreaker(fail_threshold=1)
        await overflow_breaker.record_error(ProviderError("network", "timeout"))
        self.assertEqual(overflow_breaker.state, "OPEN")
        self.assertEqual(gemini_service.circuit_breaker.state, dictionary_state)

    async def test_overflow_quota_uses_dedicated_key(self):
        self.assertRegex(
            RedisQuotaTracker._key("gemini_overflow"),
            r"^translation:usage:gemini_overflow:\d{4}-\d{2}$",
        )


class ProviderCircuitBreakerTests(unittest.IsolatedAsyncioTestCase):
    async def test_timeout_failures_open_after_threshold(self):
        breaker = ProviderCircuitBreaker(fail_threshold=2, cooldown_seconds=30)
        await breaker.record_error(ProviderError("network", "timeout"))
        self.assertEqual(breaker.state, "CLOSED")
        await breaker.record_error(ProviderError("network", "timeout"))
        self.assertEqual(breaker.state, "OPEN")

    async def test_rate_limit_uses_retry_after(self):
        breaker = ProviderCircuitBreaker(cooldown_seconds=10)
        await breaker.record_error(ProviderError("rate_limited", "429", retry_after=60))
        self.assertEqual(breaker.state, "OPEN")
        self.assertEqual(breaker.block_reason, "rate_limited")
        self.assertGreater(breaker.cooldown_until, 0)
        self.assertGreaterEqual(breaker.cooldown_until, __import__("time").time() + 59)

    async def test_quota_and_auth_open_long_lived_circuit(self):
        for kind in ("quota_exhausted", "auth"):
            breaker = ProviderCircuitBreaker()
            await breaker.record_error(ProviderError(kind, kind))
            self.assertEqual(breaker.state, "OPEN")
            self.assertEqual(breaker.block_reason, kind)
            self.assertGreaterEqual(breaker.cooldown_until, __import__("time").time() + 86399)

    async def test_bad_request_does_not_trip_circuit(self):
        breaker = ProviderCircuitBreaker(fail_threshold=1)
        await breaker.record_error(ProviderError("bad_request", "400"))
        self.assertEqual(breaker.state, "CLOSED")


if __name__ == "__main__":
    unittest.main()
