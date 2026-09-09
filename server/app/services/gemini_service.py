import asyncio
import hashlib
import json
import re
from collections import OrderedDict
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    import lemminflect
except ImportError:
    lemminflect = None

from app import config
from app.db import db


class TranslationExample(BaseModel):
    en: str = Field(description="A natural English example using the selected word")
    vi: str = Field(description="Vietnamese translation of the example")


class GeminiWordResult(BaseModel):
    source_text: str
    translated_text: str = Field(description="Concise Vietnamese meanings, ordered by relevance")
    phonetic: str = Field(description="General IPA pronunciation between slashes")
    phonetic_us: Optional[str] = Field(None, description="American English (US) IPA pronunciation between slashes, e.g. /əˈkɑː.mə.deɪt/")
    phonetic_uk: Optional[str] = Field(None, description="British English (UK) IPA pronunciation between slashes, e.g. /əˈkɒm.ə.deɪt/")
    part_of_speech: str = Field(description="English part of speech, e.g. noun, verb")
    definition_en: str = Field(description="Short, learner-friendly English definition")
    examples: List[TranslationExample]
    synonyms: List[str] = Field(description="Up to four common English synonyms")

class CollocationItem(BaseModel):
    phrase: str
    meaning_vi: str


class CollocationResult(BaseModel):
    items: List[CollocationItem] = Field(min_length=2, max_length=4)


class ExtendedExample(BaseModel):
    en: str
    vi: str
    level: str
    context: str


class ExampleResult(BaseModel):
    items: List[ExtendedExample] = Field(min_length=2, max_length=3)


class SynonymResult(BaseModel):
    items: List[str] = Field(min_length=3, max_length=5)


class WordFamilyItem(BaseModel):
    word: str
    part_of_speech: str
    phonetic: str


class WordFamilyResult(BaseModel):
    items: List[WordFamilyItem] = Field(min_length=1, max_length=6)


DictionaryDetailSection = Literal["collocations", "examples", "synonyms", "wordFamily"]


class GeminiTranslationService:
    def __init__(self):
        self.memory_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.passage_vocabulary_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.max_ram_cache_size = config.RAM_CACHE_MAX_SIZE
        self.semaphore = asyncio.Semaphore(config.MAX_GEMINI_CONCURRENCY)
        self.client = (
            genai.Client(api_key=config.GEMINI_API_KEY)
            if genai and config.GEMINI_API_KEY
            else None
        )
        self.stats = {
            "total_requests": 0,
            "memory_cache_hits": 0,
            "system_vocabulary_hits": 0,
            "mysql_cache_hits": 0,
            "passage_cache_hits": 0,
            "passage_prewarms": 0,
            "gemini_api_calls": 0,
            "dictionary_detail_calls": 0,
            "errors": 0,
            "last_error": None,
        }

    @staticmethod
    def _compute_hash(text: str, src_lang: str, target_lang: str, context: str = "") -> str:
        raw = f"{text.strip().lower()}:{src_lang}:{target_lang}:{context.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _get_from_memory_cache(self, text_hash: str) -> Optional[Dict[str, Any]]:
        if text_hash not in self.memory_cache:
            return None
        self.memory_cache.move_to_end(text_hash)
        self.stats["memory_cache_hits"] += 1
        return {
            **self.memory_cache[text_hash],
            "cached": True,
            "cache_source": "memory",
        }

    def _save_to_memory_cache(self, text_hash: str, data: Dict[str, Any]) -> None:
        if len(self.memory_cache) >= self.max_ram_cache_size:
            self.memory_cache.popitem(last=False)
        self.memory_cache[text_hash] = data

    def _format_system_vocabulary_record(
        self,
        record: Dict[str, Any],
        query_word: str,
        lemma_word: Optional[str] = None,
    ) -> Dict[str, Any]:
        raw_phonetic = record.get("ipa") or ""
        phonetic_us = ""
        phonetic_uk = ""
        if "UK:" in raw_phonetic and "US:" in raw_phonetic:
            uk_m = re.search(r"UK:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            us_m = re.search(r"US:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            if uk_m:
                phonetic_uk = uk_m.group(1)
            if us_m:
                phonetic_us = us_m.group(1)
        if not phonetic_us:
            phonetic_us = raw_phonetic
        if not phonetic_uk:
            phonetic_uk = raw_phonetic

        examples = []
        if record.get("example_en"):
            examples.append({
                "en": record["example_en"],
                "vi": record.get("example_vi") or "",
            })
        elif record.get("example_toeic"):
            toeic_ex = self._parse_json(record["example_toeic"], None)
            if isinstance(toeic_ex, dict) and toeic_ex.get("en"):
                examples.append({
                    "en": toeic_ex["en"],
                    "vi": toeic_ex.get("vi") or "",
                })

        synonyms = self._parse_json(record.get("synonyms"), [])
        if isinstance(synonyms, list):
            synonyms = [s for s in synonyms if isinstance(s, str)][:4]
        else:
            synonyms = []

        formatted: Dict[str, Any] = {
            "source_text": query_word,
            "translated_text": record.get("meaning_vi", ""),
            "phonetic": raw_phonetic,
            "phonetic_us": phonetic_us,
            "phonetic_uk": phonetic_uk,
            "audio_us": record.get("audio_us") or "",
            "audio_uk": record.get("audio_uk") or "",
            "part_of_speech": record.get("part_of_speech", ""),
            "definition_en": record.get("definition_en", ""),
            "examples": examples,
            "synonyms": synonyms,
            "cached": True,
            "cache_source": "system_vocabulary",
        }
        if lemma_word and lemma_word.lower() != query_word.lower():
            formatted["lemma"] = lemma_word
        return formatted

    def _fetch_system_vocab_row(self, word: str) -> Optional[Dict[str, Any]]:
        return db.fetch_one(
            """
            SELECT word, ipa, cefr, part_of_speech, meaning_vi, definition_en, 
                   example_en, example_vi, example_toeic, audio_us, audio_uk, 
                   synonyms, word_family, phrases
            FROM system_vocabulary_words 
            WHERE word = ? 
            ORDER BY (set_id IN ('1e3e6ebb-26a1-52f6-bdc5-1d743722fae2', '21793dec-3c53-4e8b-923a-72a2a3bf491a')) DESC, order_index ASC 
            LIMIT 1
            """,
            (word,),
            use_cache=False,
        )

    def _find_system_vocabulary_record(self, word: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*").lower()
        if not clean_word or len(clean_word.split()) > 4:
            return None, None

        # 1. Exact match in system_vocabulary_words
        record = self._fetch_system_vocab_row(clean_word)
        if record:
            return record, clean_word

        # 2. Inflection table match (precomputed via LemmInflect offline)
        try:
            inflection = db.fetch_one(
                "SELECT lemma_word FROM word_inflections WHERE inflected_form = ? LIMIT 1",
                (clean_word,),
                use_cache=False,
            )
            if inflection and inflection.get("lemma_word"):
                lemma = inflection["lemma_word"].strip().lower()
                record = self._fetch_system_vocab_row(lemma)
                if record:
                    return record, lemma
        except Exception as err:
            print(f"[!] word_inflections lookup error: {err}")

        # 3. Dynamic NLP Lemmatization via lemminflect fallback
        if lemminflect:
            try:
                lemmas_dict = lemminflect.getAllLemmas(clean_word)
                candidate_lemmas = []
                for pos, lemmas in lemmas_dict.items():
                    for l in lemmas:
                        l_clean = l.strip().lower()
                        if l_clean not in candidate_lemmas and l_clean != clean_word:
                            candidate_lemmas.append(l_clean)
                for cand in candidate_lemmas:
                    record = self._fetch_system_vocab_row(cand)
                    if record:
                        try:
                            db.execute(
                                "INSERT IGNORE INTO word_inflections (inflected_form, lemma_word, inflection_type) VALUES (?, ?, ?)",
                                (clean_word, cand, "DYNAMIC"),
                            )
                        except Exception:
                            pass
                        return record, cand
            except Exception as err:
                print(f"[!] lemminflect runtime lookup error: {err}")

        return None, None

    def _lookup_system_vocabulary(self, word: str) -> Optional[Dict[str, Any]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*")
        if not clean_word:
            return None
        try:
            record, lemma = self._find_system_vocabulary_record(clean_word)
            if not record:
                return None
            return self._format_system_vocabulary_record(record, clean_word, lemma)
        except Exception as error:
            print(f"[!] System vocabulary lookup failed: {error}")
            return None

    def _lookup_system_vocabulary_detail(
        self,
        word: str,
        section: DictionaryDetailSection,
    ) -> Optional[Dict[str, Any]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*")
        if not clean_word or len(clean_word.split()) > 4:
            return None
        try:
            record, lemma = self._find_system_vocabulary_record(clean_word)
            if not record:
                return None

            if section == "collocations":
                phrases_data = self._parse_json(record.get("phrases"), [])
                if isinstance(phrases_data, list) and phrases_data:
                    items = []
                    for item in phrases_data:
                        if isinstance(item, dict) and item.get("phrase"):
                            items.append({
                                "phrase": item["phrase"],
                                "meaningVi": item.get("meaning") or item.get("meaningVi") or "",
                            })
                    if items:
                        return {
                            "source_text": clean_word,
                            "lemma": lemma,
                            "section": section,
                            "items": items,
                            "cached": True,
                            "cache_source": "system_vocabulary",
                        }

            elif section == "synonyms":
                synonyms_data = self._parse_json(record.get("synonyms"), [])
                if isinstance(synonyms_data, list) and synonyms_data:
                    valid_synonyms = [s for s in synonyms_data if isinstance(s, str) and s.strip()]
                    if valid_synonyms:
                        return {
                            "source_text": clean_word,
                            "lemma": lemma,
                            "section": section,
                            "items": valid_synonyms[:5],
                            "cached": True,
                            "cache_source": "system_vocabulary",
                        }

            elif section == "wordFamily":
                wf_data = self._parse_json(record.get("word_family"), [])
                if isinstance(wf_data, list) and wf_data:
                    items = []
                    for item in wf_data:
                        if isinstance(item, dict) and item.get("word"):
                            items.append({
                                "word": item["word"],
                                "partOfSpeech": item.get("pos") or item.get("part_of_speech") or "",
                                "phonetic": item.get("ipa") or item.get("phonetic") or "",
                            })
                    if items:
                        return {
                            "source_text": clean_word,
                            "lemma": lemma,
                            "section": section,
                            "items": items,
                            "cached": True,
                            "cache_source": "system_vocabulary",
                        }

            elif section == "examples":
                examples_items = []
                if record.get("example_toeic"):
                    toeic_ex = self._parse_json(record["example_toeic"], None)
                    if isinstance(toeic_ex, dict) and toeic_ex.get("en"):
                        examples_items.append({
                            "en": toeic_ex["en"],
                            "vi": toeic_ex.get("vi") or "",
                            "level": record.get("cefr") or "TOEIC",
                            "context": "TOEIC Exam",
                        })
                if record.get("example_en"):
                    examples_items.append({
                        "en": record["example_en"],
                        "vi": record.get("example_vi") or "",
                        "level": record.get("cefr") or "Intermediate",
                        "context": "Workplace & Daily Life",
                    })
                if examples_items:
                    return {
                        "source_text": clean_word,
                        "lemma": lemma,
                        "section": section,
                        "items": examples_items,
                        "cached": True,
                        "cache_source": "system_vocabulary",
                    }

            return None
        except Exception as error:
            print(f"[!] System vocabulary detail lookup failed: {error}")
            return None

    def _format_database_cache_result(self, database_result: Dict[str, Any], text: str) -> Dict[str, Any]:
        raw_phonetic = database_result.get("phonetic", "")
        phonetic_us = ""
        phonetic_uk = ""
        if "UK:" in raw_phonetic and "US:" in raw_phonetic:
            uk_m = re.search(r"UK:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            us_m = re.search(r"US:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            if uk_m:
                phonetic_uk = uk_m.group(1)
            if us_m:
                phonetic_us = us_m.group(1)
        return {
            "source_text": database_result.get("source_text", text),
            "translated_text": database_result.get("translated_text", ""),
            "phonetic": raw_phonetic,
            "phonetic_us": phonetic_us or raw_phonetic,
            "phonetic_uk": phonetic_uk or raw_phonetic,
            "part_of_speech": database_result.get("part_of_speech", ""),
            "definition_en": database_result.get("definition_en", ""),
            "examples": self._parse_json(database_result.get("examples"), []),
            "synonyms": self._parse_json(database_result.get("synonyms"), []),
            "cached": True,
            "cache_source": "mysql",
        }

    async def translate_text(
        self,
        text: str,
        src_lang: str = "en",
        target_lang: str = "vi",
        context: str = "TOEIC",
    ) -> Dict[str, Any]:
        self.stats["total_requests"] += 1
        clean_text = text.strip()
        is_generic_context = not context or context.strip().lower() in ("toeic", "general", "default", "")
        context_hash = self._compute_hash(clean_text, src_lang, target_lang, context)
        word_only_hash = self._compute_hash(clean_text, src_lang, target_lang, "")

        # Tier 1: In-Memory RAM Cache (check context hash, then word-only hash if generic)
        memory_result = self._get_from_memory_cache(context_hash)
        if not memory_result and is_generic_context:
            memory_result = self._get_from_memory_cache(word_only_hash)
        if memory_result:
            return memory_result

        # Tier 2: Local MySQL System Vocabulary + Lemmatization (ultra-fast 2ms lookup)
        if src_lang == "en" and target_lang == "vi":
            system_result = await asyncio.to_thread(self._lookup_system_vocabulary, clean_text)
            if system_result:
                self.stats["system_vocabulary_hits"] += 1
                self._save_to_memory_cache(context_hash, system_result)
                self._save_to_memory_cache(word_only_hash, system_result)
                return system_result

        # Tier 3: MySQL translation_cache (check context hash, then word-only hash fallback if generic)
        database_result = await asyncio.to_thread(self._get_database_cache, context_hash)
        if not database_result and is_generic_context and context_hash != word_only_hash:
            database_result = await asyncio.to_thread(self._get_database_cache, word_only_hash)

        if database_result:
            self.stats["mysql_cache_hits"] += 1
            result = self._format_database_cache_result(database_result, clean_text)
            self._save_to_memory_cache(context_hash, result)
            if is_generic_context:
                self._save_to_memory_cache(word_only_hash, result)
            return result

        # Tier 4: Gemini API fallback with Concurrency Semaphore
        if not self.client:
            self.stats["errors"] += 1
            error = (
                "Máy chủ chưa cài google-genai. Hãy chạy pip install -r requirements.txt."
                if genai is None
                else "GEMINI_API_KEY chưa được cấu hình trên máy chủ."
            )
            return {
                "source_text": clean_text,
                "error": error,
                "cached": False,
                "cache_source": "error",
            }

        async with self.semaphore:
            self.stats["gemini_api_calls"] += 1
            try:
                result = await asyncio.to_thread(
                    self._call_gemini_api,
                    clean_text,
                    src_lang,
                    target_lang,
                    context,
                )
            except Exception as error:
                self.stats["errors"] += 1
                error_type = type(error).__name__
                error_message = str(error)
                self.stats["last_error"] = {
                    "type": error_type,
                    "message": error_message[:500],
                }
                print(f"[!] Gemini API exception ({error_type}): {error_message}")
                return {
                    "source_text": clean_text,
                    "error": self._friendly_error(error),
                    "cached": False,
                    "cache_source": "error",
                }

        result.update({
            "source_lang": src_lang,
            "target_lang": target_lang,
            "cached": False,
            "cache_source": "gemini_api",
        })
        self._save_to_memory_cache(context_hash, result)
        asyncio.create_task(asyncio.to_thread(self._save_database_cache, context_hash, result))
        if is_generic_context and context_hash != word_only_hash:
            self._save_to_memory_cache(word_only_hash, result)
            asyncio.create_task(asyncio.to_thread(self._save_database_cache, word_only_hash, result))
        return result

    def get_passage_vocabulary(self, passage_id: str) -> Dict[str, Any]:
        """
        Pre-warms and retrieves vocabulary for a passage by passage_id.
        Extracts all English tokens, performs batch queries against system vocabulary
        and word inflections, pre-populates memory cache, and returns a dict mapping
        normalized words to formatted WordTranslation objects.
        """
        if not passage_id:
            return {"passage_id": passage_id, "words": {}}

        # Check in-memory passage cache first
        if passage_id in self.passage_vocabulary_cache:
            self.stats["passage_cache_hits"] += 1
            self.passage_vocabulary_cache.move_to_end(passage_id)
            return {
                "passage_id": passage_id,
                "words": self.passage_vocabulary_cache[passage_id],
                "count": len(self.passage_vocabulary_cache[passage_id]),
                "cached": True,
            }

        passage = db.fetch_one(
            """
            SELECT id, passage_text, passage_text_2, passage_text_3, transcript
            FROM passages
            WHERE id = ?
            LIMIT 1
            """,
            (passage_id,),
            use_cache=True,
        )
        if not passage:
            return {"passage_id": passage_id, "words": {}}

        # Extract full text
        parts = [
            passage.get("passage_text") or "",
            passage.get("passage_text_2") or "",
            passage.get("passage_text_3") or "",
            passage.get("transcript") or "",
        ]
        full_text = " ".join(p for p in parts if p)
        # Extract unique words with length >= 3
        words = sorted(list(set(w.lower() for w in re.findall(r"\b[A-Za-z]+(?:['’-][A-Za-z]+)?\b", full_text) if len(w) >= 3)))

        if not words:
            return {"passage_id": passage_id, "words": {}}

        self.stats["passage_prewarms"] += 1
        word_map: Dict[str, Any] = {}

        # 1. Batch query direct matches in system_vocabulary_words
        format_strings = ",".join(["?"] * len(words))
        direct_rows = db.fetch_all(
            f"""
            SELECT word, ipa, cefr, part_of_speech, meaning_vi, definition_en, 
                   example_en, example_vi, example_toeic, audio_us, audio_uk, 
                   synonyms, word_family, phrases
            FROM system_vocabulary_words 
            WHERE word IN ({format_strings})
            ORDER BY (set_id IN ('1e3e6ebb-26a1-52f6-bdc5-1d743722fae2', '21793dec-3c53-4e8b-923a-72a2a3bf491a')) DESC, order_index ASC
            """,
            tuple(words),
            use_cache=True,
        )

        for row in direct_rows:
            w = row["word"].lower()
            if w not in word_map:
                formatted = self._format_system_vocabulary_record(row, w)
                word_map[w] = formatted
                # Pre-warm general memory cache
                w_hash = self._compute_hash(w, "en", "vi", "")
                self._save_to_memory_cache(w_hash, formatted)

        missing = [w for w in words if w not in word_map]

        # 2. Batch query inflections for missing words
        if missing:
            inf_fmts = ",".join(["?"] * len(missing))
            inf_rows = db.fetch_all(
                f"SELECT inflected_form, lemma_word FROM word_inflections WHERE inflected_form IN ({inf_fmts})",
                tuple(missing),
                use_cache=True,
            )
            inf_dict = {r["inflected_form"].lower(): r["lemma_word"].lower() for r in inf_rows}
            lemmas_to_fetch = sorted(list(set(inf_dict.values())))

            if lemmas_to_fetch:
                lem_fmts = ",".join(["?"] * len(lemmas_to_fetch))
                lemma_rows = db.fetch_all(
                    f"""
                    SELECT word, ipa, cefr, part_of_speech, meaning_vi, definition_en, 
                           example_en, example_vi, example_toeic, audio_us, audio_uk, 
                           synonyms, word_family, phrases
                    FROM system_vocabulary_words 
                    WHERE word IN ({lem_fmts})
                    ORDER BY (set_id IN ('1e3e6ebb-26a1-52f6-bdc5-1d743722fae2', '21793dec-3c53-4e8b-923a-72a2a3bf491a')) DESC, order_index ASC
                    """,
                    tuple(lemmas_to_fetch),
                    use_cache=True,
                )
                lemma_record_map = {r["word"].lower(): r for r in lemma_rows}

                for inf_word, lemma in inf_dict.items():
                    if lemma in lemma_record_map and inf_word not in word_map:
                        formatted = self._format_system_vocabulary_record(lemma_record_map[lemma], inf_word, lemma)
                        word_map[inf_word] = formatted
                        # Pre-warm general memory cache
                        w_hash = self._compute_hash(inf_word, "en", "vi", "")
                        self._save_to_memory_cache(w_hash, formatted)

        # Cache in LRU
        if len(self.passage_vocabulary_cache) >= 200:
            self.passage_vocabulary_cache.popitem(last=False)
        self.passage_vocabulary_cache[passage_id] = word_map

        return {
            "passage_id": passage_id,
            "words": word_map,
            "count": len(word_map),
        }

    async def get_dictionary_detail(
        self,
        text: str,
        section: DictionaryDetailSection,
        context: str = "TOEIC",
    ) -> Dict[str, Any]:
        self.stats["total_requests"] += 1
        clean_text = text.strip()
        detail_context = f"dictionary-detail:{section}:{context}"
        text_hash = self._compute_hash(clean_text, "en", "vi", detail_context)
        word_only_hash = self._compute_hash(clean_text, "en", "vi", f"dictionary-detail:{section}")

        memory_result = self._get_from_memory_cache(text_hash) or self._get_from_memory_cache(word_only_hash)
        if memory_result:
            return memory_result

        # System vocabulary detail lookup
        system_detail = await asyncio.to_thread(self._lookup_system_vocabulary_detail, clean_text, section)
        if system_detail:
            self.stats["system_vocabulary_hits"] += 1
            self._save_to_memory_cache(text_hash, system_detail)
            self._save_to_memory_cache(word_only_hash, system_detail)
            return system_detail

        if not self.client:
            self.stats["errors"] += 1
            return {
                "source_text": clean_text,
                "section": section,
                "error": "Gemini API chưa được cấu hình trên máy chủ.",
                "cache_source": "error",
            }

        async with self.semaphore:
            self.stats["gemini_api_calls"] += 1
            self.stats["dictionary_detail_calls"] += 1
            try:
                result = await asyncio.to_thread(
                    self._call_gemini_detail,
                    clean_text,
                    section,
                    context,
                )
            except Exception as error:
                self.stats["errors"] += 1
                self.stats["last_error"] = {
                    "type": type(error).__name__,
                    "message": str(error)[:500],
                }
                return {
                    "source_text": clean_text,
                    "section": section,
                    "error": self._friendly_error(error),
                    "cache_source": "error",
                }

        result.update({
            "source_text": clean_text,
            "section": section,
            "cached": False,
            "cache_source": "gemini_api",
        })
        self._save_to_memory_cache(text_hash, result)
        self._save_to_memory_cache(word_only_hash, result)
        return result

    @staticmethod
    def _friendly_error(error: Exception) -> str:
        status = (
            getattr(error, "code", None)
            or getattr(error, "status_code", None)
            or getattr(getattr(error, "response", None), "status_code", None)
        )
        message = str(error).lower()
        if status == 429 or "resource_exhausted" in message or "quota" in message:
            return "Gemini đã hết quota hoặc đang bị giới hạn tốc độ. Vui lòng thử lại sau."
        if status in (401, 403) or "permission_denied" in message or "api key" in message:
            return "Gemini từ chối API key. Hãy kiểm tra quyền và giới hạn key trong Google AI Studio."
        if status == 404 or "not_found" in message or "model" in message and "not found" in message:
            return f"Model Gemini '{config.GEMINI_MODEL}' không khả dụng với API key hiện tại."
        if "response_schema" in message or "response schema" in message or "json schema" in message:
            return "Phiên bản google-genai trên máy chủ không tương thích structured output. Hãy cập nhật dependencies."
        if "timeout" in message or "timed out" in message:
            return "Gemini phản hồi quá chậm. Vui lòng thử lại."
        return "Gemini gặp lỗi khi phân tích từ. Chi tiết đã được ghi trong /api/v1/translate/cache-stats."

    def _call_gemini_api(
        self,
        text: str,
        src_lang: str,
        target_lang: str,
        context: str,
    ) -> Dict[str, Any]:
        if types is None:
            raise RuntimeError("google-genai is not installed")
        prompt = f"""
You are an English-Vietnamese dictionary editor specializing in TOEIC.
Analyze the selected English word "{text}" from this nearby context:
{context[:500]}

Return its most contextually relevant Vietnamese meaning, US IPA and UK IPA pronunciations,
part of speech, a short English definition, one natural bilingual example, and up to four
common synonyms. Keep the explanation concise and suitable for a Vietnamese learner.
Source language: {src_lang}. Target language: {target_lang}.
"""
        response = self.client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.15,
                response_mime_type="application/json",
                # Pydantic models use response_schema. response_json_schema is
                # intended for a standard JSON Schema dictionary.
                response_schema=GeminiWordResult,
                # Gemini 3 defaults to high thinking. Dictionary lookup is a
                # short extraction task, so minimal thinking prevents internal
                # reasoning from consuming the JSON response budget.
                thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                max_output_tokens=2048,
            ),
        )
        if response.parsed:
            parsed = response.parsed
            return parsed.model_dump() if isinstance(parsed, BaseModel) else dict(parsed)
        return GeminiWordResult.model_validate_json(response.text).model_dump()

    @staticmethod
    def _parse_json(value, fallback):
        if value is None:
            return fallback
        if isinstance(value, (dict, list)):
            return value
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return fallback

    @staticmethod
    def _get_database_cache(text_hash: str) -> Optional[Dict[str, Any]]:
        try:
            record = db.fetch_one(
                "SELECT * FROM translation_cache WHERE hash = ?",
                (text_hash,),
                use_cache=False,
            )
            if record:
                db.execute(
                    "UPDATE translation_cache SET hit_count = hit_count + 1 WHERE hash = ?",
                    (text_hash,),
                )
            return record
        except Exception as error:
            print(f"[!] MySQL translation cache read failed: {error}")
            return None

    @staticmethod
    def _save_database_cache(text_hash: str, data: Dict[str, Any]) -> bool:
        try:
            phonetic_to_save = data.get("phonetic", "")
            if data.get("phonetic_uk") and data.get("phonetic_us"):
                phonetic_to_save = f"UK: {data['phonetic_uk']} | US: {data['phonetic_us']}"

            db.execute(
                """
                INSERT INTO translation_cache (
                    hash, source_text, translated_text, phonetic, part_of_speech,
                    definition_en, examples, synonyms, source_lang, target_lang
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    translated_text = VALUES(translated_text),
                    phonetic = VALUES(phonetic),
                    part_of_speech = VALUES(part_of_speech),
                    definition_en = VALUES(definition_en),
                    examples = VALUES(examples),
                    synonyms = VALUES(synonyms),
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    text_hash,
                    data.get("source_text", ""),
                    data.get("translated_text", ""),
                    phonetic_to_save,
                    data.get("part_of_speech", ""),
                    data.get("definition_en", ""),
                    json.dumps(data.get("examples", []), ensure_ascii=False),
                    json.dumps(data.get("synonyms", []), ensure_ascii=False),
                    data.get("source_lang", "en"),
                    data.get("target_lang", "vi"),
                ),
            )
            return True
        except Exception as error:
            print(f"[!] MySQL translation cache write failed: {error}")
            return False

    def _call_gemini_detail(
        self,
        text: str,
        section: DictionaryDetailSection,
        context: str,
    ) -> Dict[str, Any]:
        if types is None:
            raise RuntimeError("google-genai is not installed")

        tasks = {
            "collocations": (
                "List 2-4 common collocations containing this word. "
                "Give each a concise Vietnamese meaning.",
                CollocationResult,
            ),
            "examples": (
                "Write 2-3 new bilingual examples that do not copy the source context. "
                "Increase difficulty from basic office English to a TOEIC email, notice, "
                "or workplace conversation. Label the level and context.",
                ExampleResult,
            ),
            "synonyms": (
                "List 3-5 common English synonyms or near-synonyms. "
                "Use only words or short phrases suitable for another dictionary lookup.",
                SynonymResult,
            ),
            "wordFamily": (
                "List the useful word-family forms (noun, verb, adjective, adverb when they exist). "
                "Include abbreviated part of speech and short IPA for every item.",
                WordFamilyResult,
            ),
        }
        instruction, schema = tasks[section]
        prompt = f"""
You are an English-Vietnamese dictionary editor specializing in TOEIC.
Selected word or phrase: "{text}"
Nearby source context (do not copy it into new examples):
{context[:500]}

Task: {instruction}
Keep every item concise and accurate for a Vietnamese learner.
"""
        response = self.client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=schema,
                thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                max_output_tokens=2048,
            ),
        )
        if response.parsed:
            parsed = response.parsed
            result = parsed.model_dump() if isinstance(parsed, BaseModel) else dict(parsed)
        else:
            result = schema.model_validate_json(response.text).model_dump()

        # The client uses camelCase consistently.
        if section == "collocations":
            result["items"] = [
                {"phrase": item["phrase"], "meaningVi": item["meaning_vi"]}
                for item in result["items"]
            ]
        elif section == "wordFamily":
            result["items"] = [
                {
                    "word": item["word"],
                    "partOfSpeech": item["part_of_speech"],
                    "phonetic": item["phonetic"],
                }
                for item in result["items"]
            ]
        return result

    def get_cache_stats(self) -> Dict[str, Any]:
        hits = (
            self.stats["memory_cache_hits"]
            + self.stats["mysql_cache_hits"]
            + self.stats.get("system_vocabulary_hits", 0)
        )
        total = self.stats["total_requests"]
        return {
            "metrics": self.stats,
            "hit_rate_percent": round((hits / total) * 100, 2) if total else 0.0,
            "ram_cache_current_size": len(self.memory_cache),
            "ram_cache_max_capacity": self.max_ram_cache_size,
            "mysql_connected": db.is_connected,
            "model": config.GEMINI_MODEL,
        }


gemini_service = GeminiTranslationService()
