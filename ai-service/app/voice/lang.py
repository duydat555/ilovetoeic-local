"""Cheap en/vi language detection for routing a sentence to the right TTS voice."""
from __future__ import annotations

import re

# Characters that exist in Vietnamese but not in plain English text.
_VI_CHARS = set(
    "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
)
# Very common Vietnamese words without diacritics-only signals (e.g. "an", "no" are ambiguous, so
# only unambiguous ones are listed).
_VI_WORDS = {"toi", "ban", "khong", "duoc", "cua", "nhung", "nhu", "vay"}
_WORD = re.compile(r"[^\W\d_]+", re.UNICODE)


def detect_lang(text: str, default: str = "en") -> str:
    """Return 'vi' or 'en'. Vietnamese diacritics are a strong signal; plain ASCII is English."""
    letters = [c for c in text.lower() if c.isalpha()]
    if not letters:
        return default
    vi_count = sum(1 for c in letters if c in _VI_CHARS)
    if vi_count / len(letters) >= 0.04 or vi_count >= 2:
        return "vi"
    words = {w.lower() for w in _WORD.findall(text)}
    if len(words & _VI_WORDS) >= 2:
        return "vi"
    return "en"
