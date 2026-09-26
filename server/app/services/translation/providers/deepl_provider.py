import asyncio
from typing import Optional

import httpx

from ..models import ProviderError, ProviderTranslationResult
from ..provider import ProviderCircuitBreaker, TranslationProvider


class DeepLProvider(TranslationProvider):
    name = "deepl"

    def __init__(
        self,
        api_key: str,
        base_url: str,
        timeout_ms: int,
        max_concurrency: int,
        circuit_breaker: Optional[ProviderCircuitBreaker] = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = max(timeout_ms, 100) / 1000
        self.semaphore = asyncio.Semaphore(max(1, max_concurrency))
        self.circuit_breaker = circuit_breaker or ProviderCircuitBreaker()
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout_seconds),
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            )
        return self._client

    @staticmethod
    def _retry_after(response: httpx.Response) -> Optional[int]:
        value = response.headers.get("Retry-After")
        try:
            return max(1, int(value)) if value else None
        except ValueError:
            return None

    async def translate(self, text: str, source_language: str, target_language: str) -> ProviderTranslationResult:
        if not self.configured:
            raise ProviderError("unavailable", "DeepL API key is not configured")

        can_attempt, _ = await self.circuit_breaker.can_attempt()
        if not can_attempt:
            raise ProviderError("unavailable", "DeepL circuit breaker is open")

        async with self.semaphore:
            for attempt in range(2):
                try:
                    response = await self._get_client().post(
                        "/v2/translate",
                        headers={"Authorization": f"DeepL-Auth-Key {self.api_key}"},
                        data={
                            "text": text,
                            "source_lang": source_language.upper(),
                            "target_lang": target_language.upper(),
                        },
                    )
                except (httpx.TimeoutException, httpx.NetworkError) as exc:
                    error = ProviderError("network", "DeepL request failed")
                    await self.circuit_breaker.record_error(error)
                    raise error from exc

                status = response.status_code
                if status == 200:
                    try:
                        payload = response.json()
                        translation = payload["translations"][0]
                        translated_text = str(translation["text"]).strip()
                    except (KeyError, IndexError, TypeError, ValueError) as exc:
                        error = ProviderError("server", "DeepL returned an invalid response", status_code=502)
                        await self.circuit_breaker.record_error(error)
                        raise error from exc
                    if not translated_text:
                        error = ProviderError("server", "DeepL returned an empty translation", status_code=502)
                        await self.circuit_breaker.record_error(error)
                        raise error
                    await self.circuit_breaker.record_success()
                    return ProviderTranslationResult(
                        translated_text=translated_text,
                        source_language=source_language,
                        target_language=target_language,
                        provider=self.name,
                    )

                if status == 400:
                    raise ProviderError("bad_request", "DeepL rejected the translation input", status_code=status)
                if status in (401, 403):
                    error = ProviderError("auth", "DeepL authentication failed", status_code=status)
                elif status == 429:
                    error = ProviderError(
                        "rate_limited",
                        "DeepL rate limit exceeded",
                        status_code=status,
                        retry_after=self._retry_after(response),
                    )
                elif status == 456:
                    error = ProviderError("quota_exhausted", "DeepL monthly quota exhausted", status_code=status)
                elif 500 <= status < 600:
                    error = ProviderError("server", "DeepL service error", status_code=status)
                    if attempt == 0:
                        continue
                else:
                    error = ProviderError("server", "DeepL request failed", status_code=status)

                await self.circuit_breaker.record_error(error)
                raise error

        raise ProviderError("server", "DeepL request failed")

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
