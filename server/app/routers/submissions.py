import uuid
from fastapi import APIRouter, HTTPException
from app.db import db
from app.models import TestSubmissionRequest, TestSubmissionResponse, QuestionResult

router = APIRouter(prefix="/api/v1", tags=["Submissions"])

@router.post("/tests/{test_id}/submit", response_model=TestSubmissionResponse)
def submit_test(test_id: str, payload: TestSubmissionRequest):
    # Verify test exists and fetch metadata (fallback if not found in DB)
    test = db.fetch_one("SELECT id, name, title, year FROM tests WHERE id = ?", (test_id,))
    test_name = (test.get("name") or test.get("title")) if test else "Test TOEIC"
    test_year = test.get("year") if test else None

    # Get all questions for this test
    questions = db.fetch_all("""
        SELECT id, question_number, part, section, correct_answer, explanation_vi, dich_nghia, tu_vung, dich_nghia_dap_an
        FROM questions
        WHERE test_id = ?
        ORDER BY question_number ASC
    """, (test_id,))

    user_answers_map = {}
    if payload.answers:
        for a in payload.answers:
            if a.question_id and a.selected_option:
                user_answers_map[a.question_id] = str(a.selected_option).strip().upper()

    listening_correct = 0
    reading_correct = 0
    results = []

    for q in questions or []:
        q_id = q["id"]
        correct_ans = (q.get("correct_answer") or "").strip().upper()
        user_ans = user_answers_map.get(q_id)

        is_correct = (user_ans == correct_ans) if user_ans else False

        q_part = q.get("part") or 1
        q_sec = (q.get("section") or "").lower()
        if q_sec == "listening" or (isinstance(q_part, int) and q_part <= 4):
            if is_correct:
                listening_correct += 1
        else:
            if is_correct:
                reading_correct += 1

        results.append(QuestionResult(
            question_id=q_id,
            question_number=q.get("question_number") or 1,
            part=q_part,
            user_answer=user_ans,
            correct_answer=correct_ans,
            is_correct=is_correct,
            explanation_vi=q.get("explanation_vi"),
            dich_nghia=q.get("dich_nghia"),
            tu_vung=q.get("tu_vung")
        ))

    total_correct = listening_correct + reading_correct
    listening_score = int((listening_correct / 100.0) * 495) if listening_correct > 0 else 5
    reading_score = int((reading_correct / 100.0) * 495) if reading_correct > 0 else 5
    total_score = listening_score + reading_score

    attempt_id = str(uuid.uuid4())

    return TestSubmissionResponse(
        attempt_id=attempt_id,
        test_id=test_id,
        test_name=test_name,
        test_year=test_year,
        listening_correct=listening_correct,
        reading_correct=reading_correct,
        total_correct=total_correct,
        listening_score=listening_score,
        reading_score=reading_score,
        total_score=total_score,
        results=results
    )
