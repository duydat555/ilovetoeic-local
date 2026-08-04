from __future__ import annotations

import argparse
import copy
import json
import logging
import re
from collections import Counter
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Sequence

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

import format_passage_translations as shared


BASE_DIR = Path(__file__).resolve().parent
PRIMARY_UNIT_TAGS = {
    "address", "blockquote", "caption", "h1", "h2", "h3", "h4",
    "h5", "h6", "li", "p", "pre", "tr",
}
FALLBACK_UNIT_TAGS = {"div", "td", "th"}
HIDDEN_TAGS = {"script", "style", "noscript", "template"}
ALIGNMENT_STOP_WORDS = {
    "about", "after", "also", "been", "before", "from", "have", "into",
    "more", "that", "their", "there", "these", "they", "this", "with",
    "your",
}
MARKUP_PATTERN = re.compile(
    r"</?(?:address|blockquote|br|caption|div|em|h[1-6]|i|li|ol|p|pre|span|strong|"
    r"table|tbody|td|tfoot|th|thead|tr|ul)(?:\s[^>]*)?/?>",
    re.IGNORECASE,
)
STABLE_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9@._/-]{1,}")
SENTENCE_BOUNDARY_PATTERN = re.compile(
    r"[.!?…]+(?:[\"'”’\)\]]*)?(?=\s|$)",
    re.UNICODE,
)
VI_METADATA_MARKER_PATTERN = re.compile(
    r"(?<!\w)(?:gửi(?:\s+đến)?|đến|từ|ngày|chủ\s+đề|về|cc|bcc|"
    r"đính\s+kèm|tệp\s+đính\s+kèm|địa\s+chỉ\s+email|e-?mail|"
    r"điện\s+thoại|liên\s+hệ)\s*[:：]",
    re.IGNORECASE | re.UNICODE,
)
AMBIGUOUS_TRANSLATION_OVERRIDES = {
    # Reviewed against every question in the shared passage on 2026-08-03.
    # "longest" rejects truncated values such as "(Xem bản dịch ở câu trước)".
    "91e25fab-c099-4209-85c0-53d081e22b93": "longest",
    "2600a1a4-6509-4a0a-9952-1175af12dba9": "longest",
    # This passage has one variant for the leading e-mail and another for the
    # two following memos. Both are approved DB substrings and must be kept.
    "4a5abd39-6fbf-4ca1-8cf2-afaeaf734118": "question-order-concat",
    "aa58a01d-5793-41d0-8ce9-b940fb979cba": "longest",
    # Near-identical variants: use the value approved on most questions.
    "75f9ebae-421d-4b31-bbec-a4d8c7c643f2": "majority",
    "833ed21b-3b44-41e5-9d33-073d2550f35c": "majority",
}


class LocalFormatError(RuntimeError):
    pass


def configure_logging(log_dir: Path) -> tuple[Path, Path]:
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = log_dir / f"passage_vi_local_{timestamp}.log"
    report_path = log_dir / f"passage_vi_local_{timestamp}.json"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(),
        ],
        force=True,
    )
    return log_path, report_path


def canonical_translation(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def resolve_translation(
    passage_row: dict[str, Any],
    question_rows: Sequence[dict[str, Any]],
    sources: shared.TranslationSources,
) -> tuple[str | None, str | None, str | None]:
    for column in sources.passage_columns:
        raw_value = passage_row.get(column)
        if isinstance(raw_value, str) and canonical_translation(raw_value):
            return raw_value, f"passages.{column}", None

    for column in sources.question_columns:
        unique_values: dict[str, str] = {}
        value_counts: Counter[str] = Counter()
        value_first_order: dict[str, int] = {}
        for order, row in enumerate(question_rows):
            raw_value = row.get(column)
            if not isinstance(raw_value, str):
                continue
            canonical = canonical_translation(raw_value)
            if canonical:
                unique_values.setdefault(canonical, raw_value)
                value_counts[canonical] += 1
                value_first_order.setdefault(canonical, order)
        if len(unique_values) == 1:
            return next(iter(unique_values.values())), f"questions.{column}", None
        if len(unique_values) > 1:
            strategy = AMBIGUOUS_TRANSLATION_OVERRIDES.get(str(passage_row.get("id")))
            if strategy == "longest":
                selected = max(unique_values, key=lambda value: (len(value), value))
                return (
                    unique_values[selected],
                    f"questions.{column}:reviewed-longest",
                    None,
                )
            if strategy == "majority":
                selected = max(
                    unique_values,
                    key=lambda value: (value_counts[value], len(value), value),
                )
                return (
                    unique_values[selected],
                    f"questions.{column}:reviewed-majority",
                    None,
                )
            if strategy == "question-order-concat":
                selected_values = sorted(unique_values, key=value_first_order.__getitem__)
                return (
                    "\n".join(unique_values[value].strip() for value in selected_values),
                    f"questions.{column}:reviewed-question-order-concat",
                    None,
                )
            lengths = sorted(len(value) for value in unique_values)
            return (
                None,
                None,
                f"Ambiguous approved translation in questions.{column}: "
                f"{len(unique_values)} variants, lengths={lengths}",
            )

    return None, None, "Approved translation is unavailable"


def source_text_by_column(passage_row: dict[str, Any]) -> dict[str, str]:
    result: dict[str, str] = {}
    for source_column in shared.SOURCE_TO_OUTPUT_COLUMN:
        value = passage_row.get(source_column)
        if isinstance(value, str) and value.strip():
            result[source_column] = value
    return result


def is_hidden_text_node(node: NavigableString) -> bool:
    parent = node.parent
    while isinstance(parent, Tag):
        if parent.name in HIDDEN_TAGS:
            return True
        parent = parent.parent
    return False


def visible_text_nodes(root: Tag) -> list[NavigableString]:
    return [
        node
        for node in root.descendants
        if isinstance(node, NavigableString)
        and not isinstance(node, Comment)
        and str(node).strip()
        and not is_hidden_text_node(node)
    ]


def visible_text(tag: Tag) -> str:
    return " ".join(str(node) for node in visible_text_nodes(tag))


def get_content_units(root: Tag) -> list[Tag]:
    candidates = root.find_all(list(PRIMARY_UNIT_TAGS | FALLBACK_UNIT_TAGS))
    primary_candidates = [tag for tag in candidates if tag.name in PRIMARY_UNIT_TAGS]
    units: list[Tag] = []
    for candidate in candidates:
        if candidate.name == "tr":
            units.append(candidate)
            continue
        if candidate.find_parent("tr") is not None:
            continue
        if candidate.name in FALLBACK_UNIT_TAGS:
            if candidate.find(list(PRIMARY_UNIT_TAGS)) is None and visible_text(candidate).strip():
                units.append(candidate)
            continue
        has_nested_primary = any(
            nested is not candidate
            and nested.name != "tr"
            and candidate in nested.parents
            for nested in primary_candidates
        )
        if not has_nested_primary:
            units.append(candidate)

    if not units and visible_text(root).strip():
        units.append(root)
    return units


def split_sentences_exact(text: str) -> list[str]:
    boundaries = [match.end() for match in SENTENCE_BOUNDARY_PATTERN.finditer(text)]
    if not boundaries:
        return [text]
    result: list[str] = []
    start = 0
    for end in boundaries:
        chunk = text[start:end]
        if chunk.strip():
            result.append(chunk)
        elif result:
            result[-1] += chunk
        start = end
    tail = text[start:]
    if tail:
        if tail.strip():
            result.append(tail)
        elif result:
            result[-1] += tail
    return result or [text]


def split_proportionally_exact(text: str, count: int) -> list[str]:
    word_matches = list(re.finditer(r"\S+", text, re.UNICODE))
    count = min(count, len(word_matches))
    if count <= 1:
        return [text]
    boundaries: list[int] = []
    for index in range(1, count):
        word_index = round(index * len(word_matches) / count)
        word_index = max(1, min(word_index, len(word_matches) - 1))
        boundary = word_matches[word_index].start()
        if not boundaries or boundary > boundaries[-1]:
            boundaries.append(boundary)
    result: list[str] = []
    start = 0
    for boundary in boundaries:
        result.append(text[start:boundary])
        start = boundary
    result.append(text[start:])
    return [segment for segment in result if segment.strip()]


def split_embedded_metadata_exact(text: str) -> list[str]:
    matches = list(VI_METADATA_MARKER_PATTERN.finditer(text))
    if len(matches) <= 1:
        return [text]
    boundaries = [match.start() for match in matches]
    result: list[str] = []
    if boundaries[0] > 0 and text[:boundaries[0]].strip():
        result.append(text[:boundaries[0]])
    for index, start in enumerate(boundaries):
        end = boundaries[index + 1] if index + 1 < len(boundaries) else len(text)
        result.append(text[start:end])
    return [segment for segment in result if segment.strip()]


def extract_translation_segments(translation: str, desired_count: int) -> list[str]:
    normalized = canonical_translation(translation)
    if not normalized:
        return []
    if MARKUP_PATTERN.search(normalized):
        document = BeautifulSoup(normalized, "html.parser")
        segments = [str(node) for node in visible_text_nodes(document) if str(node).strip()]
        if not segments:
            raise LocalFormatError("Approved HTML translation contains no visible text")
        return segments

    line_chunks = normalized.splitlines(keepends=True)
    segments: list[str] = []
    leading_whitespace = ""
    for chunk in line_chunks:
        if chunk.strip():
            if leading_whitespace:
                chunk = leading_whitespace + chunk
                leading_whitespace = ""
            segments.append(chunk)
        elif segments:
            segments[-1] += chunk
        else:
            leading_whitespace += chunk
    if leading_whitespace and segments:
        segments[-1] += leading_whitespace
    if not segments:
        segments = [normalized]

    segments = [
        split_segment
        for segment in segments
        for split_segment in split_embedded_metadata_exact(segment)
    ]

    if len(segments) == 1 and desired_count > 1:
        sentence_segments = split_sentences_exact(segments[0])
        segments = sentence_segments
    if len(segments) == 1 and desired_count > 1:
        segments = split_proportionally_exact(segments[0], desired_count)
    return segments


def stable_tokens(text: str) -> set[str]:
    tokens = set()
    for match in STABLE_TOKEN_PATTERN.finditer(text):
        token = match.group(0).casefold()
        if "@" in token or any(char.isdigit() for char in token):
            tokens.add(token)
        elif len(token) >= 4 and token not in ALIGNMENT_STOP_WORDS:
            tokens.add(token)
    return tokens


def metadata_kind(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.casefold()).strip()
    normalized = re.sub(r"^[\s\"'“”‘’\[\]()*_-]+", "", normalized)
    definitions = (
        ("to", r"^(?:to|gửi(?:\s+đến)?|đến|kính gửi)\s*:"),
        ("from", r"^(?:from|từ)\s*:"),
        ("date", r"^(?:date|ngày)\s*:"),
        ("subject", r"^(?:subject|re|chủ đề|về)\s*:"),
        ("contact", r"^(?:contact|liên hệ)\s*:"),
        ("name", r"^(?:name|tên)\s*[:：]?"),
        # "Email" and "Email: Dear ..." are document labels. Treat this as
        # metadata only when the value actually begins with an e-mail address.
        ("email", r"^(?:e-?mail|thư điện tử|địa chỉ email)\s*[:：]\s*(?=\S+@\S+)"),
        ("address", r"^(?:address|địa chỉ)\s*[:：]?"),
        ("phone", r"^(?:phone|điện thoại)\s*[:：]?"),
        ("attachment", r"^(?:attachment|tệp đính kèm|đính kèm)\s*[:：]?"),
    )
    for kind, pattern in definitions:
        if re.search(pattern, normalized, re.UNICODE):
            return kind
    return ""


def metadata_kinds(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text.casefold())
    definitions = (
        ("to", r"(?<!\w)(?:to|gửi(?:\s+đến)?|đến|kính gửi)\s*[:：]"),
        ("from", r"(?<!\w)(?:from|từ)\s*[:：]"),
        ("date", r"(?<!\w)(?:date|sent|ngày)\s*[:：]"),
        ("subject", r"(?<!\w)(?:subject|re|chủ đề|về)\s*[:：]"),
        ("contact", r"(?<!\w)(?:contact|liên hệ)\s*[:：]"),
        ("name", r"(?<!\w)(?:name|tên)\s*[:：]"),
        ("email", r"(?<!\w)(?:e-?mail|thư điện tử|địa chỉ email)\s*[:：]"),
        ("address", r"(?<!\w)(?:address|địa chỉ)\s*[:：]"),
        ("phone", r"(?<!\w)(?:phone|điện thoại)\s*[:：]"),
        ("attachment", r"(?<!\w)(?:attachment|tệp đính kèm|đính kèm)\s*[:：]"),
    )
    events: list[tuple[int, int, str]] = []
    for priority, (kind, pattern) in enumerate(definitions):
        events.extend(
            (match.start(), priority, kind)
            for match in re.finditer(pattern, normalized, re.UNICODE)
        )
    events.sort()
    result: list[str] = []
    seen_positions: set[int] = set()
    for position, _priority, kind in events:
        if position in seen_positions:
            continue
        seen_positions.add(position)
        result.append(kind)
    return result


def is_structural_title(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.casefold()).strip(
        " \t\r\n\"'“”‘’[]():*_"
    )
    if len(normalized.split()) <= 7 and re.search(r"(?:^|[-–— ])e-?mail$", normalized):
        return True
    return bool(re.fullmatch(
        r"(?:email|e-mail|thư điện tử)(?: \d+)?|"
        r"(?:memo|bản ghi nhớ)(?: \d+)?|"
        r"(?:website|web page|trang web)(?: \d+)?|"
        r"(?:text message|chat|tin nhắn)(?: \d+)?|"
        r"(?:advertisement|ad|quảng cáo)(?: \d+)?|"
        r"(?:notice|announcement|thông báo)(?: \d+)?|"
        r"(?:invoice|hóa đơn)(?: \d+)?|"
        r"(?:order form|đơn đặt hàng)(?: \d+)?|"
        r"(?:schedule|lịch trình)(?: \d+)?|"
        r"(?:article|bài báo)(?: \d+)?|"
        r"(?:form|biểu mẫu)(?: \d+)?",
        normalized,
        re.UNICODE,
    ))


def assert_metadata_alignment(blocks: Sequence[Tag], source_texts: Sequence[str]) -> None:
    for index, (block, source_text) in enumerate(zip(blocks, source_texts)):
        source_kind = metadata_kind(source_text)
        if not source_kind:
            continue
        source_kinds = metadata_kinds(source_text)
        # A unit containing several header fields plus the message body is a
        # whole document, not one metadata row. Its approved translation may
        # legitimately omit those technical fields and start with the body.
        if len(source_kinds) != 1:
            continue
        output_text = visible_text(block).strip()
        if not output_text:
            continue
        output_kind = metadata_kind(output_text)
        if output_kind not in source_kinds:
            raise LocalFormatError(
                f"Metadata row {index} changed kind {source_kind!r} -> "
                f"{output_kind or 'unlabeled'!r}: {output_text[:160]!r}"
            )


def alignment_score(
    source_text: str,
    translated_segment: str,
    source_index: int,
    segment_index: int,
    source_count: int,
    segment_count: int,
) -> float:
    source_tokens = stable_tokens(source_text)
    translated_tokens = stable_tokens(translated_segment)
    score = 1.0
    for token in source_tokens & translated_tokens:
        score += 3.0 if "@" in token or any(char.isdigit() for char in token) else 1.5
    source_kind = metadata_kind(source_text)
    if source_kind and source_kind == metadata_kind(translated_segment):
        score += 6.0
    source_position = source_index / (source_count - 1) if source_count > 1 else 0.0
    segment_position = segment_index / (segment_count - 1) if segment_count > 1 else 0.0
    score += max(0.0, 1.0 - abs(source_position - segment_position)) * 0.4
    return score


def align_fewer_segments(segments: Sequence[str], source_texts: Sequence[str]) -> list[list[str]]:
    source_count = len(source_texts)
    segment_count = len(segments)
    scores = [
        [float("-inf")] * (segment_count + 1)
        for _ in range(source_count + 1)
    ]
    choices: list[list[str | None]] = [
        [None] * (segment_count + 1)
        for _ in range(source_count + 1)
    ]
    scores[0][0] = 0.0
    for source_index in range(1, source_count + 1):
        scores[source_index][0] = scores[source_index - 1][0] - 0.35
        choices[source_index][0] = "skip"
        for segment_index in range(1, min(source_index, segment_count) + 1):
            skip_score = scores[source_index - 1][segment_index] - 0.35
            match_score = scores[source_index - 1][segment_index - 1] + alignment_score(
                source_texts[source_index - 1],
                segments[segment_index - 1],
                source_index - 1,
                segment_index - 1,
                source_count,
                segment_count,
            )
            if match_score >= skip_score:
                scores[source_index][segment_index] = match_score
                choices[source_index][segment_index] = "match"
            else:
                scores[source_index][segment_index] = skip_score
                choices[source_index][segment_index] = "skip"

    allocations = [[] for _ in source_texts]
    source_index = source_count
    segment_index = segment_count
    while source_index > 0:
        if segment_index > 0 and choices[source_index][segment_index] == "match":
            allocations[source_index - 1] = [segments[segment_index - 1]]
            segment_index -= 1
        source_index -= 1
    if segment_index != 0:
        raise LocalFormatError("Could not align all translation segments")
    return allocations


def allocate_segments(
    segments: Sequence[str],
    source_texts: Sequence[str],
    capacities: Sequence[int],
) -> list[list[str]]:
    if not source_texts:
        raise LocalFormatError("Source HTML contains no placement unit")
    source_count = len(source_texts)
    segment_count = len(segments)
    # Some source e-mails are a single styled div with many <br> elements.
    # The approved translation may intentionally omit its technical header;
    # there is no semantic placement choice when only one unit exists.
    if source_count == 1:
        return [list(segments)]
    scores = [
        [float("-inf")] * (segment_count + 1)
        for _ in range(source_count + 1)
    ]
    choices: list[list[int | None]] = [
        [None] * (segment_count + 1)
        for _ in range(source_count + 1)
    ]
    scores[0][0] = 0.0
    for source_index in range(1, source_count + 1):
        for segment_index in range(segment_count + 1):
            skip_score = scores[source_index - 1][segment_index] - 0.35
            if skip_score > scores[source_index][segment_index]:
                scores[source_index][segment_index] = skip_score
                choices[source_index][segment_index] = 0
            max_take = (
                segment_count
                if source_count == 1
                else min(
                    segment_count,
                    max(
                        8,
                        segment_count - source_count + 4,
                        capacities[source_index - 1] + 4,
                    ),
                )
            )
            for take in range(1, min(segment_index, max_take) + 1):
                previous_score = scores[source_index - 1][segment_index - take]
                if previous_score == float("-inf"):
                    continue
                group = "".join(segments[segment_index - take:segment_index])
                source_kind = metadata_kind(source_texts[source_index - 1])
                group_kind = metadata_kind(group)
                if source_kind:
                    if group_kind not in metadata_kinds(source_texts[source_index - 1]):
                        continue
                elif group_kind:
                    # A standalone source date is commonly written as
                    # "April 5" without a "Date:" label, while its approved
                    # Vietnamese counterpart includes "Ngày:".
                    source_is_unlabelled_date = bool(
                        group_kind == "date"
                        and re.search(
                            r"^(?:\d{1,2}[/-]|(?:january|february|march|april|may|june|"
                            r"july|august|september|october|november|december)\b)",
                            source_texts[source_index - 1].strip(),
                            re.IGNORECASE,
                        )
                    )
                    if not source_is_unlabelled_date:
                        continue
                capacity_overflow = max(0, take - max(1, capacities[source_index - 1]))
                match_score = previous_score + alignment_score(
                    source_texts[source_index - 1],
                    group,
                    source_index - 1,
                    segment_index - take,
                    source_count,
                    segment_count,
                ) - (take - 1) * 0.12 - capacity_overflow * 0.08
                if match_score > scores[source_index][segment_index]:
                    scores[source_index][segment_index] = match_score
                    choices[source_index][segment_index] = take

    allocations: list[list[str]] = [[] for _ in source_texts]
    source_index = source_count
    segment_index = segment_count
    while source_index > 0:
        take = choices[source_index][segment_index]
        if take is None:
            raise LocalFormatError("Could not align every translation segment")
        if take > 0:
            allocations[source_index - 1] = list(
                segments[segment_index - take:segment_index]
            )
            segment_index -= take
        source_index -= 1
    if segment_index != 0:
        raise LocalFormatError("Could not allocate every translation segment")
    return allocations


def is_emphasized(node: NavigableString) -> bool:
    parent = node.parent
    while isinstance(parent, Tag):
        if parent.name in {"b", "strong", "em", "i"}:
            return True
        parent = parent.parent
    return False


def place_translation(
    block: Tag,
    destinations: Sequence[NavigableString],
    translated_parts: Sequence[str],
) -> None:
    parts = [part.strip() for part in translated_parts if part.strip()]
    if not parts:
        return

    def insert_parts_after(destination: NavigableString) -> None:
        first = NavigableString(parts[0])
        destination.replace_with(first)
        cursor: NavigableString | Comment = first
        for part in parts[1:]:
            separator = NavigableString(" ")
            cursor.insert_after(separator)
            marker = Comment("translation-segment")
            separator.insert_after(marker)
            value = NavigableString(part)
            marker.insert_after(value)
            cursor = value

    if not destinations:
        placeholder = NavigableString("")
        block.append(placeholder)
        insert_parts_after(placeholder)
        return
    if len(parts) == len(destinations):
        for destination, part in zip(destinations, parts):
            destination.replace_with(NavigableString(part))
        return
    if len(parts) > 1:
        target = next((node for node in destinations if not is_emphasized(node)), destinations[0])
        insert_parts_after(target)
        return

    translated_text = parts[0]
    if len(destinations) == 1:
        destinations[0].replace_with(NavigableString(translated_text))
        return

    label_end_match = re.search(r"[:：]", translated_text)
    if label_end_match is not None:
        label_end = label_end_match.end()
        destinations[0].replace_with(NavigableString(translated_text[:label_end].strip()))
        destinations[1].replace_with(NavigableString(translated_text[label_end:].strip()))
        return

    source_delimiter = re.search(r"^[—–|]", str(destinations[1]))
    if is_emphasized(destinations[0]) and source_delimiter:
        delimiter_index = translated_text.find(source_delimiter.group(0))
        if delimiter_index > 0:
            destinations[0].replace_with(
                NavigableString(translated_text[:delimiter_index].strip())
            )
            destinations[1].replace_with(
                NavigableString(translated_text[delimiter_index:].strip())
            )
            return

    target = next((node for node in destinations if not is_emphasized(node)), destinations[0])
    target.replace_with(NavigableString(translated_text))


def assert_visible_text_is_verbatim(
    html_by_column: dict[str, str],
    approved_translation: str,
) -> None:
    for html in html_by_column.values():
        document = BeautifulSoup(html, "html.parser")
        wrapper = BeautifulSoup("<div data-local-audit-root></div>", "html.parser").div
        if wrapper is None:
            raise LocalFormatError("Could not create audit wrapper")
        wrapper.append(copy.copy(document))
        for node in visible_text_nodes(wrapper):
            text = str(node).strip()
            if text and text not in approved_translation:
                raise LocalFormatError(
                    f"Output text node is not a verbatim DB substring: {text[:120]!r}"
                )


def format_locally(
    source_by_column: dict[str, str],
    approved_translation: str,
) -> tuple[dict[str, str], shared.VerificationResult]:
    documents: list[tuple[str, Tag, tuple[Any, ...]]] = []
    blocks: list[Tag] = []
    source_texts: list[str] = []
    capacities: list[int] = []
    for column, source_html in source_by_column.items():
        document = BeautifulSoup(
            f'<div data-local-format-root="{column}">{source_html}</div>',
            "html.parser",
        )
        root = document.find("div", attrs={"data-local-format-root": column})
        if not isinstance(root, Tag):
            raise LocalFormatError(f"Could not parse source HTML for {column}")
        signature = shared.tag_topology_signature(root)
        slot_blocks = get_content_units(root)
        documents.append((column, root, signature))
        for block in slot_blocks:
            blocks.append(block)
            source_texts.append(visible_text(block))
            capacities.append(max(1, len(block.find_all("br")) + 1))

    if not blocks:
        first_root = documents[0][1]
        blocks.append(first_root)
        source_texts.append(visible_text(first_root))
        capacities.append(1)

    raw_segments = extract_translation_segments(approved_translation, len(blocks))
    if not raw_segments:
        raise LocalFormatError("Approved translation contains no visible text")
    segments: list[str] = []
    structural_titles: list[tuple[int, str]] = []
    for segment in raw_segments:
        if re.fullmatch(r"[-–—_*\s]+", segment):
            continue
        if is_structural_title(segment):
            structural_titles.append((len(segments), segment))
        else:
            segments.append(segment)
    if not segments:
        segments = [segment for segment in raw_segments if segment.strip()]
        structural_titles = []
    allocations = allocate_segments(segments, source_texts, capacities)

    node_to_block: dict[int, int] = {}
    for index, block in enumerate(blocks):
        for node in visible_text_nodes(block):
            node_to_block[id(node)] = index
    destinations: list[list[NavigableString]] = [[] for _ in blocks]
    for _column, root, _signature in documents:
        for node in list(visible_text_nodes(root)):
            replacement = NavigableString("")
            block_index = node_to_block.get(id(node))
            node.replace_with(replacement)
            if block_index is not None:
                destinations[block_index].append(replacement)

    segment_to_block: list[int] = []
    for block_index, allocated_parts in enumerate(allocations):
        segment_to_block.extend([block_index] * len(allocated_parts))
    if len(segment_to_block) != len(segments):
        raise LocalFormatError("Internal segment-to-block alignment mismatch")

    used_title_blocks: set[int] = set()
    for before_segment_index, title in structural_titles:
        if before_segment_index < len(segment_to_block):
            block_index = segment_to_block[before_segment_index]
        else:
            block_index = segment_to_block[-1]
        previous_block_index = (
            segment_to_block[before_segment_index - 1]
            if before_segment_index > 0
            else -1
        )
        matching_title_block = next(
            (
                candidate_index
                for candidate_index in range(previous_block_index + 1, block_index + 1)
                if candidate_index not in used_title_blocks
                and not allocations[candidate_index]
                and is_structural_title(source_texts[candidate_index])
            ),
            None,
        )
        if matching_title_block is not None:
            place_translation(
                blocks[matching_title_block],
                destinations[matching_title_block],
                [title],
            )
            used_title_blocks.add(matching_title_block)
            continue
        block = blocks[block_index]
        anchor = block.find_parent("table") if block.name == "tr" else block
        title_node = NavigableString(title)
        if anchor is None or any(anchor is root for _column, root, _signature in documents):
            block.insert(0, title_node)
        else:
            anchor.insert_before(title_node)

    for index, block in enumerate(blocks):
        place_translation(block, destinations[index], allocations[index])

    assert_metadata_alignment(blocks, source_texts)

    html_by_column: dict[str, str] = {}
    for column, root, signature in documents:
        if shared.tag_topology_signature(root) != signature:
            raise LocalFormatError(f"Local formatter changed tag topology for {column}")
        html_by_column[shared.SOURCE_TO_OUTPUT_COLUMN[column]] = root.decode_contents()

    assert_visible_text_is_verbatim(html_by_column, approved_translation)
    combined_html = "\n".join(html_by_column.values())
    verification_source = (
        shared.visible_text_from_html(approved_translation)
        if MARKUP_PATTERN.search(approved_translation)
        else approved_translation
    )
    verification = shared.verify_word_multiset(verification_source, combined_html)
    if verification.similarity != 1.0:
        raise LocalFormatError(
            f"Local formatter multiset similarity is {verification.similarity:.6f}, expected 1.0; "
            f"missing={verification.missing_tokens}, extra={verification.extra_tokens}"
        )
    return html_by_column, verification


def chunks(values: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


def parse_statuses(raw: str) -> tuple[str, ...]:
    statuses = tuple(dict.fromkeys(part.strip() for part in raw.split(",") if part.strip()))
    invalid = set(statuses) - {"pending", "done", "error"}
    if not statuses or invalid:
        raise argparse.ArgumentTypeError(f"Invalid statuses: {sorted(invalid)}")
    return statuses


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Format approved passage translations locally without any AI/API call."
    )
    parser.add_argument("--statuses", default="pending,done,error")
    parser.add_argument("--test-id", action="append", default=[])
    parser.add_argument("--passage-id", action="append", default=[])
    parser.add_argument("--limit", type=int)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--translation-table")
    parser.add_argument("--translation-column")
    parser.add_argument("--log-dir", type=Path, default=BASE_DIR / "logs")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.batch_size <= 0:
        raise SystemExit("--batch-size must be greater than zero")
    statuses = parse_statuses(args.statuses)
    log_path, report_path = configure_logging(args.log_dir)
    connection = shared.database_connection()
    started_at = shared.utc_now_iso()
    results: list[shared.ProcessResult] = []
    error_reasons: Counter[str] = Counter()
    try:
        shared.assert_format_schema(connection)
        sources = shared.detect_translation_sources(
            connection,
            args.translation_table,
            args.translation_column,
        )
        rows = shared.fetch_candidate_passages(
            connection,
            statuses,
            tuple(args.test_id),
            args.limit,
        )
        if args.passage_id:
            selected_passage_ids = set(args.passage_id)
            rows = [row for row in rows if str(row["id"]) in selected_passage_ids]
        question_rows = shared.fetch_question_translation_rows(
            connection,
            [str(row["id"]) for row in rows],
            sources.question_columns,
        )
        logging.info(
            "Selected %s rows; sources passages=%s questions=%s; dry_run=%s",
            len(rows),
            list(sources.passage_columns),
            list(sources.question_columns),
            args.dry_run,
        )

        for batch_number, batch in enumerate(chunks(rows, args.batch_size), start=1):
            batch_results: list[shared.ProcessResult] = []
            for row in batch:
                passage_id = str(row["id"])
                test_id = str(row["test_id"])
                source_by_column = source_text_by_column(row)
                translation, translation_source, translation_error = resolve_translation(
                    row,
                    question_rows.get(passage_id, []),
                    sources,
                )
                if not source_by_column:
                    error = "Passage has no non-empty source HTML column"
                    result = shared.ProcessResult(
                        passage_id=passage_id,
                        test_id=test_id,
                        status="error",
                        error=error,
                    )
                    error_reasons[error] += 1
                elif translation_error or translation is None:
                    error = translation_error or "Approved translation is unavailable"
                    category = "ambiguous_translation" if error.startswith("Ambiguous") else error
                    result = shared.ProcessResult(
                        passage_id=passage_id,
                        test_id=test_id,
                        status="error",
                        error=error,
                    )
                    error_reasons[category] += 1
                else:
                    try:
                        html_by_column, verification = format_locally(
                            source_by_column,
                            translation,
                        )
                        result = shared.ProcessResult(
                            passage_id=passage_id,
                            test_id=test_id,
                            status="done",
                            html_by_column=html_by_column,
                            similarity=verification.similarity,
                            translation_source=translation_source,
                        )
                    except Exception as error:
                        reason = f"{type(error).__name__}: {error}"
                        result = shared.ProcessResult(
                            passage_id=passage_id,
                            test_id=test_id,
                            status="error",
                            error=reason,
                            translation_source=translation_source,
                        )
                        error_reasons[type(error).__name__] += 1
                batch_results.append(result)

            if not args.dry_run:
                shared.persist_results(connection, batch_results)
            results.extend(batch_results)
            done = sum(result.status == "done" for result in results)
            errors = len(results) - done
            logging.info(
                "Progress %s/%s: done=%s error=%s batch=%s%s",
                len(results),
                len(rows),
                done,
                errors,
                batch_number,
                " (dry-run)" if args.dry_run else " committed",
            )

        if args.dry_run:
            status_counts, error_passages = shared.database_status_summary(connection)
        else:
            status_counts, error_passages = shared.database_status_summary(connection)
        run_done = sum(result.status == "done" for result in results)
        run_error = len(results) - run_done
        report = {
            "started_at": started_at,
            "finished_at": shared.utc_now_iso(),
            "mode": "local_no_ai_no_external_api",
            "dry_run": args.dry_run,
            "selected_rows": len(rows),
            "run_done": run_done,
            "run_error": run_error,
            "error_reason_counts": dict(error_reasons),
            "database_status_counts": status_counts,
            "database_error_passages": error_passages,
            "errors": [asdict(result) for result in results if result.status == "error"],
            "log_file": str(log_path),
        }
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logging.info(
            "Finished: done=%s error=%s database=%s report=%s",
            run_done,
            run_error,
            status_counts,
            report_path,
        )
        return 0 if run_error == 0 else 2
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
