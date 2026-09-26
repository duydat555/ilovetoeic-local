import hashlib
import json
import logging
import time
from typing import Any, Dict, Iterable, Optional

from app import config

from .models import ProviderError, ProviderTranslationResult
from .normalization import normalize_provider_result
from .providers import DeepLProvider, GeminiOverflowProvider
from .provider import TranslationProvider
from .quota import QuotaStatus, RedisQuotaTracker

logger = logging.getLogger("translation_router")

DEEPL_PROVIDER = "deepl"
GEMINI_OVERFLOW_PROVIDER = "gemini_overflow"


class TranslationRouter:
    def __init__(
        self,
        redis_getter,
        *,
        providers: Optional[Dict[str, TranslationProvider]] = None,
        budgets: Optional[Dict[str, int]] = None,
        max_attempts: Optional[int] = None,
    ) -> None:
        self.redis_getter = redis_getter
        self.quota = RedisQuotaTracker(redis_getter)
        timeout_ms = config.TRANSLATION_PROVIDER_TIMEOUT_MS
        self.providers = providers or {
            DEEPL_PROVIDER: DeepLProvider(
                api_key=config.DEEPL_API_KEY,
                base_url=config.DEEPL_API_BASE_URL,
                timeout_ms=timeout_ms,
                max_concurrency=config.MAX_DEEPL_CONCURRENCY,
            ),
            GEMINI_OVERFLOW_PROVIDER: GeminiOverflowProvider(
                api_key=config.GEMINI_API_KEY,
                model=config.GEMINI_MODEL,
                max_concurrency=config.GEMINI_TRANSLATION_MAX_CONCURRENCY,
            ),
        }
        self.budgets = budgets or {
            DEEPL_PROVIDER: config.DEEPL_MONTHLY_CHAR_BUDGET,
            GEMINI_OVERFLOW_PROVIDER: config.GEMINI_TRANSLATION_MONTHLY_CHAR_BUDGET,
        }
        configured_attempts = max_attempts if max_attempts is not None else config.TRANSLATION_MAX_PROVIDER_ATTEMPTS
        self.max_attempts = max(1, min(configured_attempts, 2))
        self.stats: Dict[str, Dict[str, float]] = {
            name: {
                "requests": 0,
                "successes": 0,
                "errors": 0,
                "quota_rejections": 0,
                "circuit_rejections": 0,
                "characters": 0,
                "latency_ms_total": 0.0,
            }
            for name in (DEEPL_PROVIDER, GEMINI_OVERFLOW_PROVIDER)
        }
        self.stats["degraded"] = {"requests": 0}

    @staticmethod
    def _machine_cache_key(text_hash: str) -> str:
        return f"translate:machine:{text_hash}"

    async def _get_cached(self, text_hash: str, source_text: str) -> Optional[Dict[str, Any]]:
        try:
            redis_client = await self.redis_getter()
            if not redis_client:
                return None
            raw = await redis_client.get(self._machine_cache_key(text_hash))
            if not raw:
                return None
            payload = json.loads(raw)
            result = ProviderTranslationResult(
                translated_text=payload["translated_text"],
                source_language=payload.get("source_language", "en"),
                target_language=payload.get("target_language", "vi"),
                provider=payload.get("provider", "machine"),
                quality_tier=payload.get("quality_tier", "machine_translation"),
                is_enriched=bool(payload.get("is_enriched", False)),
            )
            return normalize_provider_result(result, source_text, cached=True)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None
        except Exception:
            return None

    async def _save_cached(self, text_hash: str, result: ProviderTranslationResult) -> bool:
        try:
            redis_client = await self.redis_getter()
            if not redis_client:
                return False
            payload = {
                "translated_text": result.translated_text,
                "source_language": result.source_language,
                "target_language": result.target_language,
                "provider": result.provider,
                "quality_tier": result.quality_tier,
                "is_enriched": result.is_enriched,
            }
            await redis_client.set(
                self._machine_cache_key(text_hash),
                json.dumps(payload, ensure_ascii=False),
                ex=config.TRANSLATION_MACHINE_CACHE_TTL_SECONDS,
            )
            return True
        except Exception:
            return False

    @staticmethod
    def _middle_band_provider(text_hash: str) -> str:
        bucket = int(hashlib.sha256(text_hash.encode("utf-8")).hexdigest()[:8], 16) % 100
        return DEEPL_PROVIDER if bucket < 80 else GEMINI_OVERFLOW_PROVIDER

    @staticmethod
    def _circuit_open(provider: TranslationProvider) -> bool:
        breaker = getattr(provider, "circuit_breaker", None)
        return bool(breaker and breaker.state == "OPEN")

    def _provider_order(self, text_hash: str, statuses: Dict[str, QuotaStatus]) -> Iterable[str]:
        deepl = self.providers.get(DEEPL_PROVIDER)
        overflow = self.providers.get(GEMINI_OVERFLOW_PROVIDER)
        deepl_status = statuses[DEEPL_PROVIDER]
        overflow_status = statuses[GEMINI_OVERFLOW_PROVIDER]

        deepl_available = bool(
            deepl
            and deepl.configured
            and deepl_status.tracker_available
            and deepl_status.remaining_ratio > 0
            and not self._circuit_open(deepl)
        )
        overflow_available = bool(
            overflow
            and overflow.configured
            and overflow_status.tracker_available
            and overflow_status.remaining_ratio > 0
            and not self._circuit_open(overflow)
        )

        if not deepl_available:
            return [GEMINI_OVERFLOW_PROVIDER] if overflow_available else []

        remaining = deepl_status.remaining_ratio
        if remaining > 0.20:
            return [DEEPL_PROVIDER, GEMINI_OVERFLOW_PROVIDER] if overflow_available else [DEEPL_PROVIDER]
        if remaining >= 0.05:
            selected = self._middle_band_provider(text_hash)
            if selected == GEMINI_OVERFLOW_PROVIDER and overflow_available:
                return [GEMINI_OVERFLOW_PROVIDER, DEEPL_PROVIDER]
            return [DEEPL_PROVIDER, GEMINI_OVERFLOW_PROVIDER] if overflow_available else [DEEPL_PROVIDER]
        return [GEMINI_OVERFLOW_PROVIDER] if overflow_available else []

    def _degraded_result(self, text: str, reason: str) -> Dict[str, Any]:
        self.stats["degraded"]["requests"] += 1
        return {
            "source_text": text,
            "degraded": True,
            "degraded_reason": reason,
            "cached": False,
            "cache_source": "translation_providers_degraded",
        }

    async def translate(
        self,
        *,
        text: str,
        source_language: str,
        target_language: str,
        text_hash: str,
    ) -> Dict[str, Any]:
        cached = await self._get_cached(text_hash, text)
        if cached:
            return cached

        statuses = {
            name: await self.quota.get_status(name, self.budgets.get(name, 0))
            for name in (DEEPL_PROVIDER, GEMINI_OVERFLOW_PROVIDER)
        }
        provider_order = list(self._provider_order(text_hash, statuses))
        if not provider_order:
            for name, status in statuses.items():
                if not status.tracker_available or status.remaining_ratio <= 0:
                    self.stats[name]["quota_rejections"] += 1
                elif self._circuit_open(self.providers[name]):
                    self.stats[name]["circuit_rejections"] += 1
            return self._degraded_result(text, "translation_capacity_exhausted")

        attempts = 0
        last_reason = "all_translation_providers_failed"
        for provider_name in provider_order:
            if attempts >= self.max_attempts:
                break
            if statuses[provider_name].used + len(text) > statuses[provider_name].budget:
                self.stats[provider_name]["quota_rejections"] += 1
                last_reason = f"{provider_name}_quota_exhausted"
                continue
            attempts += 1
            provider = self.providers[provider_name]
            self.stats[provider_name]["requests"] += 1
            started = time.perf_counter()
            try:
                result = await provider.translate(text, source_language, target_language)
            except ProviderError as error:
                self.stats[provider_name]["errors"] += 1
                self.stats[provider_name]["latency_ms_total"] += (time.perf_counter() - started) * 1000
                last_reason = f"{provider_name}_{error.kind}"
                if error.kind in ("auth", "quota_exhausted"):
                    logger.warning("Translation provider %s unavailable: %s", provider_name, error.kind)
                if error.terminal:
                    return {
                        "source_text": text,
                        "error": str(error),
                        "status_code": error.status_code or 400,
                        "cached": False,
                        "cache_source": f"{provider_name}_input_error",
                    }
                continue

            self.stats[provider_name]["successes"] += 1
            self.stats[provider_name]["characters"] += len(text)
            self.stats[provider_name]["latency_ms_total"] += (time.perf_counter() - started) * 1000
            usage_recorded = await self.quota.record_usage(provider_name, len(text))
            if not usage_recorded:
                logger.warning("Could not record %s translation usage in Redis", provider_name)
            await self._save_cached(text_hash, result)
            return normalize_provider_result(result, text)

        return self._degraded_result(text, last_reason)

    async def enrich_dictionary_detail(
        self,
        section: str,
        detail: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Translate generated dictionary-detail text with DeepL only.

        DeepL translates existing English content; it never generates dictionary
        structure. On any quota/provider failure, the original bilingual content
        remains usable and no exception escapes to the API.
        """
        if not getattr(config, "TRANSLATION_MULTI_PROVIDER_ENABLED", False):
            return detail

        provider = self.providers.get(DEEPL_PROVIDER)
        if not provider or not provider.configured or self._circuit_open(provider):
            return {**detail, "translation_provider": "source_fallback"}

        items = detail.get("items")
        if not isinstance(items, list) or not items:
            return detail

        source_texts: list[str] = []
        if section == "collocations":
            source_texts = [str(item.get("phrase", "")).strip() for item in items if isinstance(item, dict)]
        elif section == "examples":
            source_texts = [str(item.get("en", "")).strip() for item in items if isinstance(item, dict)]
        elif section == "synonyms":
            source_texts = [
                str(item.get("word", "") if isinstance(item, dict) else item).strip()
                for item in items
            ]
        elif section == "wordFamily":
            source_texts = [str(item.get("word", "")).strip() for item in items if isinstance(item, dict)]

        unique_texts = list(dict.fromkeys(text for text in source_texts if text))
        if not unique_texts:
            return detail

        status = await self.quota.get_status(DEEPL_PROVIDER, self.budgets.get(DEEPL_PROVIDER, 0))
        total_characters = sum(len(text) for text in unique_texts)
        if (
            not status.tracker_available
            or status.used + total_characters > status.budget
        ):
            self.stats[DEEPL_PROVIDER]["quota_rejections"] += 1
            return {**detail, "translation_provider": "source_fallback"}

        translations: Dict[str, str] = {}
        for source in unique_texts:
            started = time.perf_counter()
            self.stats[DEEPL_PROVIDER]["requests"] += 1
            try:
                translated = await provider.translate(source, "en", "vi")
            except ProviderError as error:
                self.stats[DEEPL_PROVIDER]["errors"] += 1
                self.stats[DEEPL_PROVIDER]["latency_ms_total"] += (
                    time.perf_counter() - started
                ) * 1000
                if error.kind in ("auth", "quota_exhausted"):
                    logger.warning("DeepL dictionary-detail translation unavailable: %s", error.kind)
                break
            self.stats[DEEPL_PROVIDER]["successes"] += 1
            self.stats[DEEPL_PROVIDER]["characters"] += len(source)
            self.stats[DEEPL_PROVIDER]["latency_ms_total"] += (
                time.perf_counter() - started
            ) * 1000
            translations[source] = translated.translated_text
            if not await self.quota.record_usage(DEEPL_PROVIDER, len(source)):
                logger.warning("Could not record DeepL dictionary-detail usage in Redis")
                break

        if not translations:
            return {**detail, "translation_provider": "source_fallback"}

        enriched_items = []
        translated_items = []
        for item in items:
            if section == "collocations" and isinstance(item, dict):
                enriched = dict(item)
                phrase = str(enriched.get("phrase", "")).strip()
                enriched["meaningVi"] = translations.get(phrase, enriched.get("meaningVi", ""))
                enriched_items.append(enriched)
            elif section == "examples" and isinstance(item, dict):
                enriched = dict(item)
                english = str(enriched.get("en", "")).strip()
                enriched["vi"] = translations.get(english, enriched.get("vi", ""))
                enriched_items.append(enriched)
            elif section == "synonyms":
                word = str(item.get("word", "") if isinstance(item, dict) else item).strip()
                enriched_items.append(item)
                translated_items.append({"word": word, "meaningVi": translations.get(word, "")})
            elif section == "wordFamily" and isinstance(item, dict):
                enriched = dict(item)
                word = str(enriched.get("word", "")).strip()
                enriched["meaningVi"] = translations.get(word, enriched.get("meaningVi", ""))
                enriched_items.append(enriched)
            else:
                enriched_items.append(item)

        enriched_detail = {
            **detail,
            "items": enriched_items,
            "translation_provider": "deepl" if len(translations) == len(unique_texts) else "deepl_partial",
        }
        if section == "synonyms":
            # Keep legacy string items for existing clients while exposing translations additively.
            enriched_detail["translated_items"] = translated_items
        return enriched_detail

    def get_telemetry(self) -> Dict[str, Any]:
        providers: Dict[str, Any] = {}
        for name in (DEEPL_PROVIDER, GEMINI_OVERFLOW_PROVIDER):
            data = dict(self.stats[name])
            requests = int(data["requests"])
            data["average_latency_ms"] = round(data.pop("latency_ms_total") / requests, 2) if requests else 0.0
            breaker = getattr(self.providers.get(name), "circuit_breaker", None)
            data["circuit_breaker"] = {
                "state": breaker.state if breaker else "UNAVAILABLE",
                "consecutive_failures": breaker.consecutive_failures if breaker else 0,
                "cooldown_until": breaker.cooldown_until if breaker else 0,
            }
            data["monthly_character_budget"] = self.budgets.get(name, 0)
            providers[name] = data
        providers["degraded"] = dict(self.stats["degraded"])
        return providers

    async def close(self) -> None:
        for provider in self.providers.values():
            await provider.close()
