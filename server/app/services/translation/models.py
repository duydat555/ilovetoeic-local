from dataclasses import dataclass
from typing import Literal, Optional


ProviderErrorKind = Literal[
    "bad_request",
    "rate_limited",
    "quota_exhausted",
    "auth",
    "server",
    "network",
    "unavailable",
]


@dataclass(frozen=True)
class ProviderTranslationResult:
    translated_text: str
    source_language: str
    target_language: str
    provider: str
    quality_tier: str = "machine_translation"
    is_enriched: bool = False


class ProviderError(Exception):
    def __init__(
        self,
        kind: ProviderErrorKind,
        message: str,
        *,
        status_code: Optional[int] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.kind = kind
        self.status_code = status_code
        self.retry_after = retry_after

    @property
    def terminal(self) -> bool:
        return self.kind == "bad_request"
