"""Turns a token stream into speakable sentences so TTS can start before the LLM finishes."""
from __future__ import annotations

import re
from typing import List

_ABBREVIATIONS = ("mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e", "no", "st", "inc", "ltd", "co")
_STRONG_END = ".!?…。"
_CLAUSE_END = ",;:"


class SentenceChunker:
    """Feed text deltas, get complete sentences back.

    The first chunk may be cut early at a clause boundary once it is long enough,
    which lowers time-to-first-audio. Later chunks wait for a real sentence end.
    """

    def __init__(self, first_clause_min: int = 28, min_len: int = 6):
        self.first_clause_min = first_clause_min
        self.min_len = min_len
        self._buf = ""
        self._emitted = 0

    @staticmethod
    def _clean(text: str) -> str:
        text = re.sub(r"[*_`#>]+", "", text)           # markdown never belongs in speech
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _is_boundary(self, text: str, idx: int) -> bool:
        ch = text[idx]
        if ch == "\n":
            return True
        if ch not in _STRONG_END:
            return False
        nxt = text[idx + 1] if idx + 1 < len(text) else ""
        if ch == ".":
            prev = text[:idx].rsplit(None, 1)[-1].lower().rstrip(".") if text[:idx].strip() else ""
            if prev in _ABBREVIATIONS:
                return False
            if idx > 0 and text[idx - 1].isdigit() and nxt.isdigit():
                return False  # 3.5
            if nxt and not nxt.isspace() and nxt not in "\"')”’":
                return False  # "www.site", "U.S."
        # Need to see what follows to be sure; an end-of-buffer terminator is decided at flush/next feed.
        return bool(nxt) or ch in "!?…"

    def feed(self, delta: str) -> List[str]:
        self._buf += delta
        out: List[str] = []
        start = 0
        i = 0
        while i < len(self._buf):
            if self._is_boundary(self._buf, i):
                piece = self._clean(self._buf[start: i + 1])
                if len(piece) >= self.min_len:
                    out.append(piece)
                    start = i + 1
            elif (self._emitted + len(out) == 0 and self._buf[i] in _CLAUSE_END
                  and len(self._clean(self._buf[start: i + 1])) >= self.first_clause_min):
                out.append(self._clean(self._buf[start: i + 1]))
                start = i + 1
            i += 1
        self._buf = self._buf[start:]
        self._emitted += len(out)
        return out

    def flush(self) -> List[str]:
        rest = self._clean(self._buf)
        self._buf = ""
        if rest:
            self._emitted += 1
            return [rest]
        return []
