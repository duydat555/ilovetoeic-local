from __future__ import annotations

import argparse
import asyncio
import copy
import json
import logging
import os
import random
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

import pymysql
from bs4 import BeautifulSoup, Comment, NavigableString, Tag
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

SOURCE_TO_OUTPUT_COLUMN = {
    "passage_text": "passage_text_vi_html",
    "passage_text_2": "passage_text_2_vi_html",
    "passage_text_3": "passage_text_3_vi_html",
}
PASSAGE_TRANSLATION_CANDIDATES = (
    "dich_nghia",
    "translation_vi",
    "passage_translation",
    "passage_text_vi",
    "translation",
)
QUESTION_TRANSLATION_CANDIDATES = (
    "dich_nghia",
    "translation_vi",
    "passage_translation",
    "passage_text_vi",
    "translation",
)
REQUIRED_FORMAT_COLUMNS = {
    *SOURCE_TO_OUTPUT_COLUMN.values(),
    "format_status",
}
IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
TOKEN_PATTERN = re.compile(r"\w+", re.UNICODE)
SYSTEM_INSTRUCTION = """Bạn là công cụ định dạng lại văn bản. Bạn sẽ nhận (A) một đoạn HTML tiếng Anh gốc có cấu trúc bảng biểu/định dạng cụ thể, và (B) một đoạn văn bản tiếng Việt là bản dịch của (A). Nhiệm vụ: tạo ra bản HTML mới có cấu trúc thẻ, table, class, style GIỐNG HỆT với (A), nhưng nội dung chữ bên trong lấy từ (B). Bạn PHẢI giữ nguyên toàn bộ từ ngữ trong (B), không được dịch lại, không diễn giải, không thêm/bớt/sửa chữ — chỉ được sắp xếp lại các cụm từ có sẵn trong (B) vào đúng vị trí tương ứng trong khung HTML của (A). Nếu 1 vị trí trong bảng gốc không có phần tương ứng rõ ràng trong (B), để trống ô đó thay vì tự bịa nội dung. Chỉ trả về HTML thuần, không thêm markdown code fence, không giải thích.

HTML đầu vào có một div gốc data-passage-format-root="true" và từ một đến ba section mang data-passage-source-column. Phải giữ nguyên chính xác div, các section đánh dấu, toàn bộ thứ tự thẻ, tên thẻ, class, style và thuộc tính của HTML đầu vào. Chỉ thay nội dung các text node. Trả lại đúng một div gốc hoàn chỉnh.

Mọi text nhìn thấy trong output phải lấy từ B. Không được giữ lại URL, tên riêng, nhãn hoặc chữ tiếng Anh từ A nếu chuỗi đó không có trong B. Mỗi từ trong B chỉ được dùng đúng số lần nó xuất hiện trong B; không được nhân đôi nội dung để lấp nhiều vị trí."""


class FormatterError(RuntimeError):
    pass


class OutputValidationError(FormatterError):
    pass


class TransientApiError(FormatterError):
    pass


class DailyQuotaExhausted(FormatterError):
    pass


class AsyncRateLimiter:
    def __init__(self, requests_per_minute: float):
        self.minimum_interval = 60.0 / requests_per_minute
        self._lock = asyncio.Lock()
        self._next_request_at = 0.0

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            delay = self._next_request_at - now
            if delay > 0:
                await asyncio.sleep(delay)
            self._next_request_at = time.monotonic() + self.minimum_interval


@dataclass(frozen=True)
class TranslationSources:
    passage_columns: tuple[str, ...]
    question_columns: tuple[str, ...]


@dataclass(frozen=True)
class PassageJob:
    passage_id: str
    test_id: str
    source_html_by_column: dict[str, str]
    translation: str
    translation_source: str


@dataclass(frozen=True)
class VerificationResult:
    similarity: float
    source_token_count: int
    output_token_count: int
    matched_token_count: int
    union_token_count: int
    missing_tokens: dict[str, int]
    extra_tokens: dict[str, int]


@dataclass
class ProcessResult:
    passage_id: str
    test_id: str
    status: str
    html_by_column: dict[str, str | None] = field(default_factory=dict)
    similarity: float | None = None
    error: str | None = None
    missing_tokens: dict[str, int] = field(default_factory=dict)
    extra_tokens: dict[str, int] = field(default_factory=dict)
    api_attempts: int = 0
    translation_source: str | None = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_identifier(value: str) -> str:
    if not IDENTIFIER_PATTERN.fullmatch(value):
        raise FormatterError(f"Unsafe SQL identifier: {value!r}")
    return value


def database_connection() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "toeic_db"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
        connect_timeout=10,
        read_timeout=60,
        write_timeout=60,
    )


def table_columns(
    connection: pymysql.connections.Connection,
    table_name: str,
) -> set[str]:
    require_identifier(table_name)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = %s
            """,
            (table_name,),
        )
        return {
            str(next(iter(row.values())))
            for row in cursor.fetchall()
            if row
        }


def assert_format_schema(connection: pymysql.connections.Connection) -> None:
    existing = table_columns(connection, "passages")
    missing = sorted(REQUIRED_FORMAT_COLUMNS - existing)
    if missing:
        migration_path = BASE_DIR / "migrations" / "20260803_add_passage_vi_html.sql"
        raise FormatterError(
            "Missing passages columns: "
            f"{', '.join(missing)}. Run the migration first: {migration_path}"
        )


def apply_format_schema_migration(
    connection: pymysql.connections.Connection,
) -> list[str]:
    existing_columns = table_columns(connection, "passages")
    column_statements = {
        "passage_text_vi_html": (
            "ALTER TABLE passages ADD COLUMN passage_text_vi_html "
            "LONGTEXT NULL AFTER passage_text_3"
        ),
        "passage_text_2_vi_html": (
            "ALTER TABLE passages ADD COLUMN passage_text_2_vi_html "
            "LONGTEXT NULL AFTER passage_text_vi_html"
        ),
        "passage_text_3_vi_html": (
            "ALTER TABLE passages ADD COLUMN passage_text_3_vi_html "
            "LONGTEXT NULL AFTER passage_text_2_vi_html"
        ),
        "format_status": (
            "ALTER TABLE passages ADD COLUMN format_status "
            "ENUM('pending', 'done', 'error') NOT NULL DEFAULT 'pending' "
            "AFTER passage_text_3_vi_html"
        ),
    }
    applied: list[str] = []
    try:
        with connection.cursor() as cursor:
            for column, statement in column_statements.items():
                if column in existing_columns:
                    continue
                cursor.execute(statement)
                applied.append(f"passages.{column}")

            cursor.execute(
                """
                SELECT 1
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                  AND table_name = 'passages'
                  AND index_name = 'idx_passages_format_status'
                LIMIT 1
                """
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    "ALTER TABLE passages ADD INDEX "
                    "idx_passages_format_status (format_status)"
                )
                applied.append("passages.idx_passages_format_status")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    return applied


def detect_translation_sources(
    connection: pymysql.connections.Connection,
    translation_table: str,
    translation_column: str | None,
) -> TranslationSources:
    passage_columns = table_columns(connection, "passages")
    question_columns = table_columns(connection, "questions")

    if translation_column:
        column = require_identifier(translation_column)
        if translation_table == "passages":
            if column not in passage_columns:
                raise FormatterError(f"passages.{column} does not exist")
            return TranslationSources((column,), ())
        if translation_table == "questions":
            if column not in question_columns:
                raise FormatterError(f"questions.{column} does not exist")
            return TranslationSources((), (column,))
        passage_match = (column,) if column in passage_columns else ()
        question_match = (column,) if column in question_columns else ()
        if not passage_match and not question_match:
            raise FormatterError(
                f"Translation column {column!r} exists in neither passages nor questions"
            )
        return TranslationSources(passage_match, question_match)

    detected_passage_columns = tuple(
        column for column in PASSAGE_TRANSLATION_CANDIDATES if column in passage_columns
    )
    detected_question_columns = tuple(
        column for column in QUESTION_TRANSLATION_CANDIDATES if column in question_columns
    )
    if translation_table == "passages":
        detected_question_columns = ()
    elif translation_table == "questions":
        detected_passage_columns = ()

    if not detected_passage_columns and not detected_question_columns:
        raise FormatterError(
            "No approved plain-text translation column was detected. Pass "
            "--translation-table and --translation-column explicitly."
        )
    return TranslationSources(
        detected_passage_columns,
        detected_question_columns,
    )


def parse_statuses(raw_statuses: str) -> tuple[str, ...]:
    allowed = {"pending", "done", "error"}
    statuses = tuple(
        status.strip().lower()
        for status in raw_statuses.split(",")
        if status.strip()
    )
    if not statuses or any(status not in allowed for status in statuses):
        raise FormatterError(
            "--statuses must contain one or more of: pending, done, error"
        )
    return tuple(dict.fromkeys(statuses))


def fetch_candidate_passages(
    connection: pymysql.connections.Connection,
    statuses: Sequence[str],
    test_ids: Sequence[str],
    limit: int | None,
) -> list[dict[str, Any]]:
    placeholders = ", ".join(["%s"] * len(statuses))
    query = f"SELECT p.* FROM passages p WHERE p.format_status IN ({placeholders})"
    params: list[Any] = list(statuses)
    if test_ids:
        test_placeholders = ", ".join(["%s"] * len(test_ids))
        query += f" AND p.test_id IN ({test_placeholders})"
        params.extend(test_ids)
    query += " ORDER BY p.test_id ASC, p.order_index ASC, p.id ASC"
    if limit is not None:
        query += " LIMIT %s"
        params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(query, tuple(params))
        return [dict(row) for row in cursor.fetchall()]


def chunked(values: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


def fetch_question_translation_rows(
    connection: pymysql.connections.Connection,
    passage_ids: Sequence[str],
    columns: Sequence[str],
) -> dict[str, list[dict[str, Any]]]:
    rows_by_passage: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if not passage_ids or not columns:
        return rows_by_passage

    safe_columns = [require_identifier(column) for column in columns]
    selected_columns = ", ".join(f"q.{column}" for column in safe_columns)
    with connection.cursor() as cursor:
        for id_batch in chunked(list(passage_ids), 500):
            placeholders = ", ".join(["%s"] * len(id_batch))
            cursor.execute(
                f"""
                SELECT q.id, q.passage_id, {selected_columns}
                FROM questions q
                WHERE q.passage_id IN ({placeholders})
                ORDER BY q.passage_id ASC, q.question_number ASC, q.id ASC
                """,
                tuple(id_batch),
            )
            for row in cursor.fetchall():
                rows_by_passage[str(row["passage_id"])].append(dict(row))
    return rows_by_passage


def canonical_translation(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def resolve_approved_translation(
    passage_row: dict[str, Any],
    question_rows: Sequence[dict[str, Any]],
    sources: TranslationSources,
) -> tuple[str | None, str | None, str | None]:
    for column in sources.passage_columns:
        raw_value = passage_row.get(column)
        if isinstance(raw_value, str) and canonical_translation(raw_value):
            return raw_value, f"passages.{column}", None

    for column in sources.question_columns:
        unique_values: dict[str, str] = {}
        for question_row in question_rows:
            raw_value = question_row.get(column)
            if not isinstance(raw_value, str):
                continue
            canonical_value = canonical_translation(raw_value)
            if canonical_value:
                unique_values.setdefault(canonical_value, raw_value)
        if len(unique_values) == 1:
            return next(iter(unique_values.values())), f"questions.{column}", None
        if len(unique_values) > 1:
            return (
                None,
                None,
                f"Found {len(unique_values)} different approved translations in "
                f"questions.{column} for this passage",
            )

    return None, None, "No approved plain-text Vietnamese translation was found"


def source_html_by_column(passage_row: dict[str, Any]) -> dict[str, str]:
    result: dict[str, str] = {}
    for column in SOURCE_TO_OUTPUT_COLUMN:
        value = passage_row.get(column)
        if isinstance(value, str) and value.strip():
            result[column] = value
    return result


def build_source_bundle(source_by_column: dict[str, str]) -> str:
    sections = [
        f'<section data-passage-source-column="{column}">{html}</section>'
        for column, html in source_by_column.items()
    ]
    return (
        '<div data-passage-format-root="true">'
        + "".join(sections)
        + "</div>"
    )


def build_user_prompt(source_bundle: str, translation: str) -> str:
    return (
        "Hãy trả lại duy nhất HTML đã định dạng theo system instruction.\n\n"
        "===== BEGIN A: SOURCE HTML =====\n"
        f"{source_bundle}\n"
        "===== END A: SOURCE HTML =====\n\n"
        "===== BEGIN B: APPROVED VIETNAMESE PLAIN TEXT =====\n"
        f"{translation}\n"
        "===== END B: APPROVED VIETNAMESE PLAIN TEXT ====="
    )


def tag_topology_signature(tag: Tag) -> tuple[Any, ...]:
    child_tags = tuple(
        tag_topology_signature(child)
        for child in tag.children
        if isinstance(child, Tag)
    )
    return tag.name, child_tags


def restore_source_attributes(source_tag: Tag, output_tag: Tag) -> None:
    output_tag.attrs = copy.deepcopy(source_tag.attrs)
    source_children = [child for child in source_tag.children if isinstance(child, Tag)]
    output_children = [child for child in output_tag.children if isinstance(child, Tag)]
    for source_child, output_child in zip(source_children, output_children):
        restore_source_attributes(source_child, output_child)


def find_bundle_root(document: BeautifulSoup) -> Tag:
    roots = document.find_all(
        "div",
        attrs={"data-passage-format-root": "true"},
    )
    if len(roots) != 1:
        raise OutputValidationError(
            "Gemini output must contain exactly one data-passage-format-root div"
        )
    return roots[0]


def direct_slot_sections(root: Tag) -> dict[str, Tag]:
    sections: dict[str, Tag] = {}
    for child in root.children:
        if isinstance(child, NavigableString):
            if isinstance(child, Comment) or not str(child).strip():
                continue
            raise OutputValidationError("Unexpected text outside the passage slot sections")
        if not isinstance(child, Tag):
            continue
        if child.name != "section":
            raise OutputValidationError(
                f"Unexpected root child tag <{child.name}>; expected only section tags"
            )
        column = child.get("data-passage-source-column")
        if not isinstance(column, str) or column not in SOURCE_TO_OUTPUT_COLUMN:
            raise OutputValidationError("A passage section has an invalid source-column marker")
        if column in sections:
            raise OutputValidationError(f"Duplicate passage section for {column}")
        sections[column] = child
    return sections


def visible_text_from_html(raw_html: str) -> str:
    document = BeautifulSoup(raw_html, "html.parser")
    for hidden in document.select("script, style, noscript, template"):
        hidden.decompose()
    return document.get_text(separator=" ", strip=False)


def tokenize_words(value: str) -> list[str]:
    normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    return [token.casefold() for token in TOKEN_PATTERN.findall(normalized)]


def counter_preview(counter: Counter[str], limit: int = 100) -> dict[str, int]:
    return dict(counter.most_common(limit))


def verify_word_multiset(
    approved_translation: str,
    output_html: str,
) -> VerificationResult:
    source_tokens = tokenize_words(approved_translation)
    output_tokens = tokenize_words(visible_text_from_html(output_html))
    if not source_tokens:
        raise OutputValidationError("Approved translation has no word tokens")
    if not output_tokens:
        raise OutputValidationError("Gemini output has no visible word tokens")

    source_counter = Counter(source_tokens)
    output_counter = Counter(output_tokens)
    intersection = source_counter & output_counter
    union = source_counter | output_counter
    matched_count = sum(intersection.values())
    union_count = sum(union.values())
    similarity = matched_count / union_count if union_count else 0.0
    missing = source_counter - output_counter
    extra = output_counter - source_counter
    return VerificationResult(
        similarity=similarity,
        source_token_count=len(source_tokens),
        output_token_count=len(output_tokens),
        matched_token_count=matched_count,
        union_token_count=union_count,
        missing_tokens=counter_preview(missing),
        extra_tokens=counter_preview(extra),
    )


def validate_and_split_output(
    source_bundle: str,
    output_html: str,
    expected_columns: Sequence[str],
) -> dict[str, str]:
    stripped_output = output_html.strip()
    if not stripped_output:
        raise OutputValidationError("Gemini returned an empty response")
    if "```" in stripped_output:
        raise OutputValidationError("Gemini returned a Markdown code fence")

    source_document = BeautifulSoup(source_bundle, "html.parser")
    output_document = BeautifulSoup(stripped_output, "html.parser")
    source_root = find_bundle_root(source_document)
    output_root = find_bundle_root(output_document)
    source_sections = direct_slot_sections(source_root)
    output_sections = direct_slot_sections(output_root)

    expected_set = set(expected_columns)
    if set(source_sections) != expected_set:
        raise OutputValidationError("Internal source bundle has unexpected passage slots")
    if set(output_sections) != expected_set:
        missing = sorted(expected_set - set(output_sections))
        extra = sorted(set(output_sections) - expected_set)
        raise OutputValidationError(
            f"Gemini changed passage slots; missing={missing}, extra={extra}"
        )

    html_by_column: dict[str, str] = {}
    for column in expected_columns:
        source_signature = tag_topology_signature(source_sections[column])
        output_signature = tag_topology_signature(output_sections[column])
        if output_signature != source_signature:
            raise OutputValidationError(
                f"Gemini changed the DOM/tag topology for {column}"
            )
        restore_source_attributes(source_sections[column], output_sections[column])
        html_by_column[column] = output_sections[column].decode_contents()
    return html_by_column


def save_failed_ai_output(
    job: PassageJob,
    output_html: str,
    reason: str,
) -> Path:
    output_dir = BASE_DIR / "logs" / "failed_html"
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_test_id = re.sub(r"[^A-Za-z0-9_-]", "_", job.test_id)
    safe_passage_id = re.sub(r"[^A-Za-z0-9_-]", "_", job.passage_id)
    output_path = output_dir / f"{safe_test_id}__{safe_passage_id}.html"
    diagnostic = (
        f"<!-- Validation error: {reason.replace('--', '—')} -->\n"
        + output_html
    )
    output_path.write_text(diagnostic, encoding="utf-8")
    return output_path


def transient_api_error(error: Exception) -> bool:
    status = (
        getattr(error, "code", None)
        or getattr(error, "status_code", None)
        or getattr(getattr(error, "response", None), "status_code", None)
    )
    if status in {408, 409, 429, 500, 502, 503, 504}:
        return True
    message = str(error).casefold()
    return any(
        marker in message
        for marker in (
            "timeout",
            "timed out",
            "temporarily unavailable",
            "resource_exhausted",
            "rate limit",
            "connection reset",
            "connection aborted",
            "service unavailable",
            "internal server error",
        )
    )


def api_retry_delay(error: Exception, fallback: float) -> float:
    message = str(error)
    values: list[float] = []
    for pattern in (
        r"retry in\s+([0-9]+(?:\.[0-9]+)?)s",
        r"retryDelay['\"]?\s*:\s*['\"]([0-9]+(?:\.[0-9]+)?)s",
    ):
        values.extend(float(value) for value in re.findall(pattern, message, re.IGNORECASE))
    return max([fallback, *values])


def daily_quota_exhausted(error: Exception) -> bool:
    message = str(error).casefold()
    return (
        "generaterequestsperday" in message
        or "requests per day" in message
        or "daily quota" in message
    )


async def generate_formatted_html(
    client: Any,
    model: str,
    source_bundle: str,
    translation: str,
    semaphore: asyncio.Semaphore,
    rate_limiter: AsyncRateLimiter,
    max_retries: int,
    backoff_seconds: float,
) -> tuple[str, int]:
    if types is None:
        raise FormatterError("google-genai is not installed")
    prompt = build_user_prompt(source_bundle, translation)
    max_attempts = max_retries + 1
    for attempt in range(1, max_attempts + 1):
        try:
            await rate_limiter.acquire()
            async with semaphore:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        response_mime_type="text/plain",
                        thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                        max_output_tokens=65536,
                    ),
                )
            response_text = getattr(response, "text", None)
            if not isinstance(response_text, str) or not response_text.strip():
                raise FormatterError("Gemini response did not contain text")
            return response_text, attempt
        except Exception as error:
            if daily_quota_exhausted(error):
                raise DailyQuotaExhausted(
                    "Gemini daily request quota is exhausted; the current batch was not "
                    "persisted and remains pending for a later resume"
                ) from error
            is_transient = transient_api_error(error)
            if attempt >= max_attempts or not is_transient:
                error_class = TransientApiError if is_transient else FormatterError
                raise error_class(
                    f"Gemini API failed after {attempt} attempt(s): "
                    f"{type(error).__name__}: {error}"
                ) from error
            fallback_delay = backoff_seconds * (2 ** (attempt - 1))
            delay = api_retry_delay(error, fallback_delay) + random.uniform(0.5, 1.0)
            logging.warning(
                "Transient Gemini error on attempt %s/%s; retrying in %.2fs: %s",
                attempt,
                max_attempts,
                delay,
                error,
            )
            await asyncio.sleep(delay)
    raise FormatterError("Gemini retry loop ended unexpectedly")


async def process_job(
    job: PassageJob,
    client: Any,
    model: str,
    semaphore: asyncio.Semaphore,
    rate_limiter: AsyncRateLimiter,
    threshold: float,
    max_retries: int,
    backoff_seconds: float,
) -> ProcessResult:
    source_bundle = build_source_bundle(job.source_html_by_column)
    try:
        output_html, attempts = await generate_formatted_html(
            client=client,
            model=model,
            source_bundle=source_bundle,
            translation=job.translation,
            semaphore=semaphore,
            rate_limiter=rate_limiter,
            max_retries=max_retries,
            backoff_seconds=backoff_seconds,
        )
    except DailyQuotaExhausted:
        raise
    except TransientApiError as error:
        return ProcessResult(
            passage_id=job.passage_id,
            test_id=job.test_id,
            status="pending",
            error=str(error),
            translation_source=job.translation_source,
        )
    except Exception as error:
        return ProcessResult(
            passage_id=job.passage_id,
            test_id=job.test_id,
            status="error",
            error=str(error),
            translation_source=job.translation_source,
        )

    try:
        html_by_column = validate_and_split_output(
            source_bundle,
            output_html,
            tuple(job.source_html_by_column),
        )
        verification = verify_word_multiset(job.translation, output_html)
    except OutputValidationError as error:
        failed_output_path = save_failed_ai_output(job, output_html, str(error))
        return ProcessResult(
            passage_id=job.passage_id,
            test_id=job.test_id,
            status="error",
            error=f"{error}; failed output: {failed_output_path}",
            api_attempts=attempts,
            translation_source=job.translation_source,
        )

    if verification.similarity < threshold:
        threshold_error = (
            f"Word-multiset similarity {verification.similarity:.4%} is below "
            f"the required threshold {threshold:.2%}"
        )
        failed_output_path = save_failed_ai_output(job, output_html, threshold_error)
        return ProcessResult(
            passage_id=job.passage_id,
            test_id=job.test_id,
            status="error",
            similarity=verification.similarity,
            error=f"{threshold_error}; failed output: {failed_output_path}",
            missing_tokens=verification.missing_tokens,
            extra_tokens=verification.extra_tokens,
            api_attempts=attempts,
            translation_source=job.translation_source,
        )

    output_columns = {
        SOURCE_TO_OUTPUT_COLUMN[source_column]: formatted_html
        for source_column, formatted_html in html_by_column.items()
    }
    for output_column in SOURCE_TO_OUTPUT_COLUMN.values():
        output_columns.setdefault(output_column, None)
    return ProcessResult(
        passage_id=job.passage_id,
        test_id=job.test_id,
        status="done",
        html_by_column=output_columns,
        similarity=verification.similarity,
        missing_tokens=verification.missing_tokens,
        extra_tokens=verification.extra_tokens,
        api_attempts=attempts,
        translation_source=job.translation_source,
    )


def persist_results(
    connection: pymysql.connections.Connection,
    results: Sequence[ProcessResult],
) -> None:
    try:
        with connection.cursor() as cursor:
            for result in results:
                if result.status == "done":
                    cursor.execute(
                        """
                        UPDATE passages
                        SET passage_text_vi_html = %s,
                            passage_text_2_vi_html = %s,
                            passage_text_3_vi_html = %s,
                            format_status = 'done'
                        WHERE id = %s
                        """,
                        (
                            result.html_by_column.get("passage_text_vi_html"),
                            result.html_by_column.get("passage_text_2_vi_html"),
                            result.html_by_column.get("passage_text_3_vi_html"),
                            result.passage_id,
                        ),
                    )
                elif result.status == "error":
                    cursor.execute(
                        "UPDATE passages SET format_status = 'error' WHERE id = %s",
                        (result.passage_id,),
                    )
                else:
                    cursor.execute(
                        "UPDATE passages SET format_status = 'pending' WHERE id = %s",
                        (result.passage_id,),
                    )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def database_status_summary(
    connection: pymysql.connections.Connection,
) -> tuple[dict[str, int], list[dict[str, str]]]:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT format_status, COUNT(*) AS total FROM passages GROUP BY format_status"
        )
        counts = {str(row["format_status"]): int(row["total"]) for row in cursor.fetchall()}
        cursor.execute(
            """
            SELECT test_id, id AS passage_id
            FROM passages
            WHERE format_status = 'error'
            ORDER BY test_id ASC, order_index ASC, id ASC
            """
        )
        error_passages = [
            {
                "test_id": str(row["test_id"]),
                "passage_id": str(row["passage_id"]),
            }
            for row in cursor.fetchall()
        ]
    return counts, error_passages


def configure_logging(log_dir: Path) -> tuple[Path, Path]:
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = log_dir / f"passage_vi_format_{timestamp}.log"
    report_path = log_dir / f"passage_vi_format_{timestamp}.json"
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_path, encoding="utf-8"),
    ]
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=handlers,
        force=True,
    )
    return log_path, report_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Format approved Vietnamese passage translations with Gemini while "
            "preserving the source HTML structure."
        )
    )
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument(
        "--requests-per-minute",
        type=float,
        default=float(os.getenv("GEMINI_FORMAT_REQUESTS_PER_MINUTE", "14")),
    )
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--backoff-seconds", type=float, default=2.0)
    parser.add_argument("--threshold", type=float, default=0.97)
    parser.add_argument("--statuses", default="pending,error")
    parser.add_argument("--test-id", action="append", default=[])
    parser.add_argument("--limit", type=int)
    parser.add_argument(
        "--model",
        default=(
            os.getenv("GEMINI_FORMAT_MODEL")
            or os.getenv("GEMINI_MODEL")
            or "gemini-3.5-flash-lite"
        ),
    )
    parser.add_argument(
        "--translation-table",
        choices=("auto", "passages", "questions"),
        default="auto",
    )
    parser.add_argument("--translation-column")
    parser.add_argument(
        "--apply-migration",
        action="store_true",
        help="Add missing formatter columns/index before processing rows",
    )
    parser.add_argument(
        "--status-only",
        action="store_true",
        help="Print current formatter status counts without calling Gemini",
    )
    parser.add_argument("--log-dir", type=Path, default=BASE_DIR / "logs")
    args = parser.parse_args()

    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")
    if args.concurrency < 1:
        parser.error("--concurrency must be at least 1")
    if args.requests_per_minute <= 0:
        parser.error("--requests-per-minute must be greater than 0")
    if args.max_retries < 0:
        parser.error("--max-retries cannot be negative")
    if args.backoff_seconds < 0:
        parser.error("--backoff-seconds cannot be negative")
    if not 0 < args.threshold <= 1:
        parser.error("--threshold must be greater than 0 and at most 1")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    if args.translation_table != "auto" and not args.translation_column:
        parser.error(
            "--translation-column is required when --translation-table is not auto"
        )
    return args


async def run(args: argparse.Namespace) -> int:
    log_path, report_path = configure_logging(args.log_dir)
    started_at = utc_now_iso()
    statuses = parse_statuses(args.statuses)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if genai is None or types is None:
        raise FormatterError(
            "google-genai is unavailable. Run: python -m pip install -r requirements.txt"
        )
    if not api_key:
        raise FormatterError("GEMINI_API_KEY is missing from server/.env")

    connection = database_connection()
    processed_results: list[ProcessResult] = []
    try:
        if args.apply_migration:
            applied_schema_changes = apply_format_schema_migration(connection)
            logging.info(
                "Schema migration applied changes: %s",
                applied_schema_changes or "none; schema already current",
            )
        assert_format_schema(connection)
        if args.status_only:
            status_counts, error_passages = database_status_summary(connection)
            logging.info("Database status counts: %s", status_counts)
            logging.info("Error passage IDs: %s", error_passages)
            return 0
        sources = detect_translation_sources(
            connection,
            args.translation_table,
            args.translation_column,
        )
        logging.info(
            "Translation sources: passages=%s questions=%s",
            list(sources.passage_columns),
            list(sources.question_columns),
        )
        passage_rows = fetch_candidate_passages(
            connection,
            statuses,
            args.test_id,
            args.limit,
        )
        logging.info(
            "Selected %s passage rows with statuses=%s, batch_size=%s, concurrency=%s",
            len(passage_rows),
            list(statuses),
            args.batch_size,
            args.concurrency,
        )
        question_rows_by_passage = fetch_question_translation_rows(
            connection,
            [str(row["id"]) for row in passage_rows],
            sources.question_columns,
        )

        jobs: list[PassageJob] = []
        preflight_errors: list[ProcessResult] = []
        for row in passage_rows:
            passage_id = str(row["id"])
            test_id = str(row["test_id"])
            source_by_column = source_html_by_column(row)
            if not source_by_column:
                preflight_errors.append(
                    ProcessResult(
                        passage_id=passage_id,
                        test_id=test_id,
                        status="error",
                        error="Passage has no non-empty source HTML column",
                    )
                )
                continue
            translation, translation_source, translation_error = resolve_approved_translation(
                row,
                question_rows_by_passage.get(passage_id, []),
                sources,
            )
            if translation_error or translation is None or translation_source is None:
                preflight_errors.append(
                    ProcessResult(
                        passage_id=passage_id,
                        test_id=test_id,
                        status="error",
                        error=translation_error or "Approved translation is unavailable",
                    )
                )
                continue
            jobs.append(
                PassageJob(
                    passage_id=passage_id,
                    test_id=test_id,
                    source_html_by_column=source_by_column,
                    translation=translation,
                    translation_source=translation_source,
                )
            )

        if preflight_errors:
            persist_results(connection, preflight_errors)
            processed_results.extend(preflight_errors)
            for result in preflight_errors:
                logging.error(
                    "Preflight error test_id=%s passage_id=%s: %s",
                    result.test_id,
                    result.passage_id,
                    result.error,
                )

        client = genai.Client(api_key=api_key)
        semaphore = asyncio.Semaphore(args.concurrency)
        rate_limiter = AsyncRateLimiter(args.requests_per_minute)
        completed_jobs = 0
        for batch_number, job_batch in enumerate(chunked(jobs, args.batch_size), start=1):
            logging.info(
                "Starting API batch %s with %s passage rows",
                batch_number,
                len(job_batch),
            )
            batch_results = await asyncio.gather(
                *(
                    process_job(
                        job=job,
                        client=client,
                        model=args.model,
                        semaphore=semaphore,
                        rate_limiter=rate_limiter,
                        threshold=args.threshold,
                        max_retries=args.max_retries,
                        backoff_seconds=args.backoff_seconds,
                    )
                    for job in job_batch
                )
            )
            persist_results(connection, batch_results)
            processed_results.extend(batch_results)
            completed_jobs += len(batch_results)
            for result in batch_results:
                if result.status == "done":
                    logging.info(
                        "Done test_id=%s passage_id=%s similarity=%.4f attempts=%s source=%s",
                        result.test_id,
                        result.passage_id,
                        result.similarity or 0.0,
                        result.api_attempts,
                        result.translation_source,
                    )
                elif result.status == "error":
                    logging.error(
                        "Error test_id=%s passage_id=%s similarity=%s attempts=%s "
                        "missing=%s extra=%s reason=%s",
                        result.test_id,
                        result.passage_id,
                        result.similarity,
                        result.api_attempts,
                        result.missing_tokens,
                        result.extra_tokens,
                        result.error,
                    )
                else:
                    logging.warning(
                        "Pending after transient API failure test_id=%s passage_id=%s: %s",
                        result.test_id,
                        result.passage_id,
                        result.error,
                    )
            logging.info("Progress: %s/%s API jobs persisted", completed_jobs, len(jobs))

        status_counts, all_error_passages = database_status_summary(connection)
        run_done = sum(1 for result in processed_results if result.status == "done")
        run_error = sum(1 for result in processed_results if result.status == "error")
        run_pending = sum(1 for result in processed_results if result.status == "pending")
        report = {
            "started_at": started_at,
            "finished_at": utc_now_iso(),
            "model": args.model,
            "threshold": args.threshold,
            "statuses_selected": list(statuses),
            "selected_rows": len(passage_rows),
            "api_jobs": len(jobs),
            "preflight_errors": len(preflight_errors),
            "run_done": run_done,
            "run_error": run_error,
            "run_pending": run_pending,
            "database_status_counts": status_counts,
            "error_passages": all_error_passages,
            "processed_results": [asdict(result) for result in processed_results],
            "log_file": str(log_path),
        }
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logging.info(
            "Finished: run_done=%s run_error=%s run_pending=%s database_status_counts=%s",
            run_done,
            run_error,
            run_pending,
            status_counts,
        )
        logging.info("Error passage IDs: %s", all_error_passages)
        logging.info("JSON report: %s", report_path)
        return 0 if run_error == 0 and run_pending == 0 else 2
    finally:
        connection.close()


def main() -> int:
    args = parse_args()
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        logging.warning(
            "Interrupted. Persisted batches remain saved; rerun to resume pending/error rows."
        )
        return 130
    except Exception as error:
        logging.exception("Formatter stopped: %s", error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
