"""Interfaces every AI capability sits behind.

Voice code only talks to these, so Mac (MLX/Metal) and Windows (CUDA/CPU)
backends are interchangeable via the profile config.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Dict, List, Optional

# Audio contract used end to end.
INPUT_SAMPLE_RATE = 16000   # mic -> server, PCM16 mono
OUTPUT_SAMPLE_RATE = 24000  # server -> speaker, PCM16 mono

Message = Dict[str, str]  # {"role": "system"|"user"|"assistant", "content": str}


class BackendUnavailable(RuntimeError):
    """A backend's library or model is not installed on this machine."""


@dataclass
class STTResult:
    text: str
    language: str  # "en" | "vi" | other ISO code
    duration: float = 0.0


class LLMBackend(ABC):
    @abstractmethod
    def stream(self, messages: List[Message], **options) -> AsyncIterator[str]:
        """Yield text deltas as the model produces them."""

    @abstractmethod
    async def complete(self, messages: List[Message], json_schema: Optional[dict] = None, **options) -> str:
        """Single non-streaming answer; json_schema constrains the output."""

    async def warmup(self) -> None:  # optional
        return None


class STTBackend(ABC):
    @abstractmethod
    async def transcribe(self, pcm16: bytes, sample_rate: int = INPUT_SAMPLE_RATE,
                         language: Optional[str] = None) -> STTResult:
        ...

    async def warmup(self) -> None:
        return None


class TTSBackend(ABC):
    @abstractmethod
    def synthesize(self, text: str, lang: str, voice: str = "", speed: float = 1.0) -> AsyncIterator[bytes]:
        """Yield PCM16 mono chunks at OUTPUT_SAMPLE_RATE."""

    async def warmup(self) -> None:
        return None


class VADBackend(ABC):
    """Stateful, one instance per voice session."""

    @abstractmethod
    def process(self, pcm16: bytes) -> List[str]:
        """Feed audio of any length. Returns events: 'speech_start' / 'speech_end'."""

    @abstractmethod
    def reset(self) -> None:
        ...
