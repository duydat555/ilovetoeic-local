"""
translate_sentence_pairs.py
---------------------------
Pipeline dịch song ngữ chuẩn theo từng câu (Pre-aligned Sentence Pairs) cho Reading Passages (Part 6 & 7).
Tách câu tiếng Anh trước khi gửi cho Gemini AI, yêu cầu AI dịch 1-1 chính xác,
và lưu cấu trúc JSON hoàn chỉnh vào cột passages.passage_sentence_pairs.

Tăng tốc: ThreadPoolExecutor + RateLimiter (token-bucket) thread-safe.
"""

import argparse
import concurrent.futures
import json
import logging
import os
import re
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup, Tag
from pydantic import BaseModel, Field

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app import config
from app.db import db

try:
    import deepl
except ImportError:
    deepl = None

try:
    from google.cloud import translate_v3 as translate
except ImportError:
    translate = None

import requests

try:
    import ollama
except ImportError:
    ollama = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("translate_sentence_pairs")

# Global lock to keep log lines intact when multithreading
_LOG_LOCK = threading.Lock()


def _log(level: int, msg: str) -> None:
    with _LOG_LOCK:
        logger.log(level, msg)


ABBREVIATIONS = {
    "mr.", "ms.", "mrs.", "dr.", "st.", "inc.", "co.", "ltd.", "corp.", "no.", "dept.",
    "vs.", "e.g.", "i.e.", "a.m.", "p.m.", "jan.", "feb.", "mar.", "apr.", "aug.",
    "sept.", "oct.", "nov.", "dec.", "ave.", "rd.", "blvd.", "u.s.", "u.k.", "approx.",
    "est.", "prof.", "assoc.", "conf.", "asst.", "no.", "nos.", "min.", "hr.", "hrs.",
    "ext.", "tel.", "fax."
}

BLANK_REGEX = re.compile(
    r"(?:_{2,}\s*)?[(\[]\s*(1[34]\d)\s*[)\]](?:\s*_{2,})?"
    r"|___+\s*(1[34]\d)\s*___+"
    r"|---+\s*(?:[(\[])?\s*(1[34]\d)\s*(?:[)\]])?\s*---+"
    r"|[(\[]\s*(1[34]\d)\s*[)\]]"
)

METADATA_REGEX = re.compile(
    r"^(to|from|date|subject|sent|cc|bcc|re|time|location|where|when|address|contact|email|phone|website)\s*:",
    re.IGNORECASE,
)
SALUTATION_REGEX = re.compile(r"^(dear|hello|hi|to whom it may concern)\b", re.IGNORECASE)
SIGNOFF_REGEX = re.compile(
    r"^(sincerely|best regards|regards|warm regards|yours truly|thank you|thanks|respectfully)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Rate limiter (token-bucket, thread-safe)
# ---------------------------------------------------------------------------
class RateLimiter:
    """
    Enforces a global calls-per-minute (RPM) ceiling across ALL worker threads.
    Multiple threads may wait concurrently, so we don't serialize the pipeline.
    """

    def __init__(self, calls_per_minute: int):
        self.min_interval = 60.0 / max(1, calls_per_minute)
        self._lock = threading.Lock()
        self._next_allowed = time.monotonic()

    def acquire(self) -> None:
        """Reserve the next available slot and sleep until then."""
        with self._lock:
            now = time.monotonic()
            wait_until = max(now, self._next_allowed)
            self._next_allowed = wait_until + self.min_interval
        delay = wait_until - now
        if delay > 0:
            time.sleep(delay)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class TranslationPair(BaseModel):
    sentence_id: int
    vi: str


class BatchTranslationResponse(BaseModel):
    pairs: List[TranslationPair]


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------
def extract_question_numbers(text: str) -> List[int]:
    numbers: List[int] = []
    for m in BLANK_REGEX.finditer(text):
        num_str = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if num_str:
            val = int(num_str)
            if val not in numbers:
                numbers.append(val)
    return numbers


def split_text_into_sentences(text: str) -> List[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []

    raw_splits = re.split(r"(?<=[.!?])\s+|(?<=[.!?][\"'”’])\s+", clean)
    sentences: List[str] = []
    current = ""

    for part in raw_splits:
        if current:
            current += " " + part
        else:
            current = part

        words = current.strip().split()
        if not words:
            continue
        last_word = words[-1].lower()
        clean_last = re.sub(r"[^a-z0-9.]", "", last_word)

        if clean_last in ABBREVIATIONS or re.match(r"^[a-z]\.$", clean_last):
            continue

        sentences.append(current.strip())
        current = ""

    if current.strip():
        sentences.append(current.strip())

    return sentences


def get_document_nodes(html: str) -> List[BeautifulSoup | Tag]:
    soup = BeautifulSoup(html, "html.parser")
    hr_tags = soup.find_all("hr")
    if hr_tags:
        raw_parts = re.split(r"<hr[^>]*>", html, flags=re.IGNORECASE)
        parts = [BeautifulSoup(p.strip(), "html.parser") for p in raw_parts if p.strip()]
        if len(parts) > 1:
            return parts

    top_elements = [c for c in soup.contents if (getattr(c, "name", None) or str(c).strip())]
    top_divs = [c for c in top_elements if getattr(c, "name", None) == "div"]

    if len(top_divs) > 1:
        return top_divs
    if len(top_divs) == 1:
        inner_divs = [c for c in top_divs[0].contents if getattr(c, "name", None) == "div" and c.get_text().strip()]
        direct_substantive = [c for c in top_divs[0].contents if getattr(c, "name", None) not in ("div", None) and c.get_text().strip()]
        if len(inner_divs) > 1 and not direct_substantive:
            return inner_divs
        return top_divs
    return [soup]


def parse_passage_to_items(html: str) -> List[Dict[str, Any]]:
    docs = get_document_nodes(html)
    all_items: List[Dict[str, Any]] = []
    sentence_id = 1

    for doc_idx, doc_node in enumerate(docs):
        has_seen_paragraph = False

        for br in doc_node.find_all(["br"]):
            br.replace_with("\n")

        # Tables
        tables = doc_node.find_all("table")
        for tbl in tables:
            rows = tbl.find_all("tr")
            for r in rows:
                cols = [c.get_text().strip() for c in r.find_all(["td", "th"]) if c.get_text().strip()]
                if not cols:
                    continue
                if len(cols) == 2 and (METADATA_REGEX.match(cols[0]) or cols[0].endswith(":")):
                    row_text = f"{cols[0]} {cols[1]}"
                else:
                    row_text = " - ".join(cols)
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "metadata",
                    "en": row_text,
                    "question_numbers": extract_question_numbers(row_text),
                })
                sentence_id += 1
            tbl.decompose()

        # Headings
        headings = doc_node.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        for h in headings:
            htext = h.get_text().strip()
            if htext:
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "title",
                    "en": htext,
                    "question_numbers": extract_question_numbers(htext),
                })
                sentence_id += 1
            h.decompose()

        # Blocks (p, li)
        blocks = doc_node.find_all(["p", "li"])
        if not blocks:
            raw_text = doc_node.get_text()
            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        else:
            lines = []
            for b in blocks:
                b_lines = [l.strip() for l in b.get_text().split("\n") if l.strip()]
                lines.extend(b_lines)
                b.decompose()
            remaining = [l.strip() for l in doc_node.get_text().split("\n") if l.strip()]
            lines.extend(remaining)

        for line in lines:
            if not line:
                continue

            if METADATA_REGEX.match(line):
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "metadata",
                    "en": line, "question_numbers": extract_question_numbers(line),
                })
                sentence_id += 1
                continue

            if SALUTATION_REGEX.match(line) and len(line) < 60:
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "metadata",
                    "en": line, "question_numbers": extract_question_numbers(line),
                })
                sentence_id += 1
                continue

            if has_seen_paragraph and SIGNOFF_REGEX.match(line) and len(line) < 60:
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "sign_off",
                    "en": line, "question_numbers": extract_question_numbers(line),
                })
                sentence_id += 1
                continue

            if (
                has_seen_paragraph
                and len(line) < 50
                and not BLANK_REGEX.search(line)
                and len(all_items) > 0
                and all_items[-1]["type"] == "sign_off"
                and not line.endswith(".")
            ):
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "sign_off",
                    "en": line, "question_numbers": extract_question_numbers(line),
                })
                sentence_id += 1
                continue

            if (
                not has_seen_paragraph
                and len(line) < 60
                and not BLANK_REGEX.search(line)
                and not line.endswith((".", "!", "?"))
            ):
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "metadata",
                    "en": line, "question_numbers": extract_question_numbers(line),
                })
                sentence_id += 1
                continue

            for s in split_text_into_sentences(line):
                all_items.append({
                    "sentence_id": sentence_id, "doc_index": doc_idx, "type": "paragraph",
                    "en": s, "question_numbers": extract_question_numbers(s),
                })
                sentence_id += 1
                has_seen_paragraph = True

    return all_items


# ---------------------------------------------------------------------------
# Gemini translation & Multi-Model Pool
# ---------------------------------------------------------------------------
AVAILABLE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
]
_MODEL_LOCK = threading.Lock()
_CURRENT_MODEL_IDX = 0


def get_current_model() -> Optional[str]:
    with _MODEL_LOCK:
        if _CURRENT_MODEL_IDX >= len(AVAILABLE_MODELS):
            return None
        return AVAILABLE_MODELS[_CURRENT_MODEL_IDX]


def switch_to_next_model(failed_model: str) -> Optional[str]:
    global _CURRENT_MODEL_IDX
    with _MODEL_LOCK:
        if _CURRENT_MODEL_IDX < len(AVAILABLE_MODELS) and AVAILABLE_MODELS[_CURRENT_MODEL_IDX] == failed_model:
            _CURRENT_MODEL_IDX += 1
            if _CURRENT_MODEL_IDX >= len(AVAILABLE_MODELS):
                _log(logging.ERROR, "All available Gemini models have exhausted their daily quotas!")
                return None
            next_model = AVAILABLE_MODELS[_CURRENT_MODEL_IDX]
            _log(logging.WARNING, f"[QUOTA FAILOVER] Model '{failed_model}' daily quota reached. Switched to '{next_model}'!")
            return next_model
        if _CURRENT_MODEL_IDX >= len(AVAILABLE_MODELS):
            return None
        return AVAILABLE_MODELS[_CURRENT_MODEL_IDX]


def translate_items_with_gemini(
    client: "genai.Client",
    items: List[Dict[str, Any]],
    passage_title: str = "",
    max_retries: int = 5,
    rate_limiter: Optional[RateLimiter] = None,
) -> Optional[List[Dict[str, Any]]]:
    if not items:
        return []

    translation_payload = [
        {"sentence_id": it["sentence_id"], "en": it["en"]}
        for it in items
    ]

    prompt = f"""You are an expert English-to-Vietnamese translator specializing in TOEIC test reading passages.
Context/Title: "{passage_title}"
Translate each numbered English item below into accurate, natural, professional Vietnamese suitable for Vietnamese learners preparing for the TOEIC exam.

CRITICAL RULES:
1. Return EXACTLY 1 Vietnamese translation for each item, with the EXACT same sentence_id.
2. Keep the exact count of items ({len(items)} items in, {len(items)} items out). Do NOT merge sentences, split sentences, or skip any items.
3. Preserve all placeholder tokens like '______[139]', '------- (131)', '[1]', '— [133] —', URLs, phone numbers, and email addresses in the translation at the grammatically natural position.
4. For standalone placeholders (e.g. '______[141].' or '— [133] —.'), output the placeholder as is.
5. Translate metadata labels appropriately (e.g. 'To:' -> 'Đến:', 'From:' -> 'Từ:', 'Subject:' -> 'Chủ đề:', 'Date:' -> 'Ngày:', 'Re:' -> 'V/v:').

Items to translate:
{json.dumps(translation_payload, ensure_ascii=False, indent=2)}
"""

    for attempt in range(max_retries + 1):
        if rate_limiter is not None:
            rate_limiter.acquire()
        model_name = get_current_model()
        if not model_name:
            return None
        try:
            gen_kwargs = {
                "temperature": 0.1,
                "response_mime_type": "application/json",
                "response_schema": BatchTranslationResponse,
                "max_output_tokens": 8192,
            }
            if "gemini-3" in model_name:
                gen_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level="minimal")

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**gen_kwargs),
            )

            res = BatchTranslationResponse.model_validate_json(response.text)

            if len(res.pairs) != len(items):
                _log(logging.WARNING,
                     f"Attempt {attempt + 1}: length mismatch! Expected {len(items)}, got {len(res.pairs)}")
                time.sleep(2)
                continue

            vi_map = {p.sentence_id: p.vi.strip() for p in res.pairs}

            missing_ids = [
                it["sentence_id"] for it in items
                if it["sentence_id"] not in vi_map or not vi_map[it["sentence_id"]]
            ]
            if missing_ids:
                _log(logging.WARNING,
                     f"Attempt {attempt + 1}: missing or empty translations for sentence_ids: {missing_ids}")
                time.sleep(2)
                continue

            structured_pairs = []
            for it in items:
                sid = it["sentence_id"]
                structured_pairs.append({
                    "sentence_id": sid,
                    "en": it["en"],
                    "vi": vi_map[sid],
                    "question_numbers": it["question_numbers"],
                    "type": it["type"],
                    "doc_index": it["doc_index"],
                })

            return structured_pairs

        except Exception as e:
            err_str = str(e).lower()
            # Distinguish transient per-minute rate limit from daily quota exhaustion
            is_per_minute = "generaterequestsperminute" in err_str or "per minute" in err_str or "retrydelay" in err_str
            is_daily = ("generaterequestsperday" in err_str or "requests_per_day" in err_str) and not is_per_minute
            if is_daily:
                next_m = switch_to_next_model(model_name)
                if next_m is None:
                    _log(logging.ERROR, "All fallback models exhausted!")
                    return None
                time.sleep(1)
                continue
            elif "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                wait_sec = min(60, 20 * (2 ** attempt))  # exp backoff: 20, 40, 60, 60...
                delay_match = re.search(r"retrydelay['\":\s]+(\d+)", err_str)
                if delay_match:
                    wait_sec = int(delay_match.group(1)) + 2
                _log(logging.WARNING,
                     f"Rate limit 429 hit on {model_name}. Sleeping {wait_sec}s before retry (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait_sec)
            else:
                _log(logging.ERROR, f"Attempt {attempt + 1} failed with error: {e}")
                time.sleep(4)

    return None


# ---------------------------------------------------------------------------
# DeepL translation & Quota Tracking
# ---------------------------------------------------------------------------
_DEEPL_QUOTA_EXHAUSTED = threading.Event()


def log_deepl_usage(translator: "deepl.Translator") -> None:
    try:
        usage = translator.get_usage()
        if usage.character and usage.character.limit:
            count = usage.character.count
            limit = usage.character.limit
            pct = count * 100.0 / limit
            _log(logging.INFO, f"[DeepL Quota Usage] {count:,} / {limit:,} characters used ({pct:.1f}%)")
            if pct >= 90.0:
                _log(logging.WARNING, f"[CẢNH BÁO] DeepL quota đã vượt quá 90% hạn mức tháng! ({count:,}/{limit:,} - {pct:.1f}%)")
    except Exception as u_err:
        _log(logging.DEBUG, f"Không thể lấy DeepL usage: {u_err}")


def _call_deepl_with_formality(translator: "deepl.Translator", texts: List[str]):
    """Attempt translation with formality='more' (fallback to 'prefer_more' / default if unsupported)."""
    try:
        return translator.translate_text(
            texts,
            target_lang="VI",
            tag_handling="xml",
            ignore_tags=["keep"],
            preserve_formatting=True,
            formality="more",
        )
    except deepl.exceptions.DeepLException as e:
        err_msg = str(e).lower()
        if "formality" in err_msg:
            try:
                return translator.translate_text(
                    texts,
                    target_lang="VI",
                    tag_handling="xml",
                    ignore_tags=["keep"],
                    preserve_formatting=True,
                    formality="prefer_more",
                )
            except deepl.exceptions.DeepLException:
                return translator.translate_text(
                    texts,
                    target_lang="VI",
                    tag_handling="xml",
                    ignore_tags=["keep"],
                    preserve_formatting=True,
                )
        raise


def translate_items_with_deepl(
    translator: "deepl.Translator",
    items: List[Dict[str, Any]],
    passage_title: str = "",
    passage_id: str = "",
    max_retries: int = 3,
) -> Optional[List[Dict[str, Any]]]:
    if not items:
        return []

    if _DEEPL_QUOTA_EXHAUSTED.is_set():
        _log(logging.WARNING, f"Passage {passage_id}: Skipped because DeepL quota is exhausted.")
        return None

    # Step 2: Escape XML characters first (so email addresses like <user@domain> or & don't break XML parser)
    # Then wrap question blanks with <keep>...</keep> XML tags
    import html as html_lib
    prepared_texts = [
        BLANK_REGEX.sub(lambda m: f"<keep>{m.group(0)}</keep>", html_lib.escape(it["en"]))
        for it in items
    ]

    for attempt in range(max_retries + 1):
        if _DEEPL_QUOTA_EXHAUSTED.is_set():
            return None
        try:
            raw_results = _call_deepl_with_formality(translator, prepared_texts)
            if not isinstance(raw_results, list):
                raw_results = [raw_results]

            # Validate 1-to-1 matching
            if len(raw_results) != len(items):
                _log(logging.ERROR,
                     f"Passage {passage_id}: DeepL length mismatch! Expected {len(items)}, got {len(raw_results)}")
                return None

            # Clean up <keep>...</keep> tags from translated text and unescape XML entities
            structured_pairs = []
            for i, it in enumerate(items):
                raw_vi = raw_results[i].text
                clean_vi = html_lib.unescape(re.sub(r"</?keep>", "", raw_vi)).strip()
                structured_pairs.append({
                    "sentence_id": it["sentence_id"],
                    "en": it["en"],
                    "vi": clean_vi,
                    "question_numbers": it["question_numbers"],
                    "type": it["type"],
                    "doc_index": it["doc_index"],
                })

            # Step 5: Log quota usage after successful call
            log_deepl_usage(translator)

            return structured_pairs

        except deepl.exceptions.QuotaExceededException as q_err:
            _DEEPL_QUOTA_EXHAUSTED.set()
            _log(logging.CRITICAL, f"Đã hết quota DeepL free tier tháng này! Chi tiết: {q_err}")
            return None
        except deepl.exceptions.TooManyRequestsException as tmr_err:
            wait_sec = min(60, 10 * (2 ** attempt))
            _log(logging.WARNING,
                 f"DeepL TooManyRequests (429). Sleeping {wait_sec}s before retry (attempt {attempt + 1}/{max_retries})...")
            time.sleep(wait_sec)
        except Exception as e:
            _log(logging.ERROR, f"Passage {passage_id}: DeepL translation error on attempt {attempt + 1}: {e}")
            time.sleep(2)

    return None


# ---------------------------------------------------------------------------
# Google Cloud Translation API (v3 & v2)
# ---------------------------------------------------------------------------
def translate_items_with_google_v3(
    client: "translate.TranslationServiceClient",
    project_id: str,
    items: List[Dict[str, Any]],
    passage_id: str = "",
    location: str = "global",
    max_retries: int = 3,
) -> Optional[List[Dict[str, Any]]]:
    if not items:
        return []

    import html as html_lib
    parent = f"projects/{project_id}/locations/{location}"

    # Protect question blanks with <span translate="no">...</span>
    prepared_texts = [
        BLANK_REGEX.sub(lambda m: f'<span translate="no">{m.group(0)}</span>', html_lib.escape(it["en"]))
        for it in items
    ]

    for attempt in range(max_retries + 1):
        try:
            response = client.translate_text(
                request={
                    "parent": parent,
                    "contents": prepared_texts,
                    "mime_type": "text/html",
                    "source_language_code": "en",
                    "target_language_code": "vi",
                }
            )

            translated_texts = []
            for t in response.translations:
                raw_vi = t.translated_text
                cleaned_vi = re.sub(r"</?span[^>]*>", "", raw_vi)
                cleaned_vi = html_lib.unescape(cleaned_vi).strip()
                translated_texts.append(cleaned_vi)

            if len(translated_texts) != len(items):
                _log(logging.WARNING, f"Passage {passage_id}: Google v3 length mismatch: {len(translated_texts)} vs {len(items)}")
                time.sleep(2)
                continue

            structured_pairs = []
            for idx, it in enumerate(items):
                structured_pairs.append({
                    "sentence_id": it["sentence_id"],
                    "en": it["en"],
                    "vi": translated_texts[idx],
                    "question_numbers": it["question_numbers"],
                    "type": it["type"],
                    "doc_index": it["doc_index"],
                })
            return structured_pairs

        except Exception as e:
            _log(logging.ERROR, f"Passage {passage_id}: Google v3 error on attempt {attempt + 1}: {e}")
            time.sleep(3)

    return None


def translate_items_with_google_v2(
    api_key: str,
    items: List[Dict[str, Any]],
    passage_id: str = "",
    max_retries: int = 3,
) -> Optional[List[Dict[str, Any]]]:
    if not items:
        return []

    import html as html_lib
    prepared_texts = [
        BLANK_REGEX.sub(lambda m: f'<span translate="no">{m.group(0)}</span>', html_lib.escape(it["en"]))
        for it in items
    ]

    url = f"https://translation.googleapis.com/language/translate/v2?key={api_key}"
    payload = {
        "q": prepared_texts,
        "source": "en",
        "target": "vi",
        "format": "html",
    }

    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                translations = data.get("data", {}).get("translations", [])
                translated_texts = []
                for t in translations:
                    raw_vi = t.get("translatedText", "")
                    cleaned_vi = re.sub(r"</?span[^>]*>", "", raw_vi)
                    cleaned_vi = html_lib.unescape(cleaned_vi).strip()
                    translated_texts.append(cleaned_vi)

                if len(translated_texts) == len(items):
                    structured_pairs = []
                    for idx, it in enumerate(items):
                        structured_pairs.append({
                            "sentence_id": it["sentence_id"],
                            "en": it["en"],
                            "vi": translated_texts[idx],
                            "question_numbers": it["question_numbers"],
                            "type": it["type"],
                            "doc_index": it["doc_index"],
                        })
                    return structured_pairs
            _log(logging.ERROR, f"Passage {passage_id}: Google v2 HTTP {resp.status_code}: {resp.text}")
            time.sleep(3)
        except Exception as e:
            _log(logging.ERROR, f"Passage {passage_id}: Google v2 error on attempt {attempt + 1}: {e}")
            time.sleep(3)

    return None


# ---------------------------------------------------------------------------
# Ollama Local Translation (Qwen2.5-7B-Instruct)
# ---------------------------------------------------------------------------
def chunk_items(items: List[Dict[str, Any]], chunk_size: int = 10) -> List[List[Dict[str, Any]]]:
    """Split items into smaller chunks for local LLM context and JSON reliability."""
    if chunk_size <= 0:
        chunk_size = 10
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def _translate_single_ollama_chunk(
    client: "ollama.Client",
    chunk: List[Dict[str, Any]],
    model: str,
    passage_title: str = "",
    passage_id: str = "",
    num_gpu: int = 20,
    num_ctx: int = 1024,
    num_thread: int = 8,
    num_batch: int = 512,
) -> Optional[Dict[int, str]]:
    """Helper to translate a single chunk of items with Ollama, returning {sentence_id: vi}."""
    translation_payload = [
        {"sentence_id": it["sentence_id"], "en": it["en"]}
        for it in chunk
    ]

    prompt = f"""You are an expert English-to-Vietnamese translator specializing in TOEIC test reading passages.
Context/Title: "{passage_title}"
Translate each numbered English item below into accurate, natural, professional Vietnamese suitable for Vietnamese learners preparing for the TOEIC exam.

CRITICAL RULES:
1. Return EXACTLY 1 Vietnamese translation for each item, with the EXACT same sentence_id.
2. Keep the exact count of items ({len(chunk)} items in, {len(chunk)} items out). Do NOT merge sentences, split sentences, or skip any items.
3. Preserve all placeholder tokens like '______[139]', '------- (131)', '[1]', '— [133] —', URLs, phone numbers, and email addresses in the translation at the grammatically natural position.
4. For standalone placeholders (e.g. '______[141].' or '— [133] —.'), output the placeholder as is.
5. Translate metadata labels appropriately (e.g. 'To:' -> 'Đến:', 'From:' -> 'Từ:', 'Subject:' -> 'Chủ đề:', 'Date:' -> 'Ngày:', 'Re:' -> 'V/v:').

Output format MUST be valid JSON with this exact structure:
{{"pairs": [{{"sentence_id": 1, "vi": "Bản dịch câu 1"}}, ...]}}

Items to translate:
{json.dumps(translation_payload, ensure_ascii=False, indent=2)}
"""

    for active_gpu in ([num_gpu, 0] if num_gpu > 0 else [0]):
        try:
            response = client.chat(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                format="json",
                options={
                    "temperature": 0.1,
                    "num_gpu": active_gpu,
                    "num_ctx": num_ctx,
                    "num_thread": num_thread,
                    "num_batch": num_batch,
                },
            )
            content = response.message.content if hasattr(response, "message") else response.get("message", {}).get("content", "")
            clean_content = content.strip()
            if clean_content.startswith("```"):
                clean_content = re.sub(r"^```(?:json)?\s*", "", clean_content)
                clean_content = re.sub(r"\s*```$", "", clean_content)

            res = BatchTranslationResponse.model_validate_json(clean_content)
            vi_map = {p.sentence_id: p.vi.strip() for p in res.pairs if p.vi.strip()}

            if all(it["sentence_id"] in vi_map for it in chunk):
                return vi_map
            return None
        except Exception as e:
            err_msg = str(e).lower()
            if active_gpu > 0 and ("cuda" in err_msg or "overrun" in err_msg or "exit status" in err_msg or "500" in err_msg):
                _log(logging.WARNING, f"Passage {passage_id}: GPU offload issue (num_gpu={active_gpu}). Falling back to CPU (num_gpu=0)...")
                continue
            _log(logging.DEBUG, f"Passage {passage_id}: Ollama chunk parse error: {e}")
            return None

    return None


def translate_items_with_ollama(
    client: "ollama.Client",
    items: List[Dict[str, Any]],
    passage_title: str = "",
    passage_id: str = "",
    model: str = "qwen2.5:7b-instruct-q4_K_M",
    chunk_size: int = 10,
    num_gpu: int = 20,
    num_ctx: int = 1024,
    num_thread: int = 8,
    num_batch: int = 512,
    max_retries: int = 3,
) -> Optional[List[Dict[str, Any]]]:
    if not items:
        return []

    overall_vi_map: Dict[int, str] = {}
    chunks = chunk_items(items, chunk_size=chunk_size)

    for chunk_idx, chunk in enumerate(chunks):
        chunk_success = False
        for attempt in range(max_retries):
            vi_map = _translate_single_ollama_chunk(
                client,
                chunk,
                model,
                passage_title,
                passage_id,
                num_gpu=num_gpu,
                num_ctx=num_ctx,
                num_thread=num_thread,
                num_batch=num_batch,
            )
            if vi_map:
                overall_vi_map.update(vi_map)
                chunk_success = True
                break
            time.sleep(1)

        if not chunk_success:
            _log(logging.WARNING, f"Passage {passage_id}: Chunk {chunk_idx + 1}/{len(chunks)} of {len(chunk)} items failed. Subdividing...")
            subchunks = chunk_items(chunk, chunk_size=max(1, len(chunk) // 2))
            for sub in subchunks:
                sub_success = False
                for sub_attempt in range(max_retries):
                    sub_map = _translate_single_ollama_chunk(
                        client,
                        sub,
                        model,
                        passage_title,
                        passage_id,
                        num_gpu=num_gpu,
                        num_ctx=num_ctx,
                        num_thread=num_thread,
                        num_batch=num_batch,
                    )
                    if sub_map:
                        overall_vi_map.update(sub_map)
                        sub_success = True
                        break
                    time.sleep(1)

                if not sub_success:
                    _log(logging.WARNING, f"Passage {passage_id}: Subchunk of {len(sub)} items failed. Falling back to 1 item at a time...")
                    for single_it in sub:
                        if single_it["sentence_id"] in overall_vi_map:
                            continue
                        single_success = False
                        for single_attempt in range(max_retries):
                            single_map = _translate_single_ollama_chunk(
                                client,
                                [single_it],
                                model,
                                passage_title,
                                passage_id,
                                num_gpu=num_gpu,
                                num_ctx=num_ctx,
                                num_thread=num_thread,
                                num_batch=num_batch,
                            )
                            if single_map:
                                overall_vi_map.update(single_map)
                                single_success = True
                                break
                            time.sleep(1)
                        if not single_success:
                            _log(logging.ERROR, f"Passage {passage_id}: Failed to translate sentence_id {single_it['sentence_id']} after all retries.")
                            return None

    missing_ids = [it["sentence_id"] for it in items if it["sentence_id"] not in overall_vi_map]
    if missing_ids:
        _log(logging.ERROR, f"Passage {passage_id}: Missing sentence translations for IDs: {missing_ids}")
        return None

    model_label = f"ollama-{model.split(':')[0]}"
    structured_pairs = []
    for it in items:
        sid = it["sentence_id"]
        structured_pairs.append({
            "sentence_id": sid,
            "en": it["en"],
            "vi": overall_vi_map[sid],
            "question_numbers": it["question_numbers"],
            "type": it["type"],
            "doc_index": it["doc_index"],
            "translated_by": model_label,
        })

    return structured_pairs


# Lock for DB writes (defensive when db module uses a shared connection)
_DB_LOCK = threading.Lock()


def process_passage(
    translator_client: Any,
    passage: Dict[str, Any],
    dry_run: bool = False,
    provider: str = "deepl",
    rate_limiter: Optional[RateLimiter] = None,
    google_project_id: Optional[str] = None,
    ollama_model: str = "qwen2.5:7b-instruct-q4_K_M",
    chunk_size: int = 10,
    ollama_num_gpu: int = 20,
    ollama_num_ctx: int = 1024,
    ollama_num_thread: int = 8,
    ollama_num_batch: int = 512,
) -> Tuple[str, bool, str, float]:
    p_start = time.monotonic()
    if provider == "deepl" and _DEEPL_QUOTA_EXHAUSTED.is_set():
        return (passage["id"], False, "quota_exceeded", 0.0)

    pid = passage["id"]
    title = passage.get("title") or ""
    html = passage.get("passage_text") or ""

    if not html.strip():
        _log(logging.WARNING, f"Passage {pid} has empty passage_text, skipping.")
        return (pid, False, "empty_text", time.monotonic() - p_start)

    items = parse_passage_to_items(html)
    if not items:
        _log(logging.WARNING, f"Passage {pid} produced 0 items after parsing.")
        return (pid, False, "no_items", time.monotonic() - p_start)

    _log(logging.INFO, f"Translating passage {pid} ({len(items)} items, title='{title[:40]}') using {provider.upper()}...")
    default_label = "unknown"
    if provider == "deepl":
        pairs = translate_items_with_deepl(translator_client, items, passage_title=title, passage_id=pid)
        default_label = "deepl"
    elif provider == "ollama":
        pairs = translate_items_with_ollama(
            translator_client,
            items,
            passage_title=title,
            passage_id=pid,
            model=ollama_model,
            chunk_size=chunk_size,
            num_gpu=ollama_num_gpu,
            num_ctx=ollama_num_ctx,
            num_thread=ollama_num_thread,
            num_batch=ollama_num_batch,
        )
        default_label = f"ollama-{ollama_model.split(':')[0]}"
    elif provider in ("google_v3", "google"):
        pairs = translate_items_with_google_v3(translator_client, google_project_id or "", items, passage_id=pid)
        default_label = "google-translate"
    elif provider == "google_v2":
        pairs = translate_items_with_google_v2(translator_client, items, passage_id=pid)
        default_label = "google-translate"
    else:
        pairs = translate_items_with_gemini(translator_client, items, passage_title=title, rate_limiter=rate_limiter)
        default_label = "gemini"

    duration = time.monotonic() - p_start

    if not pairs:
        _log(logging.ERROR, f"Failed to translate passage {pid} after retries.")
        return (pid, False, "translate_failed", duration)

    for p in pairs:
        if "translated_by" not in p or not p["translated_by"]:
            p["translated_by"] = default_label

    if dry_run:
        _log(logging.INFO, f"[DRY-RUN] Passage {pid} translated into {len(pairs)} pairs in {duration:.1f}s (not saved, by {default_label}):")
        for p in pairs:
            _log(logging.INFO, f"  [{p['sentence_id']}] EN: {p['en']}")
            _log(logging.INFO, f"      VI: {p['vi']}")
        return (pid, True, "dry_run", duration)

    json_data = json.dumps(pairs, ensure_ascii=False)
    try:
        with _DB_LOCK:
            db.execute(
                "UPDATE passages SET passage_sentence_pairs = %s WHERE id = %s",
                (json_data, pid),
            )
        _log(logging.INFO, f"Saved passage {pid} ({len(pairs)} pairs, {duration:.1f}s, by {default_label}) to DB.")
        return (pid, True, "saved", duration)
    except Exception as err:
        _log(logging.ERROR, f"Failed to save passage {pid} to DB: {err}")
        return (pid, False, "db_error", duration)


# ---------------------------------------------------------------------------
# Curated sample list
# ---------------------------------------------------------------------------
def get_curated_sample_passages() -> List[str]:
    return [
        "8506fdcd-ef86-4810-be0f-d85343f0a1d7",
        "21bd1343-3611-46bc-a9bd-42f09970b590",
        "ef9f4a03-6e7a-497a-b98e-d3a408144aff",
        "e5d6bb84-4696-4912-aff9-9ce726043ed9",
        "046abf5b-0f37-4e26-bee8-1e835e5c7770",
        "6f4bb1b7-fa5e-4b40-9b6a-165d70f89125",
        "00f54007-35a3-4cb6-9481-d88fa25ab8b7",
        "00d7c5da-29b0-4b34-b72b-a53621e542e1",
        "0178c951-5bc2-4c0c-ac4a-942015f21101",
        "04bebd4d-48c1-4364-8b35-1197af50f7a5",
        "00188823-c39d-49da-917a-29026b478029",
        "003c4fe2-3082-464d-a219-b68a920ecf8f",
        "007da362-687f-4eee-bab0-1f93bb1aaa39",
        "00c9f5ed-101b-43e9-995a-d2df901e18bd",
        "0104dca2-cf99-4a79-8064-5d348a49d527",
        "016ce448-7067-4380-8a84-c06402e4521b",
        "018c5cc1-29cf-463c-8c0e-5f1ebd161f75",
        "01df6ee4-6209-45cb-957b-6f830d8efaf8",
        "025b7071-8130-4c80-8aa0-b61baefe9b09",
        "02f000e3-52bb-4593-be56-a1a1e48cc497",
        "0507a272-5645-4202-b258-3932ee5d989f",
        "0b53c7c2-5555-4927-994c-cb141df904ea",
        "1a78e718-d9d8-4f2a-89a3-5c21fecda46e",
        "0c1435a1-b02f-4e90-8e02-afd8c93b746f",
        "0b982d49-755e-4e55-aa5e-4cb4b865d57b",
    ]


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------
def verify_stored_sentence_pairs(passage_ids: Optional[List[str]] = None) -> None:
    logger.info("Verifying stored passage_sentence_pairs...")
    query = "SELECT id, title, passage_sentence_pairs FROM passages WHERE passage_sentence_pairs IS NOT NULL"
    params = ()
    if passage_ids:
        placeholders = ",".join(["%s"] * len(passage_ids))
        query += f" AND id IN ({placeholders})"
        params = tuple(passage_ids)

    rows = db.fetch_all(query, params)
    logger.info(f"Found {len(rows)} passages with stored passage_sentence_pairs.")

    total_pairs = 0
    issues = 0
    translated_by_stats: Dict[str, int] = {}
    passage_by_stats: Dict[str, int] = {}

    for r in rows:
        pid = r["id"]
        raw = r["passage_sentence_pairs"]
        try:
            pairs = json.loads(raw) if isinstance(raw, str) else raw
        except Exception as e:
            logger.error(f"Passage {pid}: Invalid JSON: {e}")
            issues += 1
            continue

        if not isinstance(pairs, list) or len(pairs) == 0:
            logger.error(f"Passage {pid}: Empty or invalid pairs array")
            issues += 1
            continue

        total_pairs += len(pairs)
        passage_providers = set()

        for p in pairs:
            sid = p.get("sentence_id")
            en = p.get("en", "")
            vi = p.get("vi", "")
            ptype = p.get("type", "")
            tb = p.get("translated_by", "unspecified/legacy")
            translated_by_stats[tb] = translated_by_stats.get(tb, 0) + 1
            passage_providers.add(tb)

            if not en or not vi:
                logger.error(f"Passage {pid}, Item {sid}: Empty en or vi text!")
                issues += 1
            if not sid or ptype not in ("paragraph", "metadata", "title", "sign_off"):
                logger.error(f"Passage {pid}, Item {sid}: Invalid schema (type={ptype})")
                issues += 1

        for prov in passage_providers:
            passage_by_stats[prov] = passage_by_stats.get(prov, 0) + 1

    logger.info(f"Verification complete: {len(rows)} passages, {total_pairs} pairs. Issues: {issues}")
    logger.info("==========================================")
    logger.info("Sentence pairs distribution by provider:")
    for prov, count in sorted(translated_by_stats.items(), key=lambda x: -x[1]):
        pct = (count * 100.0) / max(1, total_pairs)
        logger.info(f"  - {prov}: {count:,} pairs ({pct:.1f}%) across {passage_by_stats.get(prov, 0)} passages")
    logger.info("==========================================")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Batch translate reading passages into structured sentence pairs.")
    parser.add_argument("--dry-run", action="store_true", help="Run without saving to DB")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of passages to translate")
    parser.add_argument("--passage-id", type=str, default=None, help="Translate a specific passage by ID")
    parser.add_argument("--test-id", type=str, default=None, help="Translate passages for a specific test ID")
    parser.add_argument("--part", type=int, choices=[6, 7], default=None, help="Filter by Part (6 or 7)")
    parser.add_argument("--resume", action="store_true", help="Skip passages that already have passage_sentence_pairs")
    parser.add_argument("--force", action="store_true", help="Re-translate even if passage_sentence_pairs exists")
    parser.add_argument("--sample", action="store_true", help="Run on curated 25 representative passages")
    parser.add_argument("--verify", action="store_true", help="Verify stored sentence pairs data integrity")
    parser.add_argument("--provider", type=str, choices=["deepl", "gemini", "ollama", "google_v3", "google", "google_v2"], default="ollama",
                        help="Translation provider ('ollama', 'deepl', 'gemini', 'google_v3', 'google', 'google_v2'). Default: ollama.")
    parser.add_argument("--ollama-model", type=str, default="qwen2.5:7b-instruct-q4_K_M",
                        help="Ollama model tag to use (default: qwen2.5:7b-instruct-q4_K_M).")
    parser.add_argument("--chunk-size", type=int, default=10,
                        help="Sentence chunk size for Ollama local translation (default: 10).")
    parser.add_argument("--ollama-num-gpu", type=int, default=20,
                        help="Number of GPU layers to offload in Ollama (default: 20 for 4GB VRAM, set 0 for pure CPU).")
    parser.add_argument("--ollama-num-ctx", type=int, default=1024,
                        help="Context window size in tokens for Ollama (default: 1024).")
    parser.add_argument("--ollama-num-thread", type=int, default=8,
                        help="Number of CPU worker threads for Ollama (default: 8 physical cores).")
    parser.add_argument("--ollama-num-batch", type=int, default=512,
                        help="Batch size for prompt evaluation in Ollama (default: 512).")
    parser.add_argument("--credentials", type=str, default=None,
                        help="Path to Google Cloud service account JSON file (for google_v3).")
    parser.add_argument("--project", type=str, default=None,
                        help="Google Cloud project ID (for google_v3).")
    parser.add_argument("--google-api-key", type=str, default=None,
                        help="Google Translate API Key (for google_v2).")
    parser.add_argument("--workers", type=int, default=4,
                        help="Number of parallel worker threads (default 4). Match with RPM.")
    parser.add_argument("--rpm", type=int, default=15,
                        help="Global Gemini calls-per-minute cap (default 15 = free tier).")
    parser.add_argument("--model", type=str, default=None,
                        help="Starting Gemini model (e.g. gemini-2.5-flash-lite, gemini-2.5-flash, gemini-3.5-flash).")

    args = parser.parse_args()

    if args.verify:
        verify_stored_sentence_pairs()
        return

    # Worker forcing for Ollama (local GPU limitation)
    if args.provider == "ollama":
        if args.workers != 1:
            logger.warning(
                f"Ollama provider chỉ hỗ trợ chạy tuần tự (1 worker) vì dùng chung GPU cục bộ. "
                f"Đã tự động chuyển từ {args.workers} worker(s) -> 1 worker."
            )
            args.workers = 1

    if args.model:
        if args.model in AVAILABLE_MODELS:
            AVAILABLE_MODELS.remove(args.model)
            AVAILABLE_MODELS.insert(0, args.model)
        else:
            AVAILABLE_MODELS.insert(0, args.model)
        logger.info(f"Using starting Gemini model: {args.model}")

    # Provider initialization
    rate_limiter = None
    google_project_id = None

    if args.provider == "ollama":
        if ollama is None:
            logger.error("Thư viện 'ollama' chưa được cài đặt! Vui lòng chạy: pip install ollama")
            sys.exit(1)
        try:
            translator_client = ollama.Client()
            model_resp = translator_client.list()
            models_list = model_resp.models if hasattr(model_resp, "models") else model_resp.get("models", [])
            avail_names = [m.model if hasattr(m, "model") else m.get("model", "") for m in models_list]
            logger.info(f"Ollama connected successfully. Available models: {avail_names}")
            match_found = any(args.ollama_model in name or name in args.ollama_model for name in avail_names)
            if not match_found:
                logger.warning(
                    f"Model '{args.ollama_model}' chưa có sẵn trong Ollama local! "
                    f"Vui lòng chạy lệnh sau trên terminal để tải model: ollama pull {args.ollama_model}"
                )
        except Exception as e:
            logger.error(f"Không thể kết nối tới Ollama server: {e}")
            logger.error("Vui lòng đảm bảo Ollama server đang chạy. Hãy mở terminal và khởi động: ollama serve")
            sys.exit(1)

    elif args.provider in ("google_v3", "google"):
        if translate is None:
            logger.error("Thư viện 'google-cloud-translate' chưa được cài đặt! Vui lòng chạy: pip install google-cloud-translate")
            sys.exit(1)

        creds_path = args.credentials or config.GOOGLE_APPLICATION_CREDENTIALS or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        proj_id = args.project or config.GOOGLE_CLOUD_PROJECT or os.environ.get("GOOGLE_CLOUD_PROJECT")

        if creds_path and os.path.exists(creds_path):
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    sa_info = json.load(f)
                    if not proj_id and "project_id" in sa_info:
                        proj_id = sa_info["project_id"]
                translator_client = translate.TranslationServiceClient.from_service_account_json(creds_path)
                logger.info(f"Initialized Google Cloud Translation v3 with service account: {creds_path}")
            except Exception as e:
                logger.error(f"Failed to load service account credentials from {creds_path}: {e}")
                sys.exit(1)
        else:
            try:
                translator_client = translate.TranslationServiceClient()
                logger.info("Initialized Google Cloud Translation v3 with default ADC credentials.")
            except Exception as e:
                logger.error("Chưa cấu hình xác thực cho Google Cloud Translation v3!")
                logger.error("Vui lòng cung cấp Service Account JSON qua:")
                logger.error("  1. File credentials.json và đặt biến GOOGLE_APPLICATION_CREDENTIALS trong file .env")
                logger.error("  2. Hoặc chạy lệnh với: --credentials <path_to_service_account.json> --project <gcp_project_id>")
                sys.exit(1)

        if not proj_id:
            logger.error("Thiếu GOOGLE_CLOUD_PROJECT! Vui lòng chỉ định qua --project hoặc thêm GOOGLE_CLOUD_PROJECT vào .env.")
            sys.exit(1)

        google_project_id = proj_id
        logger.info(f"Google Cloud Translation v3 ready for project: '{google_project_id}'")

    elif args.provider == "google_v2":
        api_key = args.google_api_key or config.GOOGLE_TRANSLATE_API_KEY or config.GEMINI_API_KEY
        if not api_key:
            logger.error("Thiếu Google Translate API key! Vui lòng cấu hình GOOGLE_TRANSLATE_API_KEY hoặc truyền --google-api-key.")
            sys.exit(1)
        translator_client = api_key
        logger.info("Initialized Google Cloud Translation v2 (REST API).")

    elif args.provider == "deepl":
        if deepl is None:
            logger.error("Thư viện 'deepl' chưa được cài đặt! Vui lòng chạy: pip install deepl")
            sys.exit(1)
        if not config.DEEPL_API_KEY:
            logger.error("DEEPL_API_KEY chưa được cấu hình! Vui lòng thêm DEEPL_API_KEY vào file .env hoặc biến môi trường.")
            sys.exit(1)
        try:
            translator_client = deepl.Translator(config.DEEPL_API_KEY)
            logger.info("DeepL Translator initialized successfully.")
            log_deepl_usage(translator_client)
        except Exception as err:
            logger.error(f"Khởi tạo DeepL Translator thất bại: {err}")
            sys.exit(1)
    else:
        if genai is None:
            logger.error("Thư viện 'google-genai' chưa được cài đặt!")
            sys.exit(1)
        if not config.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set in config!")
            sys.exit(1)
        translator_client = genai.Client(api_key=config.GEMINI_API_KEY)
        rate_limiter = RateLimiter(args.rpm)

    # Determine passages to process
    if args.sample:
        target_ids = get_curated_sample_passages()
        placeholders = ",".join(["%s"] * len(target_ids))
        passages = db.fetch_all(
            f"SELECT id, test_id, part, title, passage_text, passage_sentence_pairs FROM passages WHERE id IN ({placeholders})",
            tuple(target_ids),
        )
    elif args.passage_id:
        passages = db.fetch_all(
            "SELECT id, test_id, part, title, passage_text, passage_sentence_pairs FROM passages WHERE id = %s",
            (args.passage_id,),
        )
    elif args.test_id:
        passages = db.fetch_all(
            "SELECT id, test_id, part, title, passage_text, passage_sentence_pairs FROM passages WHERE test_id = %s AND part IN (6, 7) ORDER BY order_index ASC",
            (args.test_id,),
        )
    else:
        query = "SELECT id, test_id, part, title, passage_text, passage_sentence_pairs FROM passages WHERE part IN (6, 7)"
        params = []
        if args.part:
            query += " AND part = %s"
            params.append(args.part)
        query += " ORDER BY part ASC, id ASC"
        if args.limit:
            query += f" LIMIT {args.limit}"
        passages = db.fetch_all(query, tuple(params))

    logger.info(f"Found {len(passages)} candidate passages to process.")

    # Filter out already-translated passages first (so we don't waste threads)
    to_process = []
    skip_count = 0
    for p in passages:
        has_existing = p.get("passage_sentence_pairs") is not None
        if has_existing and not args.force and not args.dry_run and (args.resume or not args.passage_id):
            skip_count += 1
            continue
        to_process.append(p)

    logger.info(f"To process: {len(to_process)} passages | Skipped: {skip_count} | Provider: {args.provider.upper()} | Workers: {args.workers}")

    success_count = 0
    error_count = 0
    start_time = time.monotonic()

    if to_process:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            future_map = {
                executor.submit(
                    process_passage,
                    translator_client,
                    p,
                    args.dry_run,
                    args.provider,
                    rate_limiter,
                    google_project_id,
                    args.ollama_model,
                    args.chunk_size,
                    args.ollama_num_gpu,
                    args.ollama_num_ctx,
                    args.ollama_num_thread,
                    args.ollama_num_batch,
                ): p
                for p in to_process
            }
            passage_durations = []
            completed = 0
            total = len(to_process)
            for fut in concurrent.futures.as_completed(future_map):
                if args.provider == "deepl" and _DEEPL_QUOTA_EXHAUSTED.is_set():
                    logger.critical("Dừng toàn bộ batch do đã hết quota DeepL free tier tháng này!")
                    break
                if args.provider == "gemini" and get_current_model() is None:
                    logger.critical("Dừng toàn bộ batch do tất cả Gemini models đã hết daily quota!")
                    break

                passage = future_map[fut]
                pid = passage["id"]
                completed += 1
                try:
                    _, ok, reason, duration = fut.result()
                    passage_durations.append(duration)
                except Exception as e:
                    _log(logging.ERROR, f"[{completed}/{total}] Passage {pid} crashed: {e}")
                    error_count += 1
                    continue

                if ok:
                    success_count += 1
                else:
                    error_count += 1

                avg_dur = sum(passage_durations) / len(passage_durations) if passage_durations else 0.0
                rem = total - completed
                eta_min = (rem * avg_dur) / 60.0
                _log(logging.INFO,
                     f"--- Progress: {completed}/{total} done | success={success_count} fail={error_count} | last={pid} ({reason}) | avg={avg_dur:.1f}s/passage | ETA={eta_min:.1f}m ---")

    elapsed = time.monotonic() - start_time
    avg_speed = elapsed / max(1, completed) if completed else 0.0
    logger.info("\n==========================================")
    logger.info(f"Batch Translation Finished in {elapsed:.1f}s: "
                f"{success_count} succeeded, {skip_count} skipped, {error_count} failed.")
    logger.info(f"Average speed: {avg_speed:.1f}s / passage.")
    logger.info("==========================================")


if __name__ == "__main__":
    main()