import array
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backends.energy_vad import EnergyVAD  # noqa: E402
from app.settings import load_settings  # noqa: E402
from app.voice.chunker import SentenceChunker  # noqa: E402
from app.voice.lang import detect_lang  # noqa: E402
from app.voice.prompts import build_system_prompt  # noqa: E402


def tone(ms: int, amp: float = 0.3, rate: int = 16000) -> bytes:
    n = rate * ms // 1000
    return array.array("h", (int(amp * 32767 * math.sin(2 * math.pi * 220 * i / rate)) for i in range(n))).tobytes()


def silence(ms: int, rate: int = 16000) -> bytes:
    return b"\x00\x00" * (rate * ms // 1000)


class ChunkerTests(unittest.TestCase):
    def run_stream(self, text, step=3):
        c = SentenceChunker()
        out = []
        for i in range(0, len(text), step):
            out += c.feed(text[i:i + step])
        return out + c.flush()

    def test_splits_sentences_regardless_of_token_size(self):
        text = "Hello there. How are you today? I am fine!"
        for step in (1, 2, 5, 100):
            self.assertEqual(self.run_stream(text, step),
                             ["Hello there.", "How are you today?", "I am fine!"], f"step={step}")

    def test_keeps_decimals_and_abbreviations_together(self):
        out = self.run_stream("Mr. Smith paid 3.5 dollars. Then he left.")
        self.assertEqual(out, ["Mr. Smith paid 3.5 dollars.", "Then he left."])

    def test_first_chunk_cut_early_at_clause(self):
        c = SentenceChunker(first_clause_min=20)
        out = c.feed("Well, that is a really good question, and here is more")
        self.assertEqual(out[0], "Well, that is a really good question,")

    def test_strips_markdown_and_handles_vietnamese(self):
        out = self.run_stream("**Xin chào** bạn! Hôm nay bạn thế nào?")
        self.assertEqual(out, ["Xin chào bạn!", "Hôm nay bạn thế nào?"])

    def test_flush_returns_unterminated_tail(self):
        c = SentenceChunker()
        self.assertEqual(c.feed("No ending here"), [])
        self.assertEqual(c.flush(), ["No ending here"])


class LangTests(unittest.TestCase):
    def test_detects(self):
        self.assertEqual(detect_lang("Xin chào, bạn khỏe không?"), "vi")
        self.assertEqual(detect_lang("How are you doing today?"), "en")
        self.assertEqual(detect_lang("Từ 'invoice' nghĩa là hóa đơn."), "vi")
        self.assertEqual(detect_lang("12345"), "en")
        self.assertEqual(detect_lang("toi khong biet ban duoc"), "vi")


class VadTests(unittest.TestCase):
    def test_start_and_end_with_odd_chunk_sizes(self):
        vad = EnergyVAD(min_silence_ms=300, min_speech_ms=100)
        audio = silence(200) + tone(600) + silence(500)
        events = []
        for i in range(0, len(audio), 777):  # deliberately not frame-aligned
            events += vad.process(audio[i:i + 777])
        self.assertEqual(events, ["speech_start", "speech_end"])

    def test_short_blip_is_ignored(self):
        vad = EnergyVAD(min_silence_ms=300, min_speech_ms=160)
        self.assertEqual(vad.process(silence(100) + tone(40) + silence(600)), [])


class SettingsPromptTests(unittest.TestCase):
    def test_both_profiles_load(self):
        mac = load_settings("mac")
        lite = load_settings("win-lite")
        self.assertEqual(mac.llm["model"], "qwen3:14b")
        self.assertIn("3b", lite.llm["model"])
        self.assertEqual(lite.host, "127.0.0.1")

    def test_prompt_contains_voice_rules_and_language_policy(self):
        p = build_system_prompt("assistant", "strict", "instant", user_brief="weak at Part 5")
        self.assertIn("Vietnamese", p)
        self.assertIn("Never use markdown", p)
        self.assertIn("weak at Part 5", p)
        self.assertIn("always speak english", build_system_prompt("speaking").lower())


if __name__ == "__main__":
    unittest.main()
