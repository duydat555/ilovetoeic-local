"""One realtime voice conversation: mic audio in, speech and events out.

Pipeline per turn:  VAD (end of speech) -> STT -> LLM stream -> sentence chunker -> TTS per sentence.
TTS of sentence N runs while the LLM is still writing sentence N+1. If the learner starts talking
while the assistant is answering (barge-in), the turn is cancelled immediately.

Wire protocol (JSON text frames unless noted):
  client -> server  {"type":"start","settings":{...}} | {"type":"text","text":"..."} |
                    {"type":"mute","value":bool} | {"type":"interrupt"} | {"type":"end"} |
                    binary frame = PCM16 mono 16 kHz
  server -> client  {"type":"state","value":...} | {"type":"transcript","final":bool,"text":..,"lang":..,"source":..} |
                    {"type":"assistant_delta","text":..,"seq":n} | {"type":"audio_start","seq":n,"lang":..} |
                    {"type":"audio_end","seq":n} | {"type":"interrupted"} | {"type":"error","code":..,"message":..} |
                    {"type":"summary",...} ; binary frame = 4-byte big-endian seq + PCM16 mono 24 kHz
"""
from __future__ import annotations

import asyncio
import json
import re
import struct
import time
from typing import Awaitable, Callable, Dict, List, Optional

from ..backends.base import (
    INPUT_SAMPLE_RATE,
    BackendUnavailable,
    LLMBackend,
    Message,
    STTBackend,
    TTSBackend,
    VADBackend,
)
from .chunker import SentenceChunker
from .lang import detect_lang
from .prompts import SUMMARY_INSTRUCTION, SUMMARY_SCHEMA, build_system_prompt

SendJson = Callable[[dict], Awaitable[None]]
SendBytes = Callable[[bytes], Awaitable[None]]

BYTES_PER_SECOND = INPUT_SAMPLE_RATE * 2
PREROLL_BYTES = int(0.35 * BYTES_PER_SECOND)
MAX_UTTERANCE_BYTES = 30 * BYTES_PER_SECOND
MIN_UTTERANCE_SECONDS = 0.30

# Whisper tends to invent these on silence or noise.
_HALLUCINATIONS = {
    "you", "thank you", "thanks", "thanks for watching", "thank you for watching", "bye", "okay",
    "cảm ơn các bạn đã theo dõi", "hẹn gặp lại các bạn trong những video tiếp theo",
}


def _norm(text: str) -> str:
    return re.sub(r"[^\w\s]", "", text.lower()).strip()


class VoiceSession:
    def __init__(self, llm: LLMBackend, stt: STTBackend, tts: TTSBackend, vad: VADBackend,
                 send_json: SendJson, send_bytes: SendBytes,
                 max_history_chars: int = 6000, max_session_seconds: int = 900):
        self.llm, self.stt, self.tts, self.vad = llm, stt, tts, vad
        self._send_json, self._send_bytes = send_json, send_bytes
        self.max_history_chars = max_history_chars
        self.max_session_seconds = max_session_seconds

        self.state = "idle"
        self.started = False
        self.ended = False
        self.muted = False
        self.settings: Dict = {}
        self.history: List[Message] = []
        self.turns = 0

        self._started_at = 0.0
        self._turn_task: Optional[asyncio.Task] = None
        self._audio_started = False
        self._carry = b""
        self._in_speech = False
        self._utterance = bytearray()
        self._preroll: List[bytes] = []
        self._preroll_len = 0

    # ------------------------------------------------------------------ helpers
    async def _set_state(self, value: str) -> None:
        if value != self.state:
            self.state = value
            await self._send_json({"type": "state", "value": value})

    def _system_prompt(self) -> str:
        s = self.settings
        return build_system_prompt(s.get("mode", "assistant"), s.get("persona", "friendly"),
                                   s.get("correction", "summary"), s.get("scenario"), s.get("user_brief"))

    def _trimmed_history(self) -> List[Message]:
        kept: List[Message] = []
        total = 0
        for msg in reversed(self.history):
            total += len(msg["content"])
            if total > self.max_history_chars and kept:
                break
            kept.append(msg)
        return list(reversed(kept))

    def _voice_for(self, lang: str) -> str:
        voices = self.settings.get("voices") or {}
        return voices.get(lang, "")

    def _expired(self) -> bool:
        return self.started and time.monotonic() - self._started_at > self.max_session_seconds

    # ------------------------------------------------------------------ inbound
    async def handle_json(self, msg: dict) -> None:
        kind = msg.get("type")
        if kind == "start":
            await self._start(msg.get("settings") or {})
        elif not self.started or self.ended:
            return
        elif kind == "text":
            text = str(msg.get("text", "")).strip()
            if text:
                await self._cancel_turn(announce=self.state in ("thinking", "ai-speaking"))
                await self._send_json({"type": "transcript", "final": True, "text": text,
                                       "lang": detect_lang(text), "source": "text"})
                self._turn_task = asyncio.create_task(self._respond(text))
        elif kind == "mute":
            self.muted = bool(msg.get("value"))
            if self.muted:
                self._reset_capture()
                self.vad.reset()
            if self.state in ("listening", "user-speaking", "muted"):
                await self._set_state("muted" if self.muted else "listening")
        elif kind == "interrupt":
            await self._cancel_turn(announce=True)
        elif kind == "end":
            await self.finish()

    async def handle_audio(self, data: bytes) -> None:
        if not self.started or self.ended or self.muted:
            return
        if self._expired():
            await self._send_json({"type": "error", "code": "session_limit",
                                   "message": "Phiên trò chuyện đã đạt giới hạn thời gian."})
            await self.finish()
            return

        events = self.vad.process(data)
        if self._in_speech:
            self._utterance.extend(data)
        else:
            self._preroll.append(data)
            self._preroll_len += len(data)
            while self._preroll_len > PREROLL_BYTES and len(self._preroll) > 1:
                self._preroll_len -= len(self._preroll.pop(0))

        for event in events:
            if event == "speech_start" and not self._in_speech:
                self._in_speech = True
                self._utterance = bytearray(b"".join(self._preroll))
                self._preroll, self._preroll_len = [], 0
                await self._on_speech_start()
            elif event == "speech_end" and self._in_speech:
                await self._on_speech_end()

        if self._in_speech and len(self._utterance) > MAX_UTTERANCE_BYTES:
            await self._on_speech_end()  # never buffer unbounded audio

    # ------------------------------------------------------------------ turn control
    async def _start(self, settings: dict) -> None:
        if self.started:
            return
        self.settings = settings
        # A failover reconnect replays the conversation so the new server keeps the thread.
        for item in (settings.get("history") or [])[-40:]:
            if (isinstance(item, dict) and item.get("role") in ("user", "assistant")
                    and isinstance(item.get("content"), str) and item["content"].strip()):
                self.history.append({"role": item["role"], "content": item["content"][:2000]})
        self.started = True
        self._started_at = time.monotonic()
        await self._set_state("listening")

    def _reset_capture(self) -> None:
        self._in_speech = False
        self._utterance = bytearray()
        self._preroll, self._preroll_len = [], 0

    async def _on_speech_start(self) -> None:
        busy = self._turn_task is not None and not self._turn_task.done()
        if busy:
            await self._cancel_turn(announce=self._audio_started)
        await self._set_state("user-speaking")

    async def _on_speech_end(self) -> None:
        audio = self._carry + bytes(self._utterance)
        self._carry = b""
        self._reset_capture()
        if len(audio) / BYTES_PER_SECOND < MIN_UTTERANCE_SECONDS:
            await self._set_state("muted" if self.muted else "listening")
            return
        await self._set_state("thinking")
        self._turn_task = asyncio.create_task(self._process_utterance(audio))

    async def _cancel_turn(self, announce: bool) -> None:
        task = self._turn_task
        self._turn_task = None
        if task is not None and not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        if announce:
            await self._send_json({"type": "interrupted"})
        if self.state in ("thinking", "ai-speaking"):
            await self._set_state("muted" if self.muted else "listening")

    # ------------------------------------------------------------------ the turn
    async def _process_utterance(self, audio: bytes) -> None:
        self._audio_started = False
        duration = len(audio) / BYTES_PER_SECOND
        try:
            result = await self.stt.transcribe(audio, INPUT_SAMPLE_RATE, self.settings.get("stt_language"))
        except asyncio.CancelledError:
            if not self._audio_started:
                self._carry = audio  # learner kept talking: merge with their next utterance
            raise
        except Exception as exc:  # STT failure must not kill the session
            await self._send_json({"type": "error", "code": "stt_failed", "message": str(exc)[:200]})
            await self._set_state("listening")
            return

        text = result.text.strip()
        if not text or (duration < 1.6 and _norm(text) in _HALLUCINATIONS):
            await self._set_state("muted" if self.muted else "listening")
            return
        await self._send_json({"type": "transcript", "final": True, "text": text,
                               "lang": result.language or detect_lang(text), "source": "voice"})
        await self._respond(text)

    async def _respond(self, user_text: str) -> None:
        self._audio_started = False
        self.history.append({"role": "user", "content": user_text})
        self.turns += 1
        await self._set_state("thinking")

        messages: List[Message] = [{"role": "system", "content": self._system_prompt()}] + self._trimmed_history()
        queue: "asyncio.Queue[Optional[str]]" = asyncio.Queue()
        spoken: List[str] = []

        async def produce() -> None:
            chunker = SentenceChunker()
            try:
                async for delta in self.llm.stream(messages):
                    for sentence in chunker.feed(delta):
                        await queue.put(sentence)
                for sentence in chunker.flush():
                    await queue.put(sentence)
            finally:
                await queue.put(None)

        async def consume() -> None:
            seq = 0
            speed = float(self.settings.get("speed", 1.0))
            while True:
                sentence = await queue.get()
                if sentence is None:
                    return
                lang = detect_lang(sentence)
                spoken.append(sentence)
                if not self._audio_started:
                    self._audio_started = True
                    await self._set_state("ai-speaking")
                await self._send_json({"type": "assistant_delta", "text": sentence, "seq": seq})
                await self._send_json({"type": "audio_start", "seq": seq, "lang": lang})
                header = struct.pack(">I", seq)
                async for chunk in self.tts.synthesize(sentence, lang, self._voice_for(lang), speed):
                    await self._send_bytes(header + chunk)
                await self._send_json({"type": "audio_end", "seq": seq})
                seq += 1

        producer = asyncio.create_task(produce())
        consumer = asyncio.create_task(consume())
        try:
            await asyncio.gather(producer, consumer)
        except asyncio.CancelledError:
            raise
        except BackendUnavailable as exc:
            await self._send_json({"type": "error", "code": "ai_unavailable", "message": str(exc)})
        except Exception as exc:
            await self._send_json({"type": "error", "code": "turn_failed", "message": str(exc)[:200]})
        finally:
            for task in (producer, consumer):
                if not task.done():
                    task.cancel()
            await asyncio.gather(producer, consumer, return_exceptions=True)
            if spoken:
                self.history.append({"role": "assistant", "content": " ".join(spoken)})
            elif self.history and self.history[-1]["role"] == "user":
                self.history.pop()  # nothing was said: do not keep a dangling question
                self.turns -= 1
            if asyncio.current_task() is self._turn_task:
                self._turn_task = None

        await self._set_state("muted" if self.muted else "listening")

    # ------------------------------------------------------------------ end of session
    async def finish(self) -> None:
        if self.ended:
            return
        self.ended = True
        await self._cancel_turn(announce=False)
        summary: dict = {"mistakes": [], "new_words": [], "tip": ""}
        learner_turns = sum(1 for m in self.history if m["role"] == "user")
        if learner_turns >= 2:
            try:
                transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in self.history)
                raw = await asyncio.wait_for(
                    self.llm.complete(
                        [{"role": "system", "content": "You are an English teacher reviewing a spoken practice session."},
                         {"role": "user", "content": f"{transcript}\n\n{SUMMARY_INSTRUCTION}"}],
                        json_schema=SUMMARY_SCHEMA, temperature=0.2),
                    timeout=40,
                )
                parsed = json.loads(raw)
                summary = {
                    "mistakes": list(parsed.get("mistakes", []))[:5],
                    "new_words": list(parsed.get("new_words", []))[:6],
                    "tip": str(parsed.get("tip", "")),
                }
            except Exception:
                pass  # a summary is a bonus; never fail the session over it
        await self._send_json({
            "type": "summary",
            "duration_seconds": int(time.monotonic() - self._started_at) if self.started else 0,
            "turns": learner_turns,
            "transcript": self.history,
            **summary,
        })
        await self._set_state("idle")
