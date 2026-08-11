"""Import the flattened grammar export into the normalized MySQL tables.

Usage:
    python import_grammar_csv.py "C:\\path\\to\\grammar_questions_flat.csv"

The import uses upserts, so it is safe to run again when the source CSV changes.
"""

import argparse
import csv
from collections import OrderedDict, defaultdict
from datetime import datetime
from pathlib import Path

from app.db import db


def as_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def as_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def chunks(items, size=500):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def import_csv(csv_path: Path):
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("CSV không có dữ liệu.")

    required = {"id", "question_id", "source_mode", "question_text", "correct_answer"}
    missing = required.difference(rows[0])
    if missing:
        raise ValueError(f"CSV thiếu các cột bắt buộc: {', '.join(sorted(missing))}")

    topics = OrderedDict()
    subtopics = OrderedDict()
    banks = OrderedDict()
    difficulties = OrderedDict()
    questions = OrderedDict()
    memberships = OrderedDict()
    bank_tests = defaultdict(set)
    bank_counts = defaultdict(int)

    for row in rows:
        mode = row["source_mode"].strip()
        if mode not in {"topic", "bank", "difficulty"}:
            continue
        topic_id = row.get("topic_id", "").strip() or None
        subtopic_id = row.get("subtopic_id", "").strip() or None
        bank_id = row.get("bank_set_id", "").strip() or None
        level = as_int(row.get("difficulty_level"))

        if topic_id and topic_id not in topics:
            topics[topic_id] = (
                topic_id, row.get("topic_name_vi") or "Chuyên đề ngữ pháp",
                len(topics) + 1,
            )
        if subtopic_id and topic_id and subtopic_id not in subtopics:
            subtopics[subtopic_id] = (
                subtopic_id, topic_id, row.get("subtopic_name_vi") or "Bài luyện tập",
                sum(1 for item in subtopics.values() if item[1] == topic_id) + 1,
                level,
            )
        if bank_id:
            bank_counts[bank_id] += 1
            if row.get("test_id"):
                bank_tests[bank_id].add(row["test_id"])
            if bank_id not in banks:
                name = row.get("bank_set_name") or "Ngân hàng đề"
                banks[bank_id] = (bank_id, name, as_int(name), len(banks) + 1)
        if level and level not in difficulties:
            difficulties[level] = (
                level,
                row.get("difficulty_name_vi") or f"Cấp độ {level}",
                row.get("source_url") or "https://dautoeic.com/read?mode=grammar&tab=difficulty",
            )

        question_id = row["question_id"].strip()
        question_values = (
            question_id, row.get("source_table") or "grammar_questions",
            row.get("question_text") or "", row.get("option_a") or None,
            row.get("option_b") or None, row.get("option_c") or None,
            row.get("option_d") or None, (row.get("correct_answer") or "").upper(),
            row.get("explanation_en") or None, row.get("explanation_vi") or None,
            row.get("translation_vi") or None, row.get("answer_translation_vi") or None,
            row.get("vocabulary") or None, level,
            1 if str(row.get("prefer_ai_explanation", "")).lower() == "true" else 0,
            as_datetime(row.get("created_at")), as_datetime(row.get("updated_at")),
        )
        if question_id in questions:
            previous = questions[question_id]
            question_values = tuple(
                new_value if new_value not in (None, "") else previous_value
                for previous_value, new_value in zip(previous, question_values)
            )
        questions[question_id] = question_values
        memberships[row["id"]] = (
            row["id"], question_id, mode, topic_id, subtopic_id, bank_id,
            row.get("test_id") or None, row.get("test_name") or None, level,
            as_int(row.get("question_number")), as_int(row.get("order_index"), 0),
            row.get("source_url") or "https://dautoeic.com/read?mode=grammar",
        )

    bank_rows = [
        (*value, len(bank_tests[value[0]]), bank_counts[value[0]], bank_counts[value[0]])
        for value in banks.values()
    ]

    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.executemany("""
                INSERT INTO grammar_topics (id, title_vi, order_index)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE title_vi=VALUES(title_vi), order_index=VALUES(order_index)
            """, list(topics.values()))
            cursor.executemany("""
                INSERT INTO grammar_subtopics (id, topic_id, title_vi, order_index, level)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE topic_id=VALUES(topic_id), title_vi=VALUES(title_vi),
                    order_index=VALUES(order_index), level=VALUES(level)
            """, list(subtopics.values()))
            cursor.executemany("""
                INSERT INTO grammar_bank_sets
                    (set_id, set_name, year, order_index, test_count, total_count, grammar_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE set_name=VALUES(set_name), year=VALUES(year),
                    order_index=VALUES(order_index), test_count=VALUES(test_count),
                    total_count=VALUES(total_count), grammar_count=VALUES(grammar_count)
            """, bank_rows)
            cursor.executemany("""
                INSERT INTO grammar_difficulty_levels (level, name_vi, source_url)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE name_vi=VALUES(name_vi), source_url=VALUES(source_url)
            """, sorted(difficulties.values()))
            question_sql = """
                INSERT INTO grammar_questions (
                    id, source_table, question_text, option_a, option_b, option_c, option_d,
                    correct_answer, explanation_en, explanation_vi, translation_vi,
                    answer_translation_vi, vocabulary, difficulty_level,
                    prefer_ai_explanation, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE question_text=VALUES(question_text),
                    option_a=VALUES(option_a), option_b=VALUES(option_b),
                    option_c=VALUES(option_c), option_d=VALUES(option_d),
                    correct_answer=VALUES(correct_answer), explanation_en=VALUES(explanation_en),
                    explanation_vi=VALUES(explanation_vi), translation_vi=VALUES(translation_vi),
                    answer_translation_vi=VALUES(answer_translation_vi), vocabulary=VALUES(vocabulary),
                    difficulty_level=VALUES(difficulty_level), updated_at=VALUES(updated_at)
            """
            for batch in chunks(list(questions.values())):
                cursor.executemany(question_sql, batch)
            membership_sql = """
                INSERT INTO grammar_question_memberships (
                    id, question_id, source_mode, topic_id, subtopic_id, bank_set_id,
                    test_id, test_name, difficulty_level, question_number, order_index, source_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE question_id=VALUES(question_id),
                    source_mode=VALUES(source_mode), topic_id=VALUES(topic_id),
                    subtopic_id=VALUES(subtopic_id), bank_set_id=VALUES(bank_set_id),
                    test_id=VALUES(test_id), test_name=VALUES(test_name),
                    difficulty_level=VALUES(difficulty_level), question_number=VALUES(question_number),
                    order_index=VALUES(order_index), source_url=VALUES(source_url)
            """
            for batch in chunks(list(memberships.values())):
                cursor.executemany(membership_sql, batch)

    print(
        f"Imported {len(questions):,} questions, {len(memberships):,} memberships, "
        f"{len(topics)} topics, {len(subtopics)} subtopics and {len(banks)} banks."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import TOEIC grammar CSV into MySQL")
    parser.add_argument("csv_path", type=Path)
    args = parser.parse_args()
    if not args.csv_path.is_file():
        parser.error(f"Không tìm thấy CSV: {args.csv_path}")
    import_csv(args.csv_path.resolve())
