import time
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Practice"])

# In-memory TTL caches for high-concurrency read-heavy endpoints
_LEVEL_SUMMARY_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0}
_LEVEL_QUESTIONS_CACHE: Dict[str, Any] = {}
_FULL_TEST_CACHE: Dict[str, Any] = {}
_TEST_PART_CACHE: Dict[str, Any] = {}

LEVEL_CACHE_TTL = 600       # 10 minutes
FULL_TEST_CACHE_TTL = 1800  # 30 minutes


def clear_practice_caches():
    """Call when an admin modifies tests or questions."""
    _LEVEL_SUMMARY_CACHE["data"] = None
    _LEVEL_SUMMARY_CACHE["timestamp"] = 0
    _LEVEL_QUESTIONS_CACHE.clear()
    _FULL_TEST_CACHE.clear()
    _TEST_PART_CACHE.clear()


@router.get("/practice-by-level/summary")
def get_practice_by_level_summary(response: Response):
    now = time.time()
    if _LEVEL_SUMMARY_CACHE["data"] and (now - _LEVEL_SUMMARY_CACHE["timestamp"] < LEVEL_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return _LEVEL_SUMMARY_CACHE["data"]

    rows = db.fetch_all("""
        SELECT q.part, q.difficulty_level, COUNT(*) AS question_count
        FROM questions q
        JOIN tests t ON t.id = q.test_id
        WHERE q.part BETWEEN 1 AND 7
          AND q.difficulty_level BETWEEN 1 AND 5
          AND t.is_hidden = 0
        GROUP BY q.part, q.difficulty_level
        ORDER BY q.part ASC, q.difficulty_level ASC
    """)
    result = {
        "success": True,
        "data": [
            {
                "part": int(row["part"]),
                "level": int(row["difficulty_level"]),
                "question_count": int(row["question_count"]),
            }
            for row in rows
        ],
    }
    _LEVEL_SUMMARY_CACHE["data"] = result
    _LEVEL_SUMMARY_CACHE["timestamp"] = now
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return result


@router.get("/practice-by-level/questions")
def get_practice_by_level_questions(
    response: Response,
    part: int = Query(..., ge=1, le=7),
    level: int = Query(..., ge=1, le=5),
):
    cache_key = f"{part}:{level}"
    now = time.time()
    cached = _LEVEL_QUESTIONS_CACHE.get(cache_key)
    if cached and (now - cached["timestamp"] < LEVEL_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return cached["data"]

    questions = db.fetch_all("""
        SELECT q.id, q.test_id, q.passage_id, q.part, q.section,
               q.question_number, COALESCE(q.audio_url, p.audio_url) AS audio_url,
               COALESCE(q.image_url, p.image_url) AS image_url, q.question_text,
               q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
               q.explanation_vi, q.explanation_en, q.dich_nghia, q.tu_vung,
               q.dich_nghia_dap_an, q.difficulty_level, q.order_index,
               p.passage_text, p.passage_text_2, p.passage_text_3,
               p.transcript, p.format_status, p.passage_text_vi_html,
               p.passage_text_2_vi_html, p.passage_text_3_vi_html
        FROM questions q
        LEFT JOIN passages p ON p.id = q.passage_id AND p.test_id = q.test_id
        JOIN tests t ON t.id = q.test_id
        WHERE q.part = ? AND q.difficulty_level = ? AND t.is_hidden = 0
        ORDER BY q.test_id ASC, q.order_index ASC, q.question_number ASC
    """, (part, level))

    if not questions:
        raise HTTPException(status_code=404, detail="Không có câu hỏi phù hợp với Part và Level đã chọn.")

    result = {
        "success": True,
        "part": part,
        "level": level,
        "questions": questions,
        "total_questions": len(questions),
    }
    _LEVEL_QUESTIONS_CACHE[cache_key] = {"data": result, "timestamp": now}
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return result


@router.get("/tests/{test_id}/full")
def get_full_test(test_id: str, response: Response):
    now = time.time()
    cached = _FULL_TEST_CACHE.get(test_id)
    if cached and (now - cached["timestamp"] < FULL_TEST_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        return cached["data"]

    test = db.fetch_one("SELECT * FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    passages = db.fetch_all("SELECT * FROM passages WHERE test_id = ? ORDER BY order_index ASC", (test_id,))
    passages_dict = {p["id"]: dict(p) for p in passages}
    for p in passages_dict.values():
        p["questions"] = []

    questions = db.fetch_all("""
        SELECT id, test_id, passage_id, part, section, question_number, audio_url, image_url,
               question_text, option_a, option_b, option_c, option_d, correct_answer,
               explanation_vi, explanation_en, dich_nghia, tu_vung, dich_nghia_dap_an, difficulty_level, order_index
        FROM questions 
        WHERE test_id = ? 
        ORDER BY question_number ASC
    """, (test_id,))

    standalone_questions = []
    for q in questions:
        q_dict = dict(q)
        passage_id = q_dict.get("passage_id")
        if passage_id and passage_id in passages_dict:
            passages_dict[passage_id]["questions"].append(q_dict)
        else:
            standalone_questions.append(q_dict)

    result = {
        "success": True,
        "test": test,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }
    _FULL_TEST_CACHE[test_id] = {"data": result, "timestamp": now}
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return result


@router.get("/tests/{test_id}/parts/{part_num}")
def get_test_part(test_id: str, part_num: int, response: Response):
    if part_num < 1 or part_num > 7:
        raise HTTPException(status_code=400, detail="Invalid part number. Must be between 1 and 7.")

    cache_key = f"{test_id}:{part_num}"
    now = time.time()
    cached = _TEST_PART_CACHE.get(cache_key)
    if cached and (now - cached["timestamp"] < FULL_TEST_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        return cached["data"]

    test = db.fetch_one("SELECT id, name, year FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    passages = db.fetch_all("SELECT * FROM passages WHERE test_id = ? AND part = ? ORDER BY order_index ASC", (test_id, part_num))
    passages_dict = {p["id"]: dict(p) for p in passages}
    for p in passages_dict.values():
        p["questions"] = []

    questions = db.fetch_all("""
        SELECT id, test_id, passage_id, part, section, question_number, audio_url, image_url,
               question_text, option_a, option_b, option_c, option_d, correct_answer,
               explanation_vi, explanation_en, dich_nghia, tu_vung, dich_nghia_dap_an, difficulty_level, order_index
        FROM questions 
        WHERE test_id = ? AND part = ? 
        ORDER BY question_number ASC
    """, (test_id, part_num))

    standalone_questions = []
    for q in questions:
        q_dict = dict(q)
        passage_id = q_dict.get("passage_id")
        if passage_id and passage_id in passages_dict:
            passages_dict[passage_id]["questions"].append(q_dict)
        else:
            standalone_questions.append(q_dict)

    result = {
        "success": True,
        "test_id": test_id,
        "part": part_num,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }
    _TEST_PART_CACHE[cache_key] = {"data": result, "timestamp": now}
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return result
