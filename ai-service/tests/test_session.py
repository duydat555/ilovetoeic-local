import asyncio
import json
import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backends.fake import FakeLLM, FakeSTT, FakeTTS, ScriptedVAD  # noqa: E402
from app.voice.session import BYTES_PER_SECOND, VoiceSession  # noqa: E402

SPEECH_START = b"S" + b"\x01" * 3199   # 100 ms
SPEECH_END = b"E" + b"\x01" * 3199
VOICED = b"\x01" * 3200


class Harness:
    def __init__(self, llm=None, stt=None, tts=None, **kw):
        self.events, self.audio = [], []
        self.llm, self.stt, self.tts = llm or FakeLLM(), stt or FakeSTT(), tts or FakeTTS()
        self.session = VoiceSession(self.llm, self.stt, self.tts, ScriptedVAD(), self._json, self._bytes, **kw)

    async def _json(self, payload):
        self.events.append(payload)

    async def _bytes(self, payload):
        self.audio.append(payload)

    def types(self):
        return [e["type"] for e in self.events]

    def states(self):
        return [e["value"] for e in self.events if e["type"] == "state"]

    async def start(self, **settings):
        await self.session.handle_json({"type": "start", "settings": settings})

    async def say(self, seconds=1.0):
        """Send one utterance: start marker, body, end marker."""
        await self.session.handle_audio(SPEECH_START)
        for _ in range(int(seconds * 10)):
            await self.session.handle_audio(VOICED)
        await self.session.handle_audio(SPEECH_END)

    async def settle(self):
        for _ in range(400):
            task = self.session._turn_task
            if task is None or task.done():
                return
            await asyncio.sleep(0.005)
        raise AssertionError("turn did not finish")


class VoiceSessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_full_turn_streams_sentences_in_order(self):
        h = Harness(llm=FakeLLM("Hello there. How can I help you today?"), stt=FakeSTT("I need help"))
        await h.start()
        await h.say(1.0)
        await h.settle()

        self.assertEqual(h.states(), ["listening", "user-speaking", "thinking", "ai-speaking", "listening"])
        transcript = [e for e in h.events if e["type"] == "transcript"][0]
        self.assertEqual((transcript["text"], transcript["final"], transcript["source"]), ("I need help", True, "voice"))

        starts = [e for e in h.events if e["type"] == "audio_start"]
        ends = [e for e in h.events if e["type"] == "audio_end"]
        self.assertEqual([e["seq"] for e in starts], [0, 1])
        self.assertEqual([e["seq"] for e in ends], [0, 1])
        seqs = [struct.unpack(">I", f[:4])[0] for f in h.audio]
        self.assertEqual(seqs, sorted(seqs))
        self.assertEqual(set(seqs), {0, 1})
        self.assertEqual([m["role"] for m in h.session.history], ["user", "assistant"])
        self.assertEqual(h.session.history[1]["content"], "Hello there. How can I help you today?")

    async def test_vietnamese_sentence_uses_vietnamese_voice(self):
        h = Harness(llm=FakeLLM("Xin chào bạn. Hello friend."), stt=FakeSTT("Chào", language="vi"))
        await h.start(voices={"vi": "vi-voice", "en": "en-voice"})
        await h.say()
        await h.settle()
        langs = [(t[1], t[2]) for t in h.tts.synthesized]
        self.assertEqual(langs, [("vi", "vi-voice"), ("en", "en-voice")])

    async def test_barge_in_cancels_assistant_and_keeps_only_spoken_text(self):
        h = Harness(llm=FakeLLM("First sentence here. Second sentence here. Third sentence here.", delay=0.01),
                    tts=FakeTTS(chunk_delay=0.05, chunks_per_sentence=4), stt=FakeSTT("tell me a story"))
        await h.start()
        await h.say()
        for _ in range(200):  # wait until the assistant is audibly speaking
            if h.audio:
                break
            await asyncio.sleep(0.005)
        self.assertTrue(h.audio, "assistant never started speaking")
        sent_before = len(h.audio)

        await h.session.handle_audio(SPEECH_START)   # learner interrupts
        self.assertIn("interrupted", h.types())
        self.assertEqual(h.session.state, "user-speaking")
        await asyncio.sleep(0.3)
        self.assertEqual(len(h.audio), sent_before, "audio kept flowing after barge-in")
        spoken = h.session.history[-1]
        self.assertEqual(spoken["role"], "assistant")
        self.assertNotIn("Third", spoken["content"])

    async def test_speaking_before_ai_audio_merges_utterances_without_interrupt_event(self):
        h = Harness(stt=FakeSTT(lambda pcm: f"len{len(pcm)}", delay=0.2))
        await h.start()
        await h.say(1.0)               # STT is slow, still "thinking"
        await asyncio.sleep(0.02)
        await h.say(1.0)               # learner keeps talking
        await h.settle()
        self.assertNotIn("interrupted", h.types())
        first_len = h.stt.calls[0]
        self.assertGreater(h.stt.calls[-1], first_len, "second STT call should include the first utterance")
        user_msgs = [m for m in h.session.history if m["role"] == "user"]
        self.assertEqual(len(user_msgs), 1)

    async def test_typed_text_gets_spoken_answer(self):
        h = Harness(llm=FakeLLM("Sure. Here you go."))
        await h.start()
        await h.session.handle_json({"type": "text", "text": "Explain 'invoice'"})
        await h.settle()
        t = [e for e in h.events if e["type"] == "transcript"][0]
        self.assertEqual(t["source"], "text")
        self.assertTrue(h.audio)

    async def test_whisper_hallucination_on_short_noise_is_dropped(self):
        h = Harness(stt=FakeSTT("Thank you."))
        await h.start()
        await h.say(0.5)
        await h.settle()
        self.assertNotIn("transcript", h.types())
        self.assertEqual(h.llm.calls, [])
        self.assertEqual(h.session.state, "listening")

    async def test_too_short_blip_never_reaches_stt(self):
        h = Harness()
        await h.start()
        await h.session.handle_audio(SPEECH_START)
        await h.session.handle_audio(SPEECH_END)
        self.assertEqual(h.stt.calls, [])
        self.assertEqual(h.session.state, "listening")

    async def test_muted_ignores_audio(self):
        h = Harness()
        await h.start()
        await h.session.handle_json({"type": "mute", "value": True})
        await h.say(1.0)
        self.assertEqual(h.stt.calls, [])
        self.assertEqual(h.session.state, "muted")
        await h.session.handle_json({"type": "mute", "value": False})
        self.assertEqual(h.session.state, "listening")

    async def test_llm_failure_reports_error_and_recovers(self):
        class Boom(FakeLLM):
            async def stream(self, messages, **options):
                from app.backends.base import BackendUnavailable
                raise BackendUnavailable("Ollama is not reachable")
                yield  # pragma: no cover

        h = Harness(llm=Boom())
        await h.start()
        await h.say()
        await h.settle()
        err = [e for e in h.events if e["type"] == "error"]
        self.assertEqual(err[0]["code"], "ai_unavailable")
        self.assertEqual(h.session.state, "listening")
        self.assertEqual(h.session.history, [], "a question nobody answered must not stay in history")

    async def test_end_sends_summary_with_corrections(self):
        summary = {"mistakes": [{"original": "I go yesterday", "better": "I went yesterday", "note": "Thì quá khứ"}],
                   "new_words": [{"word": "invoice", "meaning_vi": "hóa đơn"}], "tip": "Luyện thêm thì quá khứ."}
        h = Harness(llm=FakeLLM("Nice. Tell me more.", summary=summary))
        await h.start()
        for _ in range(2):
            await h.say()
            await h.settle()
        await h.session.handle_json({"type": "end"})
        s = [e for e in h.events if e["type"] == "summary"][0]
        self.assertEqual(s["turns"], 2)
        self.assertEqual(s["mistakes"][0]["better"], "I went yesterday")
        self.assertEqual(s["new_words"][0]["word"], "invoice")
        self.assertTrue(h.session.ended)

    async def test_session_time_limit(self):
        h = Harness(max_session_seconds=0)
        await h.start()
        await asyncio.sleep(0.01)
        await h.session.handle_audio(VOICED)
        self.assertIn("session_limit", [e.get("code") for e in h.events])
        self.assertTrue(h.session.ended)

    async def test_history_is_trimmed_to_budget(self):
        h = Harness(max_history_chars=100)
        await h.start()
        h.session.history = [{"role": "user", "content": "x" * 80}, {"role": "assistant", "content": "y" * 80},
                             {"role": "user", "content": "z" * 80}]
        trimmed = h.session._trimmed_history()
        self.assertEqual([m["content"][0] for m in trimmed], ["z"])


if __name__ == "__main__":
    unittest.main()
