import asyncio
import hashlib
import json
import re
import uuid
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

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from app import config
from app.db import db


class TranslationExample(BaseModel):
    en: str = Field(description="A natural English example using the selected word")
    vi: str = Field(description="Vietnamese translation of the example")


class GeminiWordResult(BaseModel):
    source_text: str
    word_type: Literal["vocabulary", "proper_noun", "invalid_selection"] = Field(
        default="vocabulary",
        description=(
            "Classification of the selected text: "
            "'vocabulary' for common English dictionary words, verbs, adjectives, idioms, collocations, or phrases suitable for vocabulary learning; "
            "'proper_noun' for names of specific people, corporations, brand names, cities, or locations (e.g. Wilson, Drew, Partyon); "
            "'invalid_selection' for typos, concatenated words without spaces, fragmented syllables, non-words, or test answer labels (A, B, C, D)."
        ),
    )
    translated_text: str = Field(description="Concise Vietnamese meanings, ordered by relevance")
    phonetic: Optional[str] = Field(default="", description="General IPA pronunciation between slashes, or empty string for phrases/proper nouns")
    phonetic_us: Optional[str] = Field(default="", description="American English (US) IPA pronunciation between slashes")
    phonetic_uk: Optional[str] = Field(default="", description="British English (UK) IPA pronunciation between slashes")
    part_of_speech: Optional[str] = Field(default="phrase", description="English part of speech, e.g. noun, verb, idiom, phrase, adjective, proper noun")
    definition_en: Optional[str] = Field(default="", description="Short, learner-friendly English definition")
    examples: List[TranslationExample] = Field(default_factory=list, description="Bilingual contextual examples")
    synonyms: List[str] = Field(default_factory=list, description="Up to four common English synonyms or related phrases")

class CollocationItem(BaseModel):
    phrase: str
    meaning_vi: str = Field(default="", description="Vietnamese meaning")


class CollocationResult(BaseModel):
    items: List[CollocationItem] = Field(default_factory=list, description="Common collocations")


class ExtendedExample(BaseModel):
    en: str
    vi: str = Field(default="")
    level: Optional[str] = Field(default="TOEIC")
    context: Optional[str] = Field(default="Workplace")


class ExampleResult(BaseModel):
    items: List[ExtendedExample] = Field(default_factory=list, description="Bilingual examples")


class SynonymResult(BaseModel):
    items: List[str] = Field(default_factory=list, description="Synonyms")


class WordFamilyItem(BaseModel):
    word: str
    part_of_speech: Optional[str] = Field(default="")
    phonetic: Optional[str] = Field(default="")


class WordFamilyResult(BaseModel):
    items: List[WordFamilyItem] = Field(default_factory=list, description="Word family members")


DictionaryDetailSection = Literal["collocations", "examples", "synonyms", "wordFamily"]


class GeminiTranslationService:
    def __init__(self):
        self.memory_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.passage_vocabulary_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.max_l0_cache_size = getattr(config, "L0_CACHE_MAX_SIZE", 1000)
        self.max_ram_cache_size = self.max_l0_cache_size
        self.semaphore = asyncio.Semaphore(config.MAX_GEMINI_CONCURRENCY)
        self.client = (
            genai.Client(api_key=config.GEMINI_API_KEY)
            if genai and config.GEMINI_API_KEY
            else None
        )
        self._redis_clients: Dict[Any, Any] = {}
        self._redis_ready: bool = getattr(config, "REDIS_ENABLED", True) and (aioredis is not None)
        self._flush_task: Optional[asyncio.Task] = None
        self._local_hit_counts: Dict[str, Dict[int, int]] = {"community": {}, "invalid": {}}
        self._local_pending_inflections: set = set()
        self.stats = {
            "total_requests": 0,
            "passage_cache_hits": 0,
            "passage_redis_hits": 0,
            "passage_prewarms": 0,
            "memory_cache_hits": 0,
            "l0_local_hits": 0,
            "redis_hit_count": 0,
            "direct_system_hits": 0,
            "system_vocabulary_hits": 0,
            "inflection_table_hits": 0,
            "community_translation_hits": 0,
            "gemini_api_calls": 0,
            "dictionary_detail_calls": 0,
            "errors": 0,
            "last_error": None,
        }

    async def get_redis(self):
        if not getattr(config, "REDIS_ENABLED", True) or aioredis is None:
            return None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return None

        client = self._redis_clients.get(loop)
        if client is None:
            try:
                client = aioredis.Redis(
                    host=config.REDIS_HOST,
                    port=config.REDIS_PORT,
                    db=config.REDIS_DB,
                    password=config.REDIS_PASSWORD,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                    max_connections=50,
                )
                self._redis_clients[loop] = client
                self._redis_ready = True
            except Exception as err:
                print(f"[!] Redis init error: {err}")
                self._redis_ready = False
                return None
        return client

    @property
    def is_redis_ready(self) -> bool:
        if not getattr(config, "REDIS_ENABLED", True) or aioredis is None:
            return False
        return self._redis_ready

    async def _redis_get(self, key: str) -> Optional[Dict[str, Any]]:
        client = await self.get_redis()
        if not client:
            return None
        try:
            raw = await client.get(key)
            if raw:
                self._redis_ready = True
                return json.loads(raw)
        except Exception as err:
            self._redis_ready = False
        return None

    async def _redis_set(self, key: str, data: Dict[str, Any], ttl: int = 7 * 86400) -> bool:
        client = await self.get_redis()
        if not client:
            return False
        try:
            serialized = json.dumps(data, ensure_ascii=False)
            await client.set(key, serialized, ex=ttl)
            self._redis_ready = True
            return True
        except Exception as err:
            self._redis_ready = False
            return False

    async def _get_from_redis_cache(self, text_hash: str) -> Optional[Dict[str, Any]]:
        return await self._redis_get(f"translate:word:{text_hash}")

    async def _save_to_redis_cache(self, text_hash: str, data: Dict[str, Any], ttl: int = 7 * 86400) -> bool:
        return await self._redis_set(f"translate:word:{text_hash}", data, ttl=ttl)

    async def _get_passage_from_redis(self, passage_id: str) -> Optional[Dict[str, Any]]:
        client = await self.get_redis()
        if not client:
            return None
        try:
            raw_dict = await client.hgetall(f"translate:passage:{passage_id}")
            if raw_dict:
                self._redis_ready = True
                return {k: json.loads(v) for k, v in raw_dict.items()}
        except Exception as err:
            self._redis_ready = False
        return None

    async def _save_passage_to_redis(self, passage_id: str, word_map: Dict[str, Any]) -> bool:
        client = await self.get_redis()
        if not client or not word_map:
            return False
        try:
            pipe = client.pipeline()
            mapping = {w: json.dumps(data, ensure_ascii=False) for w, data in word_map.items()}
            pipe.hset(f"translate:passage:{passage_id}", mapping=mapping)
            pipe.expire(f"translate:passage:{passage_id}", 24 * 3600)
            for w, data in word_map.items():
                w_hash = self._compute_hash(w, "en", "vi", "")
                pipe.set(f"translate:word:{w_hash}", json.dumps(data, ensure_ascii=False), ex=7 * 86400)
            await pipe.execute()
            self._redis_ready = True
            return True
        except Exception as err:
            self._redis_ready = False
            return False

    async def record_hit_count(self, table_type: str, record_id: int):
        """Buffer hit count increment in Redis hash.
        Falls back to local in-memory counter if Redis is unavailable.
        """
        client = await self.get_redis()
        if client:
            try:
                await client.hincrby(f"hit_counts:{table_type}", str(record_id), 1)
                self._redis_ready = True
                return
            except Exception:
                self._redis_ready = False

        counts = self._local_hit_counts.setdefault(table_type, {})
        counts[record_id] = counts.get(record_id, 0) + 1

    async def buffer_dynamic_inflection(self, inflected_form: str, lemma_word: str):
        """Buffer dynamic inflection in Redis set.
        Falls back to local in-memory set if Redis is unavailable.
        """
        client = await self.get_redis()
        if client:
            try:
                await client.sadd("pending:word_inflections", f"{inflected_form}\t{lemma_word}")
                self._redis_ready = True
                return
            except Exception:
                self._redis_ready = False

        self._local_pending_inflections.add((inflected_form, lemma_word))

    async def flush_all_buffered_writes(self):
        """Flush hit counts and pending inflections to MySQL in batch."""
        await self.flush_hit_counts()
        await self.flush_dynamic_inflections()

    async def flush_hit_counts(self):
        client = await self.get_redis()

        for table_type, db_table in [("community", "community_translations"), ("invalid", "invalid_selections")]:
            items_to_flush: List[Tuple[int, int]] = []

            # 1. Drain from Redis atomically using RENAME
            if client:
                main_key = f"hit_counts:{table_type}"
                flushing_key = f"hit_counts:{table_type}:flushing:{uuid.uuid4().hex[:8]}"
                try:
                    await client.rename(main_key, flushing_key)
                    raw_data = await client.hgetall(flushing_key)
                    if raw_data:
                        for rid_str, cnt_str in raw_data.items():
                            try:
                                items_to_flush.append((int(cnt_str), int(rid_str)))
                            except (ValueError, TypeError):
                                pass
                    await client.delete(flushing_key)
                except Exception as err:
                    err_msg = str(err).lower()
                    if "no such key" not in err_msg:
                        try:
                            await client.delete(flushing_key)
                        except Exception:
                            pass

            # 2. Drain from local memory buffer
            local_map = self._local_hit_counts.get(table_type, {})
            if local_map:
                for rid, cnt in list(local_map.items()):
                    items_to_flush.append((cnt, rid))
                local_map.clear()

            # 3. Batch update into MySQL via async_executemany
            if items_to_flush:
                try:
                    await db.async_executemany(
                        f"UPDATE {db_table} SET hit_count = hit_count + ? WHERE id = ?",
                        items_to_flush,
                        invalidate_cache=False,
                    )
                except Exception as db_err:
                    print(f"[!] Hit count batch flush error for {db_table}: {db_err}")

    async def flush_dynamic_inflections(self):
        items_to_insert: List[Tuple[str, str, str]] = []
        client = await self.get_redis()

        if client:
            flushing_key = f"pending:word_inflections:flushing:{uuid.uuid4().hex[:8]}"
            try:
                await client.rename("pending:word_inflections", flushing_key)
                raw_members = await client.smembers(flushing_key)
                if raw_members:
                    for item in raw_members:
                        if isinstance(item, bytes):
                            item = item.decode("utf-8")
                        parts = item.split("\t")
                        if len(parts) == 2:
                            items_to_insert.append((parts[0], parts[1], "DYNAMIC"))
                await client.delete(flushing_key)
            except Exception as err:
                err_msg = str(err).lower()
                if "no such key" not in err_msg:
                    try:
                        await client.delete(flushing_key)
                    except Exception:
                        pass

        if self._local_pending_inflections:
            for inflected, lemma in list(self._local_pending_inflections):
                items_to_insert.append((inflected, lemma, "DYNAMIC"))
            self._local_pending_inflections.clear()

        if items_to_insert:
            try:
                await db.async_executemany(
                    "INSERT IGNORE INTO word_inflections (inflected_form, lemma_word, inflection_type) VALUES (?, ?, ?)",
                    items_to_insert,
                    invalidate_cache=False,
                )
            except Exception as db_err:
                print(f"[!] Dynamic inflections flush error: {db_err}")

    def start_background_flush_task(self):
        if self._flush_task is None or self._flush_task.done():
            try:
                loop = asyncio.get_running_loop()
                self._flush_task = loop.create_task(self._periodic_flush_loop())
            except RuntimeError:
                pass

    async def _periodic_flush_loop(self):
        interval = getattr(config, "HIT_COUNT_FLUSH_INTERVAL", 60)
        while True:
            try:
                await asyncio.sleep(interval)
                await self.flush_all_buffered_writes()
            except asyncio.CancelledError:
                break
            except Exception as err:
                print(f"[!] Background flush error: {err}")

    async def shutdown(self):
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None
        await self.flush_all_buffered_writes()
        if hasattr(self, "_redis_clients"):
            for client in list(self._redis_clients.values()):
                try:
                    await client.aclose()
                except Exception:
                    pass
            self._redis_clients.clear()

    @staticmethod
    def _compute_hash(text: str, src_lang: str, target_lang: str, context: str = "") -> str:
        raw = f"{text.strip().lower()}:{src_lang}:{target_lang}:{context.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _get_from_memory_cache(self, text_hash: str) -> Optional[Dict[str, Any]]:
        if text_hash not in self.memory_cache:
            return None
        self.memory_cache.move_to_end(text_hash)
        self.stats["memory_cache_hits"] += 1
        self.stats["l0_local_hits"] += 1
        return {
            **self.memory_cache[text_hash],
            "cached": True,
            "cache_source": "memory",
        }

    def _save_to_memory_cache(self, text_hash: str, data: Dict[str, Any]) -> None:
        if len(self.memory_cache) >= self.max_l0_cache_size:
            self.memory_cache.popitem(last=False)
        self.memory_cache[text_hash] = data

    def _save_to_passage_memory_cache(self, passage_id: str, word_map: Dict[str, Any]) -> None:
        if len(self.passage_vocabulary_cache) >= 50:
            self.passage_vocabulary_cache.popitem(last=False)
        self.passage_vocabulary_cache[passage_id] = word_map

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

    async def _fetch_system_vocab_row(self, word: str) -> Optional[Dict[str, Any]]:
        return await db.async_fetch_one(
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

    async def _find_system_vocabulary_record(self, word: str) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*").lower()
        if not clean_word or len(clean_word.split()) > 4:
            return None, None, None

        # 1. Exact match in system_vocabulary_words (direct hit)
        record = await self._fetch_system_vocab_row(clean_word)
        if record:
            return record, clean_word, "direct"

        # 2. Inflection table match (precomputed via LemmInflect offline)
        try:
            inflection = await db.async_fetch_one(
                "SELECT lemma_word FROM word_inflections WHERE inflected_form = ? LIMIT 1",
                (clean_word,),
                use_cache=False,
            )
            if inflection and inflection.get("lemma_word"):
                lemma = inflection["lemma_word"].strip().lower()
                record = await self._fetch_system_vocab_row(lemma)
                if record:
                    return record, lemma, "inflection"
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
                    record = await self._fetch_system_vocab_row(cand)
                    if record:
                        await self.buffer_dynamic_inflection(clean_word, cand)
                        return record, cand, "inflection"
            except Exception as err:
                print(f"[!] lemminflect runtime lookup error: {err}")

        return None, None, None

    async def _lookup_system_vocabulary(self, word: str) -> Optional[Dict[str, Any]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*")
        if not clean_word:
            return None
        try:
            record, lemma, match_type = await self._find_system_vocabulary_record(clean_word)
            if not record:
                return None
            result = self._format_system_vocabulary_record(record, clean_word, lemma)
            result["match_type"] = match_type
            return result
        except Exception as error:
            print(f"[!] System vocabulary lookup failed: {error}")
            return None

    async def _lookup_system_vocabulary_detail(
        self,
        word: str,
        section: DictionaryDetailSection,
    ) -> Optional[Dict[str, Any]]:
        clean_word = word.strip(" \t\n\r\"'.,;:!?()[]{}<>`~*")
        if not clean_word or len(clean_word.split()) > 4:
            return None
        try:
            record, lemma, _ = await self._find_system_vocabulary_record(clean_word)
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

    def _format_community_translation_result(self, record: Dict[str, Any], text: str) -> Dict[str, Any]:
        raw_phonetic = record.get("phonetic", "")
        phonetic_us = record.get("phonetic_us") or ""
        phonetic_uk = record.get("phonetic_uk") or ""
        if "UK:" in raw_phonetic and "US:" in raw_phonetic:
            uk_m = re.search(r"UK:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            us_m = re.search(r"US:\s*(\/[^\/]+\/|[^\s|]+)", raw_phonetic)
            if uk_m:
                phonetic_uk = uk_m.group(1)
            if us_m:
                phonetic_us = us_m.group(1)
        return {
            "source_text": record.get("word") or record.get("source_text") or text,
            "translated_text": record.get("translated_text", ""),
            "phonetic": raw_phonetic,
            "phonetic_us": phonetic_us or raw_phonetic,
            "phonetic_uk": phonetic_uk or raw_phonetic,
            "audio_us": record.get("audio_us") or "",
            "audio_uk": record.get("audio_uk") or "",
            "part_of_speech": record.get("part_of_speech", ""),
            "definition_en": record.get("definition_en", ""),
            "examples": self._parse_json(record.get("examples"), []),
            "synonyms": self._parse_json(record.get("synonyms"), []),
            "cached": True,
            "cache_source": "community_translations",
        }

    async def _get_community_translation(
        self,
        word: str,
        context_hash: str,
        allow_phrase_fallback: bool = False,
    ) -> Optional[Dict[str, Any]]:
        clean_w = word.strip().lower()
        try:
            # 1. Exact match with context_hash
            record = await db.async_fetch_one(
                "SELECT * FROM community_translations WHERE word = ? AND context_hash = ? LIMIT 1",
                (clean_w, context_hash),
                use_cache=False,
            )
            if not record:
                record = await db.async_fetch_one(
                    "SELECT * FROM community_translations WHERE context_hash = ? LIMIT 1",
                    (context_hash,),
                    use_cache=False,
                )
            # 2. Multi-word phrase fallback: fixed expressions have consistent meaning across passages
            if not record and allow_phrase_fallback and len(clean_w.split()) >= 2:
                record = await db.async_fetch_one(
                    "SELECT * FROM community_translations WHERE word = ? ORDER BY hit_count DESC LIMIT 1",
                    (clean_w,),
                    use_cache=False,
                )

            if record:
                await self.record_hit_count("community", record["id"])
                return record
        except Exception as error:
            print(f"[!] MySQL community_translations read failed: {error}")

        # Fallback to translation_cache for backward compatibility
        try:
            record = await db.async_fetch_one(
                "SELECT * FROM translation_cache WHERE hash = ? LIMIT 1",
                (context_hash,),
                use_cache=False,
            )
            return record
        except Exception:
            return None

    @staticmethod
    async def _save_community_translation(
        word: str,
        context_hash: str,
        data: Dict[str, Any],
        context_text: str = "",
    ) -> bool:
        clean_w = word.strip().lower()[:100]
        phonetic_to_save = (data.get("phonetic") or "")[:100]
        phonetic_us = (data.get("phonetic_us") or "")[:100]
        phonetic_uk = (data.get("phonetic_uk") or "")[:100]
        if not phonetic_to_save and phonetic_us:
            phonetic_to_save = phonetic_us
        part_of_speech = (data.get("part_of_speech") or "")[:50]

        # 1. Save to community_translations
        try:
            await db.async_execute(
                """
                INSERT INTO community_translations (
                    word, context_hash, context_text, translated_text, phonetic,
                    phonetic_us, phonetic_uk, audio_us, audio_uk, part_of_speech,
                    definition_en, examples, synonyms, source_lang, target_lang, hit_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE
                    translated_text = VALUES(translated_text),
                    phonetic = VALUES(phonetic),
                    phonetic_us = VALUES(phonetic_us),
                    phonetic_uk = VALUES(phonetic_uk),
                    part_of_speech = VALUES(part_of_speech),
                    definition_en = VALUES(definition_en),
                    examples = VALUES(examples),
                    synonyms = VALUES(synonyms),
                    hit_count = hit_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    clean_w,
                    context_hash,
                    context_text[:1000] if context_text else None,
                    data.get("translated_text", ""),
                    phonetic_to_save,
                    phonetic_us,
                    phonetic_uk,
                    data.get("audio_us") or None,
                    data.get("audio_uk") or None,
                    part_of_speech,
                    data.get("definition_en", ""),
                    json.dumps(data.get("examples", []), ensure_ascii=False),
                    json.dumps(data.get("synonyms", []), ensure_ascii=False),
                    data.get("source_lang", "en"),
                    data.get("target_lang", "vi"),
                ),
                invalidate_cache=False,
            )
        except Exception as error:
            print(f"[!] MySQL community_translations write failed: {error}")

        # 2. Also keep translation_cache synchronized for legacy queries
        try:
            await db.async_execute(
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
                    context_hash,
                    clean_w,
                    data.get("translated_text", ""),
                    phonetic_to_save,
                    data.get("part_of_speech", ""),
                    data.get("definition_en", ""),
                    json.dumps(data.get("examples", []), ensure_ascii=False),
                    json.dumps(data.get("synonyms", []), ensure_ascii=False),
                    data.get("source_lang", "en"),
                    data.get("target_lang", "vi"),
                ),
                invalidate_cache=False,
            )
            return True
        except Exception as error:
            print(f"[!] MySQL translation_cache sync failed: {error}")
            return False

    async def _get_invalid_selection(self, word: str) -> Optional[Dict[str, Any]]:
        clean_w = word.strip().lower()[:100]
        try:
            record = await db.async_fetch_one(
                "SELECT * FROM invalid_selections WHERE word = ? LIMIT 1",
                (clean_w,),
                use_cache=False,
            )
            if record:
                await self.record_hit_count("invalid", record["id"])
                return record
        except Exception as error:
            print(f"[!] MySQL invalid_selections read failed: {error}")
        return None

    @staticmethod
    async def _save_invalid_selection(word: str, word_type: str, translated_text: str = "") -> bool:
        clean_w = word.strip().lower()[:100]
        try:
            await db.async_execute(
                """
                INSERT INTO invalid_selections (word, word_type, translated_text, hit_count)
                VALUES (?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE
                    word_type = VALUES(word_type),
                    translated_text = VALUES(translated_text),
                    hit_count = hit_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (clean_w, word_type, (translated_text or "")[:500]),
                invalidate_cache=False,
            )
            return True
        except Exception as error:
            print(f"[!] MySQL invalid_selections write failed: {error}")
            return False

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

        # Tier 1 (L0): In-Memory RAM Cache (check context hash, then word-only hash if generic)
        memory_result = self._get_from_memory_cache(context_hash)
        if not memory_result and is_generic_context:
            memory_result = self._get_from_memory_cache(word_only_hash)
        if memory_result:
            return memory_result

        # Tier 1 (L1): Redis Shared Cache (distributed across all workers/instances)
        redis_result = await self._get_from_redis_cache(context_hash)
        if not redis_result and is_generic_context:
            redis_result = await self._get_from_redis_cache(word_only_hash)
        if redis_result:
            self.stats["redis_hit_count"] += 1
            self._save_to_memory_cache(context_hash, redis_result)
            if is_generic_context:
                self._save_to_memory_cache(word_only_hash, redis_result)
            return {
                **redis_result,
                "cached": True,
                "cache_source": "redis",
            }

        # Tier 2: Local MySQL System Vocabulary + Lemmatization (ultra-fast 2-4ms lookup)
        if src_lang == "en" and target_lang == "vi":
            system_result = await self._lookup_system_vocabulary(clean_text)
            if system_result:
                if system_result.get("match_type") == "inflection":
                    self.stats["inflection_table_hits"] += 1
                else:
                    self.stats["direct_system_hits"] += 1
                self._save_to_memory_cache(context_hash, system_result)
                self._save_to_memory_cache(word_only_hash, system_result)
                asyncio.create_task(self._save_to_redis_cache(context_hash, system_result, ttl=7 * 86400))
                asyncio.create_task(self._save_to_redis_cache(word_only_hash, system_result, ttl=7 * 86400))
                return system_result

        # Tier 3: MySQL community_translations (Self-Healing Cache with strict context keying)
        is_phrase = len(clean_text.split()) >= 2
        community_result = await self._get_community_translation(clean_text, context_hash, is_phrase)
        if not community_result and is_generic_context and context_hash != word_only_hash:
            community_result = await self._get_community_translation(clean_text, word_only_hash, is_phrase)

        if community_result:
            self.stats["community_translation_hits"] += 1
            result = self._format_community_translation_result(community_result, clean_text)
            self._save_to_memory_cache(context_hash, result)
            asyncio.create_task(self._save_to_redis_cache(context_hash, result, ttl=30 * 86400))
            if is_generic_context or is_phrase:
                self._save_to_memory_cache(word_only_hash, result)
                asyncio.create_task(self._save_to_redis_cache(word_only_hash, result, ttl=30 * 86400))
            return result

        # Tier 3.5: MySQL invalid_selections (chuỗi đã biết là rác/tên riêng đã được ghi nhớ)
        invalid_record = await self._get_invalid_selection(clean_text)
        if invalid_record:
            self.stats["memory_cache_hits"] += 1
            self.stats["l0_local_hits"] += 1
            w_type = invalid_record.get("word_type") or "invalid_selection"
            default_txt = "Tên riêng" if w_type == "proper_noun" else "Lựa chọn không hợp lệ"
            res = {
                "source_text": clean_text,
                "word_type": w_type,
                "translated_text": invalid_record.get("translated_text") or default_txt,
                "phonetic": "",
                "part_of_speech": "proper noun" if w_type == "proper_noun" else "invalid",
                "definition_en": "Proper noun or non-vocabulary selection" if w_type == "proper_noun" else "Invalid selection",
                "examples": [],
                "synonyms": [],
                "cached": True,
                "cache_source": "invalid_selections",
            }
            self._save_to_memory_cache(context_hash, res)
            asyncio.create_task(self._save_to_redis_cache(context_hash, res, ttl=7 * 86400))
            return res

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
        word_type = result.get("word_type", "vocabulary")
        asyncio.create_task(self._save_to_redis_cache(context_hash, result, ttl=30 * 86400 if word_type == "vocabulary" else 7 * 86400))

        # CHỈ lưu vào community_translations khi là từ vựng học tập hợp lệ ("vocabulary")
        if word_type == "vocabulary":
            asyncio.create_task(self._save_community_translation(clean_text, context_hash, result, context))
            # Phrases (collocations, idioms) or generic context safely cache the base word-only key
            if (is_phrase or is_generic_context) and context_hash != word_only_hash:
                self._save_to_memory_cache(word_only_hash, result)
                asyncio.create_task(self._save_to_redis_cache(word_only_hash, result, ttl=30 * 86400))
                asyncio.create_task(self._save_community_translation(clean_text, word_only_hash, result, ""))
        else:
            # Ghi nhớ vào bảng invalid_selections để nhận diện chuỗi này là tên riêng/chuỗi rác mà không ô nhiễm từ điển
            asyncio.create_task(self._save_invalid_selection(clean_text, word_type, result.get("translated_text", "")))

        return result

    async def get_passage_vocabulary(self, passage_id: str) -> Dict[str, Any]:
        """
        Pre-warms and retrieves vocabulary for a passage by passage_id.
        First checks L0 local memory, then L1 Redis shared cache.
        If missed, extracts all English tokens, performs batch queries against system vocabulary
        and word inflections, pre-populates L0 and L1 Redis caches, and returns a dict mapping
        normalized words to formatted WordTranslation objects.
        """
        if not passage_id:
            return {"passage_id": passage_id, "words": {}}

        # 1. Check in-memory L0 passage cache first
        if passage_id in self.passage_vocabulary_cache:
            self.stats["passage_cache_hits"] += 1
            self.passage_vocabulary_cache.move_to_end(passage_id)
            return {
                "passage_id": passage_id,
                "words": self.passage_vocabulary_cache[passage_id],
                "count": len(self.passage_vocabulary_cache[passage_id]),
                "cached": True,
                "cache_source": "memory",
            }

        # 2. Check L1 Redis shared cache (cross-worker / cross-instance)
        redis_passage = await self._get_passage_from_redis(passage_id)
        if redis_passage:
            self.stats["passage_redis_hits"] += 1
            self._save_to_passage_memory_cache(passage_id, redis_passage)
            # Pre-warm local L0 word cache
            for w, formatted in redis_passage.items():
                w_hash = self._compute_hash(w, "en", "vi", "")
                self._save_to_memory_cache(w_hash, formatted)
            return {
                "passage_id": passage_id,
                "words": redis_passage,
                "count": len(redis_passage),
                "cached": True,
                "cache_source": "redis",
            }

        # 3. Fallback: Query MySQL database
        passage = await db.async_fetch_one(
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
        direct_rows = await db.async_fetch_all(
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
                # Pre-warm general L0 memory cache
                w_hash = self._compute_hash(w, "en", "vi", "")
                self._save_to_memory_cache(w_hash, formatted)

        missing = [w for w in words if w not in word_map]

        # 2. Batch query inflections for missing words
        if missing:
            inf_fmts = ",".join(["?"] * len(missing))
            inf_rows = await db.async_fetch_all(
                f"SELECT inflected_form, lemma_word FROM word_inflections WHERE inflected_form IN ({inf_fmts})",
                tuple(missing),
                use_cache=True,
            )
            inf_dict = {r["inflected_form"].lower(): r["lemma_word"].lower() for r in inf_rows}
            lemmas_to_fetch = sorted(list(set(inf_dict.values())))

            if lemmas_to_fetch:
                lem_fmts = ",".join(["?"] * len(lemmas_to_fetch))
                lemma_rows = await db.async_fetch_all(
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
                        # Pre-warm general L0 memory cache
                        w_hash = self._compute_hash(inf_word, "en", "vi", "")
                        self._save_to_memory_cache(w_hash, formatted)

        # Cache in L0 LRU
        self._save_to_passage_memory_cache(passage_id, word_map)

        # Cache in L1 Redis (both passage hash map and individual word keys)
        asyncio.create_task(self._save_passage_to_redis(passage_id, word_map))

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

        # L0 memory cache check
        memory_result = self._get_from_memory_cache(text_hash) or self._get_from_memory_cache(word_only_hash)
        if memory_result:
            return memory_result

        # L1 Redis shared cache check
        redis_result = await self._get_from_redis_cache(text_hash) or await self._get_from_redis_cache(word_only_hash)
        if redis_result:
            self.stats["redis_hit_count"] += 1
            self._save_to_memory_cache(text_hash, redis_result)
            self._save_to_memory_cache(word_only_hash, redis_result)
            return {
                **redis_result,
                "cached": True,
                "cache_source": "redis",
            }

        # System vocabulary detail lookup
        system_detail = await self._lookup_system_vocabulary_detail(clean_text, section)
        if system_detail:
            self.stats["direct_system_hits"] += 1
            self.stats["system_vocabulary_hits"] += 1
            self._save_to_memory_cache(text_hash, system_detail)
            self._save_to_memory_cache(word_only_hash, system_detail)
            asyncio.create_task(self._save_to_redis_cache(text_hash, system_detail, ttl=7 * 86400))
            asyncio.create_task(self._save_to_redis_cache(word_only_hash, system_detail, ttl=7 * 86400))
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
        asyncio.create_task(self._save_to_redis_cache(text_hash, result, ttl=30 * 86400))
        asyncio.create_task(self._save_to_redis_cache(word_only_hash, result, ttl=30 * 86400))
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
Analyze the selected English text "{text}" from this nearby context:
{context[:500]}

First, classify the word_type:
- "vocabulary": A valid general English dictionary word, phrasal verb, collocation, or idiom suitable for vocabulary learning.
- "proper_noun": A proper noun such as a person's name (e.g. Wilson, Drew, Gerson), company name (e.g. Partyon, Westchester), brand, or specific city.
- "invalid_selection": Meaningless character sequences, concatenated words (e.g. "westchesterreviews"), fragments, exam options (A, B, C, D), or typos.

Then provide:
- Concise Vietnamese meaning (for proper nouns, explicitly explain e.g. "Tên riêng: Wilson")
- US IPA and UK IPA pronunciations (if applicable, or empty string)
- Part of speech (e.g. noun, verb, adjective, proper noun, phrase, idiom)
- Short English definition
- One natural bilingual example
- Up to four common synonyms or related expressions (empty list for proper nouns or invalid selections)

Keep the explanation concise and learner-friendly.
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
        raw_items = result.get("items") or []
        if section == "collocations":
            result["items"] = [
                {
                    "phrase": item.get("phrase", ""),
                    "meaningVi": item.get("meaning_vi") or item.get("meaningVi", ""),
                }
                for item in raw_items
                if isinstance(item, dict)
            ]
        elif section == "wordFamily":
            result["items"] = [
                {
                    "word": item.get("word", ""),
                    "partOfSpeech": item.get("part_of_speech") or item.get("partOfSpeech", ""),
                    "phonetic": item.get("phonetic", ""),
                }
                for item in raw_items
                if isinstance(item, dict)
            ]
        elif section == "examples":
            result["items"] = [
                {
                    "en": item.get("en", ""),
                    "vi": item.get("vi", ""),
                    "level": item.get("level") or "TOEIC",
                    "context": item.get("context") or "Workplace",
                }
                for item in raw_items
                if isinstance(item, dict)
            ]
        elif section == "synonyms":
            result["items"] = [
                s for s in raw_items
                if isinstance(s, str) and s.strip()
            ]
        return result

    def get_cache_stats(self) -> Dict[str, Any]:
        local_hits = (
            self.stats.get("passage_cache_hits", 0)
            + self.stats.get("passage_redis_hits", 0)
            + self.stats.get("memory_cache_hits", 0)
            + self.stats.get("redis_hit_count", 0)
            + self.stats.get("direct_system_hits", 0)
            + self.stats.get("inflection_table_hits", 0)
            + self.stats.get("community_translation_hits", 0)
        )
        total = self.stats["total_requests"]

        inflections_count = 0
        community_count = 0
        invalid_count = 0
        try:
            inf_row = db.fetch_one("SELECT COUNT(*) as c FROM word_inflections", use_cache=True)
            if inf_row:
                inflections_count = inf_row["c"]
            comm_row = db.fetch_one("SELECT COUNT(*) as c FROM community_translations", use_cache=True)
            if comm_row:
                community_count = comm_row["c"]
            inv_row = db.fetch_one("SELECT COUNT(*) as c FROM invalid_selections", use_cache=True)
            if inv_row:
                invalid_count = inv_row["c"]
        except Exception:
            pass

        return {
            "metrics": self.stats,
            "hit_rate_percent": round((local_hits / total) * 100, 2) if total else 0.0,
            "gemini_offload_percent": round((local_hits / total) * 100, 2) if total else 0.0,
            "l0_cache_current_size": len(self.memory_cache),
            "l0_cache_max_capacity": self.max_l0_cache_size,
            "ram_cache_current_size": len(self.memory_cache),
            "ram_cache_max_capacity": self.max_ram_cache_size,
            "passage_cache_current_size": len(self.passage_vocabulary_cache),
            "redis_connected": self.is_redis_ready,
            "redis_hit_count": self.stats.get("redis_hit_count", 0),
            "l0_local_hits": self.stats.get("l0_local_hits", 0),
            "word_inflections_count": inflections_count,
            "community_translations_count": community_count,
            "invalid_selections_count": invalid_count,
            "mysql_connected": db.is_connected,
            "model": config.GEMINI_MODEL,
        }


gemini_service = GeminiTranslationService()
