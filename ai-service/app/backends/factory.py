"""Builds backend instances from the active profile's config."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from ..settings import Settings
from .base import BackendUnavailable, LLMBackend, STTBackend, TTSBackend, VADBackend
from .energy_vad import EnergyVAD
from .fake import FakeLLM, FakeSTT, FakeTTS
from .ollama_llm import OllamaLLM


@dataclass
class Backends:
    llm: LLMBackend
    stt: STTBackend
    tts: TTSBackend
    vad_factory: Callable[[], VADBackend]


def _build_llm(cfg: dict) -> LLMBackend:
    kind = cfg.get("backend", "ollama")
    if kind == "fake":
        return FakeLLM()
    if kind == "ollama":
        return OllamaLLM(base_url=cfg.get("base_url", "http://127.0.0.1:11434"), model=cfg.get("model", "qwen3:14b"),
                         keep_alive=cfg.get("keep_alive", "30m"), num_ctx=int(cfg.get("num_ctx", 4096)),
                         temperature=float(cfg.get("temperature", 0.6)))
    raise BackendUnavailable(f"Unknown llm backend {kind!r}")


def _build_stt(cfg: dict) -> STTBackend:
    kind = cfg.get("backend", "fake")
    if kind == "fake":
        return FakeSTT()
    raise BackendUnavailable(f"STT backend {kind!r} is not available in this build")


def _build_tts(cfg: dict) -> TTSBackend:
    kind = cfg.get("backend", "fake")
    if kind == "fake":
        return FakeTTS()
    raise BackendUnavailable(f"TTS backend {kind!r} is not available in this build")


def build_backends(settings: Settings) -> Backends:
    vad_cfg = settings.vad

    def make_vad() -> VADBackend:
        return EnergyVAD(threshold=float(vad_cfg.get("threshold", 0.015)),
                         min_silence_ms=int(vad_cfg.get("min_silence_ms", 600)),
                         min_speech_ms=int(vad_cfg.get("min_speech_ms", 160)))

    return Backends(
        llm=_build_llm(settings.llm),
        stt=_build_stt(settings.stt),
        tts=_build_tts(settings.tts.get("en", settings.tts)),
        vad_factory=make_vad,
    )
