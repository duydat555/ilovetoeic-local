from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from app.db import db


router = APIRouter(prefix="/api/v1/grammar", tags=["Grammar"])


@router.get("/catalog")
def get_grammar_catalog():
    question_total = db.fetch_one("SELECT COUNT(*) AS total FROM grammar_questions")
    mode_counts = db.fetch_all(
        "SELECT source_mode, COUNT(*) AS question_count "
        "FROM grammar_question_memberships GROUP BY source_mode"
    )
    topics = db.fetch_all("""
        SELECT t.id, t.title_vi, t.description_vi, t.icon, t.order_index,
               COUNT(m.id) AS question_count
        FROM grammar_topics t
        LEFT JOIN grammar_question_memberships m
          ON m.topic_id = t.id AND m.source_mode = 'topic'
        WHERE t.is_hidden = 0
        GROUP BY t.id, t.title_vi, t.description_vi, t.icon, t.order_index
        ORDER BY t.order_index ASC, t.title_vi ASC
    """)
    subtopics = db.fetch_all("""
        SELECT s.id, s.topic_id, s.title_vi, s.description_vi, s.level,
               s.order_index, COUNT(m.id) AS question_count
        FROM grammar_subtopics s
        LEFT JOIN grammar_question_memberships m
          ON m.subtopic_id = s.id AND m.source_mode = 'topic'
        WHERE s.is_hidden = 0
        GROUP BY s.id, s.topic_id, s.title_vi, s.description_vi, s.level, s.order_index
        ORDER BY s.topic_id ASC, s.order_index ASC, s.title_vi ASC
    """)
    banks = db.fetch_all("""
        SELECT b.set_id, b.set_name, b.year, b.order_index,
               COUNT(m.id) AS question_count,
               COUNT(DISTINCT m.test_id) AS test_count
        FROM grammar_bank_sets b
        LEFT JOIN grammar_question_memberships m
          ON m.bank_set_id = b.set_id AND m.source_mode = 'bank'
        GROUP BY b.set_id, b.set_name, b.year, b.order_index
        ORDER BY b.order_index ASC, b.year DESC, b.set_name DESC
    """)
    difficulties = db.fetch_all("""
        SELECT d.level, d.name_vi, COUNT(m.id) AS question_count
        FROM grammar_difficulty_levels d
        LEFT JOIN grammar_question_memberships m
          ON m.difficulty_level = d.level AND m.source_mode = 'difficulty'
        GROUP BY d.level, d.name_vi ORDER BY d.level ASC
    """)
    tests = db.fetch_all("""
        SELECT bank_set_id, test_id, test_name, COUNT(*) AS question_count,
               MIN(order_index) AS order_index
        FROM grammar_question_memberships
        WHERE source_mode = 'bank' AND test_id IS NOT NULL
        GROUP BY bank_set_id, test_id, test_name
        ORDER BY bank_set_id ASC, order_index ASC, test_name ASC
    """)

    subtopics_by_topic = {}
    for item in subtopics:
        subtopics_by_topic.setdefault(item["topic_id"], []).append(item)
    tests_by_bank = {}
    for item in tests:
        tests_by_bank.setdefault(item["bank_set_id"], []).append(item)
    for topic in topics:
        topic["subtopics"] = subtopics_by_topic.get(topic["id"], [])
    for bank in banks:
        bank["tests"] = tests_by_bank.get(bank["set_id"], [])

    return {
        "success": True,
        "question_count": int(question_total["total"]) if question_total else 0,
        "mode_counts": {item["source_mode"]: int(item["question_count"]) for item in mode_counts},
        "topics": topics,
        "banks": banks,
        "difficulties": difficulties,
    }


@router.get("/questions")
def get_grammar_questions(
    mode: Literal["topic", "bank", "difficulty"] = Query(...),
    topic_id: Optional[str] = None,
    subtopic_id: Optional[str] = None,
    bank_set_id: Optional[str] = None,
    test_id: Optional[str] = None,
    difficulty_level: Optional[int] = Query(default=None, ge=1, le=5),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
):
    filters = ["m.source_mode = ?"]
    params = [mode]
    for clause, value in (
        ("m.topic_id = ?", topic_id),
        ("m.subtopic_id = ?", subtopic_id),
        ("m.bank_set_id = ?", bank_set_id),
        ("m.test_id = ?", test_id),
        ("m.difficulty_level = ?", difficulty_level),
    ):
        if value is not None:
            filters.append(clause)
            params.append(value)
    where_clause = " AND ".join(filters)
    count_row = db.fetch_one(
        f"SELECT COUNT(*) AS total FROM grammar_question_memberships m WHERE {where_clause}",
        tuple(params),
    )
    total = int(count_row["total"]) if count_row else 0
    if total == 0:
        raise HTTPException(status_code=404, detail="Không có câu hỏi ngữ pháp phù hợp với lựa chọn này.")

    rows = db.fetch_all(f"""
        SELECT m.id AS membership_id, m.question_id, m.source_mode,
               m.topic_id, m.subtopic_id, m.bank_set_id, m.test_id,
               m.test_name, m.question_number, m.order_index,
               q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               q.correct_answer, q.explanation_en, q.explanation_vi,
               q.translation_vi, q.answer_translation_vi, q.vocabulary,
               COALESCE(m.difficulty_level, q.difficulty_level) AS difficulty_level,
               t.title_vi AS topic_name_vi, s.title_vi AS subtopic_name_vi,
               b.set_name AS bank_set_name, d.name_vi AS difficulty_name_vi
        FROM grammar_question_memberships m
        JOIN grammar_questions q ON q.id = m.question_id
        LEFT JOIN grammar_topics t ON t.id = m.topic_id
        LEFT JOIN grammar_subtopics s ON s.id = m.subtopic_id
        LEFT JOIN grammar_bank_sets b ON b.set_id = m.bank_set_id
        LEFT JOIN grammar_difficulty_levels d
          ON d.level = COALESCE(m.difficulty_level, q.difficulty_level)
        WHERE {where_clause}
        ORDER BY m.order_index ASC, m.question_number ASC, m.id ASC
        LIMIT ? OFFSET ?
    """, tuple([*params, limit, offset]), use_cache=False)
    return {
        "success": True,
        "data": rows,
        "pagination": {
            "offset": offset,
            "limit": limit,
            "total": total,
            "has_more": offset + len(rows) < total,
        },
    }
