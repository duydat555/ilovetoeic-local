import uuid
from fastapi import APIRouter, HTTPException
from app.db import db
from app.models import TestSubmissionRequest, TestSubmissionResponse, QuestionResult

router = APIRouter(prefix="/api/v1", tags=["Submissions"])

@router.post("/tests/{test_id}/submit", response_model=TestSubmissionResponse)
def submit_test(test_id: str, payload: TestSubmissionRequest):
    # Verify test exists
    test = db.fetch_one("SELECT id FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get all questions with correct answers for this test
    questions = db.fetch_all("""
        SELECT id, question_number, part, section, correct_answer, explanation_vi, dich_nghia, tu_vung, dich_nghia_dap_an
        FROM questions
        WHERE test_id = ?
        ORDER BY question_number ASC
    """, (test_id,))

    if not questions:
        raise HTTPException(status_code=400, detail="Test has no questions")

    questions_map = {q["id"]: q for q in questions}
    user_answers_map = {a.question_id: (a.selected_option.strip().upper() if a.selected_option else None) for a in payload.answers}

    listening_correct = 0
    reading_correct = 0
    results = []

    for q in questions:
        q_id = q["id"]
        correct_ans = (q["correct_answer"] or "").strip().upper()
        user_ans = user_answers_map.get(q_id)

        is_correct = (user_ans == correct_ans) if user_ans else False

        if is_correct:
            if q["section"] == "listening":
                listening_correct += 1
            else:
                reading_correct += 1

        results.append(QuestionResult(
            question_id=q_id,
            question_number=q["question_number"],
            part=q["part"],
            user_answer=user_ans,
            correct_answer=correct_ans,
            is_correct=is_correct,
            explanation_vi=q.get("explanation_vi"),
            dich_nghia=q.get("dich_nghia"),
            tu_vung=q.get("tu_vung")
        ))

    # Fetch TOEIC Score Conversion
    l_score_row = db.fetch_one("SELECT listening_score FROM toeic_score_conversion WHERE correct_count = ?", (listening_correct,))
    r_score_row = db.fetch_one("SELECT reading_score FROM toeic_score_conversion WHERE correct_count = ?", (reading_correct,))

    listening_score = l_score_row["listening_score"] if l_score_row else 5
    reading_score = r_score_row["reading_score"] if r_score_row else 5
    total_score = listening_score + reading_score

    attempt_id = str(uuid.uuid4())
    # The authenticated history endpoint persists this result after scoring.
    # It derives ownership from the bearer session instead of trusting user_id.

    return TestSubmissionResponse(
        attempt_id=attempt_id,
        test_id=test_id,
        listening_correct=listening_correct,
        reading_correct=reading_correct,
        total_correct=listening_correct + reading_correct,
        listening_score=listening_score,
        reading_score=reading_score,
        total_score=total_score,
        results=results
    )
