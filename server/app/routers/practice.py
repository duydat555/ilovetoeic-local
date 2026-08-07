from fastapi import APIRouter, HTTPException
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Practice"])

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
