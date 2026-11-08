"""Dependency-free voice activity detection based on frame energy.

Good enough for a quiet room and as the always-available fallback. A Silero
backend can replace it later through the same interface.
"""
from __future__ import annotations

import array
import math
from typing import List

from .base import INPUT_SAMPLE_RATE, VADBackend

FRAME_MS = 20


class EnergyVAD(VADBackend):
    def __init__(self, threshold: float = 0.015, min_silence_ms: int = 600,
                 min_speech_ms: int = 160, sample_rate: int = INPUT_SAMPLE_RATE):
        self.threshold = threshold
        self.min_silence_frames = max(1, min_silence_ms // FRAME_MS)
        self.min_speech_frames = max(1, min_speech_ms // FRAME_MS)
        self.frame_bytes = sample_rate * FRAME_MS // 1000 * 2
        self.reset()

    def reset(self) -> None:
        self._buffer = bytearray()
        self._speaking = False
        self._voiced_run = 0
        self._silent_run = 0

    @staticmethod
    def _rms(frame: bytes) -> float:
        samples = array.array("h")
        samples.frombytes(frame)
        if not samples:
            return 0.0
        total = sum(s * s for s in samples)
        return math.sqrt(total / len(samples)) / 32768.0

    def process(self, pcm16: bytes) -> List[str]:
        events: List[str] = []
        self._buffer.extend(pcm16)
        while len(self._buffer) >= self.frame_bytes:
            frame = bytes(self._buffer[: self.frame_bytes])
            del self._buffer[: self.frame_bytes]
            voiced = self._rms(frame) >= self.threshold
            if voiced:
                self._voiced_run += 1
                self._silent_run = 0
                if not self._speaking and self._voiced_run >= self.min_speech_frames:
                    self._speaking = True
                    events.append("speech_start")
            else:
                self._voiced_run = 0
                if self._speaking:
                    self._silent_run += 1
                    if self._silent_run >= self.min_silence_frames:
                        self._speaking = False
                        self._silent_run = 0
                        events.append("speech_end")
        return events
