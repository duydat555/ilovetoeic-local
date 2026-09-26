import asyncio
from typing import Optional

from pydantic import BaseModel, Field

from app import config

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

from ..models import ProviderError, ProviderTranslationResult
from ..provider import ProviderCircuitBreaker, TranslationProvider


class GeminiTranslationResult(BaseModel):
    translated_text: str = Field(description="Concise translation of the source text")


class GeminiOverflowProvider(TranslationProvider):
    name = "gemini_overflow"

    def __init__(
        self,
        api_key: str,
        model: str,
        max_concurrency: int,
        circuit_breaker: Optional[ProviderCircuitBreaker] = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.semaphore = asyncio.Semaphore(max(1, max_concurrency))
        self.circuit_breaker = circuit_breaker or ProviderCircuitBreaker()
        self.client = genai.Client(api_key=api_key) if genai and api_key else None

    @property
    def configured(self) -> bool:
        return self.client is not None and types is not None

    async def translate(self, text: str, source_language: str, target_language: str) -> ProviderTranslationResult:
        if not self.configured:
            raise ProviderError("unavailable", "Gemini translation overflow is not configured")

        can_attempt, _ = await self.circuit_breaker.can_attempt()
        if not can_attempt:
            raise ProviderError("unavailable", "Gemini translation overflow circuit breaker is open")

        async with self.semaphore:
            try:
                translated_text = await asyncio.to_thread(
                    self._call_api,
                    text,
                    source_language,
                    target_language,
                )
            except Exception as exc:
                error = self._classify_error(exc)
                await self.circuit_breaker.record_error(error)
                raise error from exc

        await self.circuit_breaker.record_success()
        return ProviderTranslationResult(
            translated_text=translated_text,
            source_language=source_language,
            target_language=target_language,
            provider=self.name,
        )

    def _call_api(self, text: str, source_language: str, target_language: str) -> str:
        if types is None or self.client is None:
            raise RuntimeError("google-genai is not installed or configured")
        prompt = (
            f"Translate the following {source_language} text into {target_language}. "
            "Return only a concise, natural translation without notes or dictionary analysis.\n\n"
            f"Text: {text}"
        )
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=GeminiTranslationResult,
                thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                max_output_tokens=512,
            ),
        )
        if response.parsed:
            parsed = response.parsed
            result = parsed if isinstance(parsed, GeminiTranslationResult) else GeminiTranslationResult.model_validate(parsed)
        else:
            result = GeminiTranslationResult.model_validate_json(response.text)
        translated = result.translated_text.strip()
        if not translated:
            raise ValueError("Gemini translation overflow returned an empty translation")
        return translated

    @staticmethod
    def _classify_error(error: Exception) -> ProviderError:
        status = (
            getattr(error, "code", None)
            or getattr(error, "status_code", None)
            or getattr(getattr(error, "response", None), "status_code", None)
        )
        message = str(error).lower()
        if status == 400:
            return ProviderError("bad_request", "Gemini rejected the translation input", status_code=400)
        if status in (401, 403) or "permission_denied" in message or "api key" in message:
            return ProviderError("auth", "Gemini translation authentication failed", status_code=status)
        if status == 429 or "resource_exhausted" in message or "quota" in message:
            return ProviderError("rate_limited", "Gemini translation rate limit exceeded", status_code=429)
        if status and 500 <= int(status) < 600:
            return ProviderError("server", "Gemini translation service error", status_code=int(status))
        if "timeout" in message or "timed out" in message or "connection" in message:
            return ProviderError("network", "Gemini translation request failed")
        return ProviderError("server", "Gemini translation request failed", status_code=status)

    async def close(self) -> None:
        # google-genai's synchronous client does not require async shutdown.
        return None
