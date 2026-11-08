"""Deterministic in-memory backends for tests and for running the UI without any model."""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator, Callable, List, Optional

from .base import INPUT_SAMPLE_RATE, LLMBackend, Message, STTBackend, STTResult, TTSBackend, VADBackend


class FakeLLM(LLMBackend):
    def __init__(self, reply: str | Callable[[List[Message]], str] = "Hello there. How can I help you today?",
                 delay: float = 0.0, summary: Optional[dict] = None):
        self.reply = reply
        self.delay = delay
        self.summary = summary or {"mistakes": [], "new_words": [], "tip": ""}
        self.calls: List[List[Message]] = []

    async def stream(self, messages: List[Message], **options) -> AsyncIterator[str]:
        self.calls.append(messages)
        text = self.reply(messages) if callable(self.reply) else self.reply
        for word in text.split(" "):
            if self.delay:
                await asyncio.sleep(self.delay)
            yield word + " "

    async def complete(self, messages: List[Message], json_schema: Optional[dict] = None, **options) -> str:
        return json.dumps(self.summary)


class FakeSTT(STTBackend):
    def __init__(self, text: str | Callable[[bytes], str] = "Hello", language: str = "en", delay: float = 0.0):
        self.text, self.language, self.delay = text, language, delay
        self.calls: List[int] = []

    async def transcribe(self, pcm16: bytes, sample_rate: int = INPUT_SAMPLE_RATE,
                         language: Optional[str] = None) -> STTResult:
        self.calls.append(len(pcm16))
        if self.delay:
            await asyncio.sleep(self.delay)
        text = self.text(pcm16) if callable(self.text) else self.text
        return STTResult(text=text, language=self.language, duration=len(pcm16) / (sample_rate * 2))


class FakeTTS(TTSBackend):
    def __init__(self, chunk_delay: float = 0.0, chunks_per_sentence: int = 3):
        self.chunk_delay = chunk_delay
        self.chunks_per_sentence = chunks_per_sentence
        self.synthesized: List[tuple] = []

    async def synthesize(self, text: str, lang: str, voice: str = "", speed: float = 1.0) -> AsyncIterator[bytes]:
        self.synthesized.append((text, lang, voice, speed))
        for _ in range(self.chunks_per_sentence):
            if self.chunk_delay:
                await asyncio.sleep(self.chunk_delay)
            yield b"\x01\x00" * 240


class ScriptedVAD(VADBackend):
    """Emits events when it sees marker bytes, so tests control turn-taking exactly.

    A chunk starting with b'S' means speech_start, b'E' means speech_end.
    """

    def process(self, pcm16: bytes) -> List[str]:
        if pcm16[:1] == b"S":
            return ["speech_start"]
        if pcm16[:1] == b"E":
            return ["speech_end"]
        return []

    def reset(self) -> None:
        return None
