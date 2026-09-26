import asyncio
import time
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from .models import ProviderError, ProviderTranslationResult


class ProviderCircuitBreaker:
    def __init__(self, fail_threshold: int = 5, cooldown_seconds: int = 30) -> None:
        self.fail_threshold = fail_threshold
        self.cooldown_seconds = cooldown_seconds
        self.state = "CLOSED"
        self.consecutive_failures = 0
        self.cooldown_until = 0.0
        self.canary_in_flight = False
        self.block_reason: Optional[str] = None
        self._lock = asyncio.Lock()

    async def can_attempt(self) -> Tuple[bool, str]:
        async with self._lock:
            now = time.time()
            if self.state == "CLOSED":
                return True, self.state
            if self.state == "OPEN":
                if now < self.cooldown_until:
                    return False, self.state
                self.state = "HALF_OPEN"
                self.canary_in_flight = True
                return True, self.state
            if not self.canary_in_flight:
                self.canary_in_flight = True
                return True, self.state
            return False, self.state

    async def record_success(self) -> None:
        async with self._lock:
            self.state = "CLOSED"
            self.consecutive_failures = 0
            self.cooldown_until = 0.0
            self.canary_in_flight = False
            self.block_reason = None

    async def record_error(self, error: ProviderError) -> None:
        if error.kind == "bad_request":
            return

        async with self._lock:
            self.canary_in_flight = False
            self.consecutive_failures += 1
            cooldown = self.cooldown_seconds

            if error.kind == "rate_limited":
                cooldown = max(cooldown, error.retry_after or cooldown)
            elif error.kind in ("quota_exhausted", "auth"):
                cooldown = 24 * 60 * 60

            should_open = (
                error.kind in ("rate_limited", "quota_exhausted", "auth")
                or self.state == "HALF_OPEN"
                or self.consecutive_failures >= self.fail_threshold
            )
            if should_open:
                self.state = "OPEN"
                self.cooldown_until = time.time() + cooldown
                self.block_reason = error.kind


class TranslationProvider(ABC):
    name: str

    @property
    @abstractmethod
    def configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> ProviderTranslationResult:
        raise NotImplementedError

    @abstractmethod
    async def close(self) -> None:
        raise NotImplementedError
