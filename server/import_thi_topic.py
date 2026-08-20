"""Import the 10 verb tense CSV topics into a unified 'Thì' topic under Chuyên đề in TOEIC Grammar.

Generates server/migrations/20260820_01_import_grammar_thi_topic.sql and inserts rows into MySQL with cleanly formatted explanations.
"""

import csv
import re
from datetime import datetime
from pathlib import Path
from app.db import db

SERVER_DIR = Path(__file__).resolve().parent
CSV_DIR = Path("/home/spiderboy/Documents/Codex/2026-08-20/gi/outputs/zenlish_practice_clean_csv")
MIGRATION_FILE = SERVER_DIR / "migrations" / "20260820_01_import_grammar_thi_topic.sql"

TARGET_TOPICS_MAP = [
    ("top_19d084e287b4", "THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI ĐƠN", "subtopic_thi_hien_tai_don", "Thì hiện tại đơn", 1),
    ("top_9b9d5b1206a6", "THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI TIẾP DIỄN", "subtopic_thi_hien_tai_tiep_dien", "Thì hiện tại tiếp diễn", 2),
    ("top_944d06c688c8", "THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI HOÀN THÀNH", "subtopic_thi_hien_tai_hoan_thanh", "Thì hiện tại hoàn thành", 3),
    ("top_7b1dccb27dcd", "THÌ CỦA ĐỘNG TỪ - THÌ QUÁ KHỨ ĐƠN", "subtopic_thi_qua_khu_don", "Thì quá khứ đơn", 4),
    ("top_a5a436a14319", "THÌ CỦA ĐỘNG TỪ - THÌ QUÁ KHỨ TIẾP DIỄN", "subtopic_thi_qua_khu_tiep_dien", "Thì quá khứ tiếp diễn", 5),
    ("top_a6a3674a3912", "THÌ CỦA ĐỘNG TỪ - THÌ QUÁ KHỨ HOÀN THÀNH", "subtopic_thi_qua_khu_hoan_thanh", "Thì quá khứ hoàn thành", 6),
    ("top_a58e135cdb68", "THÌ CỦA ĐỘNG TỪ - THÌ TƯƠNG LAI ĐƠN", "subtopic_thi_tuong_lai_don", "Thì tương lai đơn", 7),
    ("top_2de6e9278066", "THÌ CỦA ĐỘNG TỪ - THÌ TƯƠNG LAI TIẾP DIỄN", "subtopic_thi_tuong_lai_tiep_dien", "Thì tương lai tiếp diễn", 8),
    ("top_540393e515fd", "THÌ CỦA ĐỘNG TỪ - THÌ TƯƠNG LAI HOÀN THÀNH", "subtopic_thi_tuong_lai_hoan_thanh", "Thì tương lai hoàn thành", 9),
    ("top_af33afc0a306", "THÌ CỦA ĐỘNG TỪ - THÌ TƯƠNG LAI GẦN", "subtopic_thi_tuong_lai_gan", "Thì tương lai gần", 10),
]

def sql_escape(val):
    if val is None:
        return "NULL"
    if isinstance(val, int):
        return str(val)
    escaped = (
        str(val)
        .replace("\\", "\\\\")
        .replace("'", "''")
        .replace("\r", "\\r")
        .replace("\n", "\\n")
    )
    return f"'{escaped}'"

def extract_translation(explanation_text: str):
    if not explanation_text:
        return None
    match = re.search(r"Dịch nghĩa:\s*\"?([^\"]+)\"?$", explanation_text.strip())
    if match:
        return match.group(1).strip()
    match2 = re.search(r"Dịch nghĩa:\s*(.+)$", explanation_text.strip())
    if match2:
        return match2.group(1).strip().strip('"')
    return None

def clean_and_format_explanation(text: str) -> str:
    if not text:
        return ""
    text = text.strip()

    # 1. Strip 'Dịch nghĩa: ...' from the end (since translation_vi stores it separately)
    text = re.sub(r"\s*Dịch nghĩa:\s*(.+)$", "", text, flags=re.DOTALL).strip()

    # 2. Strip redundant leading 'Đáp án đúng là: (X) <word>' if followed by 'Giải thích:' or text
    text = re.sub(r"^Đáp án đúng là:\s*\([A-D]\)[^\.]*?\s*(Giải thích:)", r"\1", text)
    text = re.sub(r"^Đáp án đúng là:[^\.]*?\s*(Giải thích:)", r"\1", text)
    text = re.sub(r"^Đáp án đúng là:\s*\([A-D]\)\s*", "", text)

    # 3. Put newlines before (A), (B), (C), (D) option breakdowns
    text = re.sub(r"(?<!\n)\s+(\([A-D]\)\s+)", r"\n\1", text)

    # 4. Clean excess newlines
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def build_data():
    csv_topic_to_subtopic = {item[0]: (item[2], item[3], item[4]) for item in TARGET_TOPICS_MAP}
    target_topic_ids = set(csv_topic_to_subtopic.keys())

    # Map tests to topic
    test_to_topic = {}
    with open(CSV_DIR / "tests.csv", "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["topic_id"] in target_topic_ids:
                test_to_topic[row["test_id"]] = row["topic_id"]

    # Map questions
    questions = []
    q_ids = set()
    with open(CSV_DIR / "questions.csv", "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["test_id"] in test_to_topic:
                questions.append(row)
                q_ids.add(row["question_id"])

    # Map answers
    answers_by_q = {}
    with open(CSV_DIR / "answers.csv", "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["question_id"] in q_ids:
                answers_by_q.setdefault(row["question_id"], {})[row["answer_letter"]] = row["answer_text"]

    main_topic = {
        "id": "topic_thi",
        "title_vi": "Thì",
        "order_index": 2,
    }

    subtopics = [
        {
            "id": sub_id,
            "topic_id": "topic_thi",
            "title_vi": sub_title,
            "order_index": sub_order,
        }
        for _, _, sub_id, sub_title, sub_order in TARGET_TOPICS_MAP
    ]

    question_rows = []
    membership_rows = []

    now_str = "2026-08-20 14:00:00"

    for idx, q in enumerate(questions, start=1):
        q_id = q["question_id"].strip()
        test_id = q["test_id"].strip()
        topic_id = test_to_topic[test_id]
        sub_id, sub_title, _ = csv_topic_to_subtopic[topic_id]

        choices = answers_by_q.get(q_id, {})
        opt_a = choices.get("A")
        opt_b = choices.get("B")
        opt_c = choices.get("C")
        opt_d = choices.get("D")

        raw_exp = q["explanation_text"].strip()
        trans_vi = extract_translation(raw_exp)
        formatted_exp = clean_and_format_explanation(raw_exp)

        q_row = {
            "id": q_id,
            "source_table": "zenlish_practice",
            "question_text": q["question_text"].strip(),
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "correct_answer": q["correct_answer_letter"].strip(),
            "explanation_vi": formatted_exp,
            "translation_vi": trans_vi,
            "updated_at": now_str,
        }
        question_rows.append(q_row)

        m_row = {
            "id": f"mem_topic_thi_{q_id}",
            "question_id": q_id,
            "source_mode": "topic",
            "topic_id": "topic_thi",
            "subtopic_id": sub_id,
            "question_number": int(q["question_number"]) if q["question_number"] else None,
            "order_index": idx,
            "source_url": "https://dautoeic.com/read?mode=grammar",
        }
        membership_rows.append(m_row)

    return main_topic, subtopics, question_rows, membership_rows

def generate_migration_sql(main_topic, subtopics, question_rows, membership_rows):
    lines = [
        "-- Migration: Add unified 'Thì' topic, subtopics, and questions from Zenlish practice CSV",
        "-- Date: 2026-08-20",
        "",
        "-- 1. Topic",
        f"INSERT INTO grammar_topics (id, title_vi, order_index) VALUES ({sql_escape(main_topic['id'])}, {sql_escape(main_topic['title_vi'])}, {main_topic['order_index']}) ON DUPLICATE KEY UPDATE title_vi=VALUES(title_vi), order_index=VALUES(order_index);",
        "",
        "-- 2. Subtopics",
    ]

    for s in subtopics:
        lines.append(
            f"INSERT INTO grammar_subtopics (id, topic_id, title_vi, order_index) VALUES ({sql_escape(s['id'])}, {sql_escape(s['topic_id'])}, {sql_escape(s['title_vi'])}, {s['order_index']}) ON DUPLICATE KEY UPDATE topic_id=VALUES(topic_id), title_vi=VALUES(title_vi), order_index=VALUES(order_index);"
        )

    lines.extend(["", "-- 3. Questions"])
    for q in question_rows:
        lines.append(
            f"INSERT INTO grammar_questions (id, source_table, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation_vi, translation_vi, updated_at) "
            f"VALUES ({sql_escape(q['id'])}, {sql_escape(q['source_table'])}, {sql_escape(q['question_text'])}, {sql_escape(q['option_a'])}, {sql_escape(q['option_b'])}, {sql_escape(q['option_c'])}, {sql_escape(q['option_d'])}, {sql_escape(q['correct_answer'])}, {sql_escape(q['explanation_vi'])}, {sql_escape(q['translation_vi'])}, {sql_escape(q['updated_at'])}) "
            f"ON DUPLICATE KEY UPDATE question_text=VALUES(question_text), option_a=VALUES(option_a), option_b=VALUES(option_b), option_c=VALUES(option_c), option_d=VALUES(option_d), correct_answer=VALUES(correct_answer), explanation_vi=VALUES(explanation_vi), translation_vi=VALUES(translation_vi), updated_at=VALUES(updated_at);"
        )

    lines.extend(["", "-- 4. Memberships"])
    for m in membership_rows:
        lines.append(
            f"INSERT INTO grammar_question_memberships (id, question_id, source_mode, topic_id, subtopic_id, question_number, order_index, source_url) "
            f"VALUES ({sql_escape(m['id'])}, {sql_escape(m['question_id'])}, {sql_escape(m['source_mode'])}, {sql_escape(m['topic_id'])}, {sql_escape(m['subtopic_id'])}, {sql_escape(m['question_number'])}, {m['order_index']}, {sql_escape(m['source_url'])}) "
            f"ON DUPLICATE KEY UPDATE question_id=VALUES(question_id), source_mode=VALUES(source_mode), topic_id=VALUES(topic_id), subtopic_id=VALUES(subtopic_id), question_number=VALUES(question_number), order_index=VALUES(order_index), source_url=VALUES(source_url);"
        )

    lines.append("")
    return "\n".join(lines)

def run_import():
    print("[+] Reading CSV data...")
    main_topic, subtopics, question_rows, membership_rows = build_data()
    print(f"[+] Parsed {len(subtopics)} subtopics, {len(question_rows)} questions, {len(membership_rows)} memberships.")

    print("[+] Generating migration SQL file...")
    sql_content = generate_migration_sql(main_topic, subtopics, question_rows, membership_rows)
    MIGRATION_FILE.write_text(sql_content, encoding="utf-8")
    print(f"[+] Wrote migration SQL to: {MIGRATION_FILE}")

    print("[+] Executing DB insertion transaction...")
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            # 1. Topic
            cursor.execute("""
                INSERT INTO grammar_topics (id, title_vi, order_index)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE title_vi=VALUES(title_vi), order_index=VALUES(order_index)
            """, (main_topic["id"], main_topic["title_vi"], main_topic["order_index"]))

            # 2. Subtopics
            cursor.executemany("""
                INSERT INTO grammar_subtopics (id, topic_id, title_vi, order_index)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE topic_id=VALUES(topic_id), title_vi=VALUES(title_vi), order_index=VALUES(order_index)
            """, [(s["id"], s["topic_id"], s["title_vi"], s["order_index"]) for s in subtopics])

            # 3. Questions
            cursor.executemany("""
                INSERT INTO grammar_questions (
                    id, source_table, question_text, option_a, option_b, option_c, option_d,
                    correct_answer, explanation_vi, translation_vi, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    question_text=VALUES(question_text), option_a=VALUES(option_a),
                    option_b=VALUES(option_b), option_c=VALUES(option_c), option_d=VALUES(option_d),
                    correct_answer=VALUES(correct_answer), explanation_vi=VALUES(explanation_vi),
                    translation_vi=VALUES(translation_vi), updated_at=VALUES(updated_at)
            """, [(q["id"], q["source_table"], q["question_text"], q["option_a"], q["option_b"], q["option_c"], q["option_d"], q["correct_answer"], q["explanation_vi"], q["translation_vi"], q["updated_at"]) for q in question_rows])

            # 4. Memberships
            cursor.executemany("""
                INSERT INTO grammar_question_memberships (
                    id, question_id, source_mode, topic_id, subtopic_id, question_number, order_index, source_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    question_id=VALUES(question_id), source_mode=VALUES(source_mode),
                    topic_id=VALUES(topic_id), subtopic_id=VALUES(subtopic_id),
                    question_number=VALUES(question_number), order_index=VALUES(order_index),
                    source_url=VALUES(source_url)
            """, [(m["id"], m["question_id"], m["source_mode"], m["topic_id"], m["subtopic_id"], m["question_number"], m["order_index"], m["source_url"]) for m in membership_rows])

    print("[+] Successfully imported 'Thì' topic into MySQL database!")

if __name__ == "__main__":
    run_import()
