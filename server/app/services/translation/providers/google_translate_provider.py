import asyncio
from typing import Optional

import httpx

from ..models import ProviderError, ProviderTranslationResult
from ..provider import ProviderCircuitBreaker, TranslationProvider


class GoogleTranslateProvider(TranslationProvider):
    name = "google"

    def __init__(
        self,
        api_key: str,
        timeout_ms: int,
        max_concurrency: int,
        circuit_breaker: Optional[ProviderCircuitBreaker] = None,
    ) -> None:
        self.api_key = api_key
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
                base_url="https://translation.googleapis.com",
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
            raise ProviderError("unavailable", "Google Translation API key is not configured")

        can_attempt, _ = await self.circuit_breaker.can_attempt()
        if not can_attempt:
            raise ProviderError("unavailable", "Google Translation circuit breaker is open")

        async with self.semaphore:
            for attempt in range(2):
                try:
                    response = await self._get_client().post(
                        "/language/translate/v2",
                        params={"key": self.api_key},
                        json={
                            "q": text,
                            "source": source_language,
                            "target": target_language,
                            "format": "text",
                        },
                    )
                except (httpx.TimeoutException, httpx.NetworkError) as exc:
                    error = ProviderError("network", "Google Translation request failed")
                    await self.circuit_breaker.record_error(error)
                    raise error from exc

                status = response.status_code
                if status == 200:
                    try:
                        payload = response.json()
                        translated_text = str(payload["data"]["translations"][0]["translatedText"]).strip()
                    except (KeyError, IndexError, TypeError, ValueError) as exc:
                        error = ProviderError("server", "Google Translation returned an invalid response", status_code=502)
                        await self.circuit_breaker.record_error(error)
                        raise error from exc
                    if not translated_text:
                        error = ProviderError("server", "Google Translation returned an empty translation", status_code=502)
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
                    raise ProviderError("bad_request", "Google Translation rejected the input", status_code=status)
                if status in (401, 403):
                    error = ProviderError("auth", "Google Translation authentication failed", status_code=status)
                elif status == 429:
                    error = ProviderError(
                        "rate_limited",
                        "Google Translation rate limit exceeded",
                        status_code=status,
                        retry_after=self._retry_after(response),
                    )
                elif 500 <= status < 600:
                    error = ProviderError("server", "Google Translation service error", status_code=status)
                    if attempt == 0:
                        continue
                else:
                    error = ProviderError("server", "Google Translation request failed", status_code=status)

                await self.circuit_breaker.record_error(error)
                raise error

        raise ProviderError("server", "Google Translation request failed")

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
