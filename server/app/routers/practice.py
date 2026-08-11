from fastapi import APIRouter, HTTPException, Query
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Practice"])


@router.get("/practice-by-level/summary")
def get_practice_by_level_summary():
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
    return {
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


@router.get("/practice-by-level/questions")
def get_practice_by_level_questions(
    part: int = Query(..., ge=1, le=7),
    level: int = Query(..., ge=1, le=5),
):
    # This endpoint is additive. Existing test-based practice endpoints keep their
    # original query and response contract unchanged.
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

    return {
        "success": True,
        "part": part,
        "level": level,
        "questions": questions,
        "total_questions": len(questions),
    }

@router.get("/tests/{test_id}/full")
def get_full_test(test_id: str):
    # Check if test exists
    test = db.fetch_one("SELECT * FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get passages
    passages = db.fetch_all("SELECT * FROM passages WHERE test_id = ? ORDER BY order_index ASC", (test_id,))
    passages_dict = {p["id"]: dict(p) for p in passages}
    for p in passages_dict.values():
        p["questions"] = []

    # Get questions including translation & explanation fields
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

    return {
        "success": True,
        "test": test,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }

@router.get("/tests/{test_id}/parts/{part_num}")
def get_test_part(test_id: str, part_num: int):
    if part_num < 1 or part_num > 7:
        raise HTTPException(status_code=400, detail="Invalid part number. Must be between 1 and 7.")

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

    return {
        "success": True,
        "test_id": test_id,
        "part": part_num,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }
