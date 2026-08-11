import json
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import db
from app.notifications import create_notification
from app.security import active_streak_days, get_current_user, normalize_date


router = APIRouter(prefix="/api/v1", tags=["User data"])


def parse_datetime(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except (TypeError, ValueError):
        return datetime.utcnow()


def parse_json(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback


class StudyAttemptPayload(BaseModel):
    id: str = Field(max_length=36)
    userId: Optional[str] = None
    testId: Optional[str] = None
    testName: Optional[str] = None
    testYear: Optional[int] = None
    mode: Literal["practice", "exam"]
    part: Optional[int] = Field(default=None, ge=1, le=7)
    totalQuestions: int = 0
    answeredQuestions: int = 0
    correctAnswers: int = 0
    accuracyRate: float = 0
    timeSpentSeconds: int = 0
    listeningCorrect: int = 0
    readingCorrect: int = 0
    listeningScore: int = 0
    readingScore: int = 0
    totalScore: int = 0
    answers: Dict[str, str] = Field(default_factory=dict)
    questionIds: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    completedAt: str


class QuestionActivityItem(BaseModel):
    questionId: str = Field(min_length=1, max_length=100)
    selectedAnswer: str = Field(min_length=1, max_length=5)


class QuestionActivityPayload(BaseModel):
    attemptId: str = Field(min_length=1, max_length=36)
    sourceType: Literal["test", "level"]
    testId: Optional[str] = Field(default=None, max_length=100)
    level: Optional[int] = Field(default=None, ge=1, le=5)
    answers: List[QuestionActivityItem] = Field(min_length=1, max_length=20)
    answeredAt: str


class VocabularyPayload(BaseModel):
    id: str = Field(max_length=36)
    word: str = Field(min_length=1, max_length=255)
    phonetic: str = ""
    partOfSpeech: str = ""
    meaningVi: str
    definitionEn: str = ""
    exampleEn: str = ""
    exampleVi: str = ""
    synonyms: List[str] = Field(default_factory=list)
    personalNote: str = ""
    aiSource: Literal["local", "gemini"] = "gemini"
    topicId: str = "ai"
    topicName: str = "Từ đã tra bằng AI"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    remembered: bool = False
    bookmarked: bool = True
    createdAt: Optional[str] = None


class TopicOverridePayload(BaseModel):
    wordKey: str = Field(min_length=1, max_length=255)
    topicId: str = Field(min_length=1, max_length=100)
    topicName: str = Field(min_length=1, max_length=255)


@router.put("/study-attempts/{attempt_id}")
def save_study_attempt(
    attempt_id: str,
    payload: StudyAttemptPayload,
    user=Depends(get_current_user),
):
    if attempt_id != payload.id:
        raise HTTPException(status_code=400, detail="Attempt ID không khớp.")
    metadata = {
        **payload.metadata,
        **({"test_name": payload.testName} if payload.testName else {}),
        **({"test_year": payload.testYear} if payload.testYear else {}),
    }
    db.execute(
        """
        INSERT INTO test_attempts (
            id, user_id, test_id, mode, part, total_questions, answered_questions,
            correct_answers, accuracy_rate, time_spent_seconds, listening_correct,
            reading_correct, listening_score, reading_score, total_score, answers,
            question_ids, metadata, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            test_id = VALUES(test_id), mode = VALUES(mode), part = VALUES(part),
            total_questions = VALUES(total_questions),
            answered_questions = VALUES(answered_questions),
            correct_answers = VALUES(correct_answers),
            accuracy_rate = VALUES(accuracy_rate),
            time_spent_seconds = VALUES(time_spent_seconds),
            listening_correct = VALUES(listening_correct),
            reading_correct = VALUES(reading_correct),
            listening_score = VALUES(listening_score),
            reading_score = VALUES(reading_score),
            total_score = VALUES(total_score), answers = VALUES(answers),
            question_ids = VALUES(question_ids), metadata = VALUES(metadata),
            completed_at = VALUES(completed_at)
        """,
        (
            payload.id,
            user["id"],
            payload.testId,
            payload.mode,
            payload.part,
            payload.totalQuestions,
            payload.answeredQuestions,
            payload.correctAnswers,
            payload.accuracyRate,
            payload.timeSpentSeconds,
            payload.listeningCorrect,
            payload.readingCorrect,
            payload.listeningScore,
            payload.readingScore,
            payload.totalScore,
            json.dumps(payload.answers, ensure_ascii=False),
            json.dumps(payload.questionIds, ensure_ascii=False),
            json.dumps(metadata, ensure_ascii=False),
            parse_datetime(payload.completedAt),
        ),
    )
    today = date.today()
    last_date = normalize_date(user.get("last_study_date"))
    current_streak = active_streak_days(user)
    if last_date == today:
        streak = max(current_streak, 1)
    elif last_date == today - timedelta(days=1):
        streak = current_streak + 1
    else:
        streak = 1
    longest = max(int(user.get("longest_streak") or 0), streak)
    # Only the best fully answered, non-Part TOEIC exam contributes to the goal.
    # Recalculation also clears legacy scores produced by practice/partial work.
    score_row = db.fetch_one(
        """
        SELECT COALESCE(MAX(total_score), 0) AS best_score
        FROM test_attempts
        WHERE user_id = ?
          AND mode = 'exam'
          AND total_questions = 200
          AND answered_questions = 200
          AND part IS NULL
          AND COALESCE(
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.is_partial')),
              'false'
          ) <> 'true'
        """,
        (user["id"],),
        use_cache=False,
    )
    new_score = int((score_row or {}).get("best_score") or 0)
    db.execute(
        """
        UPDATE users
        SET streak_days = ?, longest_streak = ?, last_study_date = ?, current_score = ?
        WHERE id = ?
        """,
        (streak, longest, today, new_score, user["id"]),
    )
    activity_name = payload.testName or metadata.get("test_name") or (
        f"Part {payload.part}" if payload.part else "bài TOEIC"
    )
    create_notification(
        user["id"],
        "achievement",
        "Đã hoàn thành đề thi" if payload.mode == "exam" else "Đã hoàn thành bài luyện tập",
        (
            f"{activity_name}: đúng {payload.correctAnswers}/{payload.totalQuestions} câu, "
            f"độ chính xác {round(payload.accuracyRate)}%."
        ),
        action_url="/history",
        dedupe_key=f"study-attempt:{payload.id}",
    )
    return {"success": True}


@router.get("/study-attempts")
def get_study_attempts(
    test_id: Optional[str] = Query(default=None),
    user=Depends(get_current_user),
):
    query = """
        SELECT a.*, t.name AS test_name, t.year AS test_year
        FROM test_attempts a
        LEFT JOIN tests t ON t.id = a.test_id
        WHERE a.user_id = ?
    """
    params = [user["id"]]
    if test_id:
        query += " AND a.test_id = ?"
        params.append(test_id)
    query += " ORDER BY a.completed_at DESC"
    rows = db.fetch_all(query, tuple(params), use_cache=False)
    data = []
    all_question_ids = []
    parsed_rows = []
    for row in rows:
        metadata = parse_json(row.get("metadata"), {})
        question_ids = parse_json(row.get("question_ids"), [])
        answers = parse_json(row.get("answers"), {})
        parsed_rows.append((row, metadata, question_ids, answers))
        all_question_ids.extend(str(question_id) for question_id in question_ids)

    question_lookup = {}
    unique_question_ids = list(dict.fromkeys(all_question_ids))
    if unique_question_ids:
        placeholders = ", ".join("?" for _ in unique_question_ids)
        question_rows = db.fetch_all(
            f"""
            SELECT q.id, q.part, q.correct_answer, q.test_id,
                   t.name AS test_name, t.year AS test_year
            FROM questions q
            LEFT JOIN tests t ON t.id = q.test_id
            WHERE q.id IN ({placeholders})
            """,
            tuple(unique_question_ids),
            use_cache=False,
        )
        question_lookup = {str(item["id"]): item for item in question_rows}

    for row, metadata, question_ids, answers in parsed_rows:
        completed_at = row.get("completed_at")
        part_totals = defaultdict(lambda: {
            "total": 0, "answered": 0, "correct": 0, "wrong": 0, "skipped": 0,
        })
        test_years = set()
        for question_id in question_ids:
            question = question_lookup.get(str(question_id))
            if not question:
                continue
            part = int(question.get("part") or 0)
            if not 1 <= part <= 7:
                continue
            selected_answer = str(answers.get(str(question_id)) or "").upper()
            correct_answer = str(question.get("correct_answer") or "").upper()
            stats = part_totals[part]
            stats["total"] += 1
            if not selected_answer:
                stats["skipped"] += 1
            elif selected_answer == correct_answer:
                stats["answered"] += 1
                stats["correct"] += 1
            else:
                stats["answered"] += 1
                stats["wrong"] += 1
            if question.get("test_year") is not None:
                test_years.add(int(question["test_year"]))

        data.append({
            "id": row["id"],
            "userId": row["user_id"],
            "testId": row.get("test_id"),
            "testName": row.get("test_name") or metadata.get("test_name"),
            "testYear": row.get("test_year") or metadata.get("test_year"),
            "mode": row.get("mode") or "exam",
            "part": row.get("part"),
            "totalQuestions": int(row.get("total_questions") or 0),
            "answeredQuestions": int(row.get("answered_questions") or 0),
            "correctAnswers": int(row.get("correct_answers") or 0),
            "accuracyRate": float(row.get("accuracy_rate") or 0),
            "timeSpentSeconds": int(row.get("time_spent_seconds") or 0),
            "listeningCorrect": int(row.get("listening_correct") or 0),
            "readingCorrect": int(row.get("reading_correct") or 0),
            "listeningScore": int(row.get("listening_score") or 0),
            "readingScore": int(row.get("reading_score") or 0),
            "totalScore": int(row.get("total_score") or 0),
            "answers": answers,
            "questionIds": question_ids,
            "partStats": [
                {"part": part, **part_totals[part]}
                for part in sorted(part_totals)
            ],
            "testYears": sorted(test_years, reverse=True),
            "metadata": metadata,
            "completedAt": completed_at.isoformat() if completed_at else "",
        })
    return {"data": data}


@router.get("/study-attempts/{attempt_id}")
def get_study_attempt_detail(
    attempt_id: str,
    user=Depends(get_current_user),
):
    attempt = db.fetch_one(
        """
        SELECT a.*, t.name AS test_name, t.year AS test_year
        FROM test_attempts a
        LEFT JOIN tests t ON t.id = a.test_id
        WHERE a.id = ? AND a.user_id = ?
        """,
        (attempt_id, user["id"]),
        use_cache=False,
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt làm bài này.")

    question_ids = [str(value) for value in parse_json(attempt.get("question_ids"), [])]
    answers = parse_json(attempt.get("answers"), {})
    question_rows = []
    if question_ids:
        placeholders = ", ".join("?" for _ in question_ids)
        question_rows = db.fetch_all(
            f"""
            SELECT q.id, q.test_id, q.passage_id, q.part, q.question_number,
                   q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_answer, q.explanation_vi, q.explanation_en,
                   q.dich_nghia, q.dich_nghia_dap_an, q.audio_url, q.image_url,
                   q.difficulty_level, t.name AS test_name, t.year AS test_year,
                   p.passage_text, p.passage_text_2, p.passage_text_3,
                   p.transcript, p.audio_url AS passage_audio_url,
                   p.image_url AS passage_image_url, p.passage_text_vi_html,
                   p.passage_text_2_vi_html, p.passage_text_3_vi_html
            FROM questions q
            LEFT JOIN tests t ON t.id = q.test_id
            LEFT JOIN passages p ON p.id = q.passage_id AND p.test_id = q.test_id
            WHERE q.id IN ({placeholders})
            """,
            tuple(question_ids),
            use_cache=False,
        )

    row_lookup = {str(row["id"]): row for row in question_rows}
    review_questions = []
    for display_index, question_id in enumerate(question_ids, start=1):
        question = row_lookup.get(question_id)
        if not question:
            continue
        selected_answer = str(answers.get(question_id) or "").upper()
        correct_answer = str(question.get("correct_answer") or "").upper()
        status = (
            "skipped" if not selected_answer
            else "correct" if selected_answer == correct_answer
            else "wrong"
        )
        choices = [
            {"id": choice_id, "text": question.get(f"option_{choice_id.lower()}") or f"({choice_id})"}
            for choice_id in (["A", "B", "C"] if int(question.get("part") or 0) == 2 else ["A", "B", "C", "D"])
        ]
        passage_parts = [
            question.get("passage_text"),
            question.get("passage_text_2"),
            question.get("passage_text_3"),
        ]
        review_questions.append({
            "id": question_id,
            "displayNumber": display_index,
            "questionNumber": int(question.get("question_number") or display_index),
            "testId": question.get("test_id"),
            "testName": question.get("test_name"),
            "testYear": question.get("test_year"),
            "part": int(question.get("part") or 0),
            "level": question.get("difficulty_level"),
            "promptText": question.get("question_text") or "",
            "choices": choices,
            "selectedAnswer": selected_answer or None,
            "correctAnswer": correct_answer,
            "status": status,
            "explanation": question.get("explanation_vi") or "",
            "explanationEn": question.get("explanation_en") or "",
            "translation": question.get("dich_nghia") or "",
            "optionsTranslation": question.get("dich_nghia_dap_an") or "",
            "passageText": "\n\n".join(str(value) for value in passage_parts if value),
            "passageTranslationHtml": "\n".join(str(value) for value in [
                question.get("passage_text_vi_html"),
                question.get("passage_text_2_vi_html"),
                question.get("passage_text_3_vi_html"),
            ] if value),
            "transcript": question.get("transcript") or "",
            "audioUrl": question.get("audio_url") or question.get("passage_audio_url"),
            "imageUrl": question.get("image_url") or question.get("passage_image_url"),
        })

    return {"success": True, "questions": review_questions}


@router.delete("/study-attempts")
def delete_study_attempts_for_test(
    test_id: str = Query(..., min_length=1, max_length=100),
    user=Depends(get_current_user),
):
    user_id = user["id"]
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            # Question activity has no attempt foreign key, so remove it before
            # deleting the matching submitted attempts.
            cursor.execute(
                """
                DELETE activity
                FROM user_question_activity activity
                INNER JOIN test_attempts attempt
                    ON attempt.id = activity.attempt_id
                   AND attempt.user_id = activity.user_id
                WHERE attempt.user_id = %s AND attempt.test_id = %s
                """,
                (user_id, test_id),
            )
            cursor.execute(
                """
                DELETE notification
                FROM user_notifications notification
                INNER JOIN test_attempts attempt
                    ON attempt.user_id = notification.user_id
                   AND notification.dedupe_key = CONCAT('study-attempt:', attempt.id)
                WHERE attempt.user_id = %s AND attempt.test_id = %s
                """,
                (user_id, test_id),
            )
            cursor.execute(
                "DELETE FROM test_attempts WHERE user_id = %s AND test_id = %s",
                (user_id, test_id),
            )
            deleted_count = cursor.rowcount

            # Keep the user's TOEIC goal score consistent when their best full
            # attempt belongs to the test whose history was removed.
            cursor.execute(
                """
                UPDATE users
                SET current_score = COALESCE((
                    SELECT MAX(total_score)
                    FROM test_attempts
                    WHERE user_id = %s
                      AND mode = 'exam'
                      AND total_questions = 200
                      AND answered_questions = 200
                      AND part IS NULL
                      AND COALESCE(
                          JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.is_partial')),
                          'false'
                      ) <> 'true'
                ), 0)
                WHERE id = %s
                """,
                (user_id, user_id),
            )

    return {"success": True, "deletedCount": deleted_count}


@router.put("/study-activity/questions")
def save_question_activity(
    payload: QuestionActivityPayload,
    user=Depends(get_current_user),
):
    if payload.sourceType == "test" and not payload.testId:
        raise HTTPException(status_code=400, detail="Thiếu mã đề thi.")
    if payload.sourceType == "level" and payload.level is None:
        raise HTTPException(status_code=400, detail="Thiếu Level luyện tập.")

    question_ids = list(dict.fromkeys(item.questionId for item in payload.answers))
    placeholders = ", ".join("?" for _ in question_ids)
    question_rows = db.fetch_all(
        f"SELECT id, test_id, part, difficulty_level, correct_answer FROM questions WHERE id IN ({placeholders})",
        tuple(question_ids),
        use_cache=False,
    )
    question_map = {str(row["id"]): row for row in question_rows}
    if len(question_map) != len(question_ids):
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi luyện tập không hợp lệ.")
    if payload.sourceType == "test" and any(
        str(question_map[question_id]["test_id"]) != payload.testId
        for question_id in question_ids
    ):
        raise HTTPException(status_code=400, detail="Câu hỏi không thuộc đề thi đã chọn.")
    if payload.sourceType == "level" and any(
        int(question_map[question_id]["difficulty_level"]) != payload.level
        for question_id in question_ids
    ):
        raise HTTPException(status_code=400, detail="Câu hỏi không thuộc Level đã chọn.")

    answer_map = {item.questionId: item.selectedAnswer.strip().upper() for item in payload.answers}
    answered_at = parse_datetime(payload.answeredAt)
    values = []
    for question_id in question_ids:
        question = question_map[question_id]
        selected_answer = answer_map[question_id]
        values.append((
            user["id"],
            payload.attemptId,
            question_id,
            int(question["part"]),
            selected_answer,
            1 if selected_answer == str(question.get("correct_answer") or "").upper() else 0,
            answered_at,
        ))
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO user_question_activity (
                    user_id, attempt_id, question_id, part, selected_answer, is_correct, answered_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    part = VALUES(part), selected_answer = VALUES(selected_answer),
                    is_correct = VALUES(is_correct), answered_at = VALUES(answered_at)
                """,
                values,
            )
            for question_id in question_ids:
                question = question_map[question_id]
                selected_answer = answer_map[question_id]
                is_correct = selected_answer == str(question.get("correct_answer") or "").upper()
                if is_correct:
                    cursor.execute(
                        """
                        DELETE FROM user_wrong_questions
                        WHERE user_id = %s AND question_id = %s AND source_type = %s
                        """,
                        (user["id"], question_id, payload.sourceType),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO user_wrong_questions (
                            user_id, question_id, source_type, test_id, part, level,
                            wrong_count, first_wrong_at, last_wrong_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            test_id = VALUES(test_id), part = VALUES(part), level = VALUES(level),
                            wrong_count = wrong_count + 1, last_wrong_at = VALUES(last_wrong_at)
                        """,
                        (
                            user["id"], question_id, payload.sourceType,
                            str(question["test_id"]), int(question["part"]),
                            payload.level if payload.sourceType == "level" else None,
                            answered_at, answered_at,
                        ),
                    )
    return {"success": True, "saved": len(values)}


@router.get("/wrong-questions")
def get_wrong_questions(
    source_type: Literal["test", "level"] = Query(...),
    test_id: Optional[str] = Query(default=None, max_length=100),
    part: Optional[int] = Query(default=None, ge=1, le=7),
    level: Optional[int] = Query(default=None, ge=1, le=5),
    user=Depends(get_current_user),
):
    clauses = ["w.user_id = ?", "w.source_type = ?"]
    params: List[Any] = [user["id"], source_type]
    if test_id:
        clauses.append("w.test_id = ?")
        params.append(test_id)
    if part is not None:
        clauses.append("w.part = ?")
        params.append(part)
    if level is not None:
        clauses.append("w.level = ?")
        params.append(level)
    rows = db.fetch_all(
        f"""
        SELECT w.question_id, w.test_id, w.source_type, w.part, w.level,
               w.wrong_count, w.first_wrong_at, w.last_wrong_at,
               t.name AS test_name, t.test_year
        FROM user_wrong_questions w
        LEFT JOIN tests t ON t.id = w.test_id
        WHERE {' AND '.join(clauses)}
        ORDER BY w.last_wrong_at DESC
        """,
        tuple(params),
        use_cache=False,
    )
    return {
        "success": True,
        "data": [
            {
                "questionId": str(row["question_id"]),
                "testId": str(row["test_id"]) if row.get("test_id") else None,
                "sourceType": str(row["source_type"]),
                "part": int(row["part"]),
                "level": int(row["level"]) if row.get("level") is not None else None,
                "wrongCount": int(row["wrong_count"]),
                "firstWrongAt": row["first_wrong_at"].isoformat(),
                "lastWrongAt": row["last_wrong_at"].isoformat(),
                "testName": row.get("test_name"),
                "testYear": int(row["test_year"]) if row.get("test_year") else None,
            }
            for row in rows
        ],
    }


@router.delete("/wrong-questions")
def delete_wrong_questions(
    source_type: Literal["test", "level"] = Query(...),
    test_id: Optional[str] = Query(default=None, max_length=100),
    part: Optional[int] = Query(default=None, ge=1, le=7),
    level: Optional[int] = Query(default=None, ge=1, le=5),
    user=Depends(get_current_user),
):
    if source_type == "test" and not test_id:
        raise HTTPException(status_code=400, detail="Thiếu mã đề thi cần xoá câu sai.")
    if source_type == "level" and (part is None or level is None):
        raise HTTPException(status_code=400, detail="Thiếu Part hoặc Level cần xoá câu sai.")

    clauses = ["user_id = %s", "source_type = %s"]
    params: List[Any] = [user["id"], source_type]
    if source_type == "test":
        clauses.append("test_id = %s")
        params.append(test_id)
    else:
        clauses.extend(["part = %s", "level = %s"])
        params.extend([part, level])

    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"DELETE FROM user_wrong_questions WHERE {' AND '.join(clauses)}",
                tuple(params),
            )
            deleted_count = cursor.rowcount
    return {"success": True, "deletedCount": deleted_count}


@router.get("/study-activity")
def get_study_activity(
    year: int = Query(..., ge=2000, le=2100),
    user=Depends(get_current_user),
):
    """Return database-backed daily question counts, split by TOEIC Part."""
    # Attempts are stored as UTC-naive datetimes. Include a one-day buffer, then
    # convert to the product timezone before assigning an activity date.
    range_start = datetime(year, 1, 1) - timedelta(hours=7)
    range_end = datetime(year + 1, 1, 1) - timedelta(hours=7)
    rows = db.fetch_all(
        """
        SELECT id, mode, part, answered_questions, answers, question_ids, completed_at
        FROM test_attempts
        WHERE user_id = ? AND completed_at >= ? AND completed_at < ?
        ORDER BY completed_at ASC
        """,
        (user["id"], range_start, range_end),
        use_cache=False,
    )
    activity_rows = db.fetch_all(
        """
        SELECT attempt_id, question_id, part, answered_at
        FROM user_question_activity
        WHERE user_id = ? AND answered_at >= ? AND answered_at < ?
        ORDER BY answered_at ASC
        """,
        (user["id"], range_start, range_end),
        use_cache=False,
    )
    synced_attempt_ids = {str(row["attempt_id"]) for row in activity_rows}
    synced_question_ids_by_attempt = defaultdict(set)
    for activity in activity_rows:
        synced_question_ids_by_attempt[str(activity["attempt_id"])].add(str(activity["question_id"]))

    parsed_rows = []
    all_question_ids = set()
    for row in rows:
        question_ids = [str(value) for value in parse_json(row.get("question_ids"), []) if value]
        answers = parse_json(row.get("answers"), {})
        answered_ids = {
            str(question_id)
            for question_id, answer in answers.items()
            if answer is not None and str(answer).strip()
        }
        # Old records occasionally have no answer object. Their answered count is
        # still usable for a single-Part attempt, handled by the fallback below.
        already_counted = synced_question_ids_by_attempt.get(str(row.get("id")), set())
        countable_ids = [
            question_id
            for question_id in question_ids
            if question_id in answered_ids and question_id not in already_counted
        ]
        all_question_ids.update(countable_ids)
        parsed_rows.append((row, countable_ids))

    question_parts = {}
    question_id_list = list(all_question_ids)
    for offset in range(0, len(question_id_list), 500):
        chunk = question_id_list[offset:offset + 500]
        placeholders = ", ".join("?" for _ in chunk)
        question_rows = db.fetch_all(
            f"SELECT id, part FROM questions WHERE id IN ({placeholders})",
            tuple(chunk),
            use_cache=False,
        )
        question_parts.update({str(item["id"]): int(item["part"]) for item in question_rows})

    days = defaultdict(lambda: {
        "totalQuestions": 0,
        "practiceQuestions": 0,
        "examQuestions": 0,
        "attempts": 0,
        "parts": {part: 0 for part in range(1, 8)},
    })
    activity_attempts_by_day = defaultdict(set)
    for activity in activity_rows:
        answered_at = activity.get("answered_at")
        if isinstance(answered_at, str):
            answered_at = parse_datetime(answered_at)
        if not answered_at:
            continue
        local_date = (answered_at + timedelta(hours=7)).date()
        if local_date.year != year:
            continue
        date_key = local_date.isoformat()
        part = int(activity["part"])
        day = days[date_key]
        day["parts"][part] += 1
        day["totalQuestions"] += 1
        day["practiceQuestions"] += 1
        activity_attempts_by_day[date_key].add(str(activity["attempt_id"]))

    for row, countable_ids in parsed_rows:
        completed_at = row.get("completed_at")
        if not completed_at:
            continue
        if isinstance(completed_at, str):
            completed_at = parse_datetime(completed_at)
        local_date = (completed_at + timedelta(hours=7)).date()
        if local_date.year != year:
            continue

        day = days[local_date.isoformat()]
        part_counts = defaultdict(int)
        for question_id in countable_ids:
            part = question_parts.get(question_id)
            if part and 1 <= part <= 7:
                part_counts[part] += 1

        mapped_total = sum(part_counts.values())
        if mapped_total == 0 and row.get("part") and str(row.get("id")) not in synced_attempt_ids:
            # Backward compatibility for legacy single-Part rows without IDs.
            fallback_total = max(0, int(row.get("answered_questions") or 0))
            part_counts[int(row["part"])] += fallback_total
            mapped_total = fallback_total

        for part, count in part_counts.items():
            day["parts"][part] += count
        day["totalQuestions"] += mapped_total
        if row.get("mode") == "exam":
            day["examQuestions"] += mapped_total
        else:
            day["practiceQuestions"] += mapped_total
        if str(row.get("id")) not in synced_attempt_ids:
            day["attempts"] += 1

    for date_key, attempt_ids in activity_attempts_by_day.items():
        days[date_key]["attempts"] += len(attempt_ids)

    data = []
    for activity_date, values in sorted(days.items()):
        data.append({
            "date": activity_date,
            **{key: values[key] for key in (
                "totalQuestions", "practiceQuestions", "examQuestions", "attempts"
            )},
            "parts": [
                {"part": part, "questions": values["parts"][part]}
                for part in range(1, 8)
            ],
        })

    return {
        "year": year,
        "timezone": "Asia/Bangkok",
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "data": data,
    }


@router.get("/vocabulary")
def get_vocabulary(user=Depends(get_current_user)):
    rows = db.fetch_all(
        "SELECT * FROM user_vocabulary WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],),
        use_cache=False,
    )
    for row in rows:
        row["synonyms"] = parse_json(row.get("synonyms"), [])
        row["remembered"] = bool(row.get("remembered"))
        row["bookmarked"] = bool(row.get("bookmarked"))
        if row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
    return {"data": rows}


@router.put("/vocabulary/{word_id}")
def save_vocabulary(
    word_id: str,
    payload: VocabularyPayload,
    user=Depends(get_current_user),
):
    if word_id != payload.id:
        raise HTTPException(status_code=400, detail="Vocabulary ID không khớp.")
    created_at = parse_datetime(payload.createdAt) if payload.createdAt else datetime.utcnow()
    db.execute(
        """
        INSERT INTO user_vocabulary (
            id, user_id, word, phonetic, part_of_speech, meaning_vi, definition_en,
            example_en, example_vi, synonyms, personal_note, ai_source, topic_id,
            topic_name, difficulty, remembered, bookmarked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            id = VALUES(id), phonetic = VALUES(phonetic),
            part_of_speech = VALUES(part_of_speech), meaning_vi = VALUES(meaning_vi),
            definition_en = VALUES(definition_en), example_en = VALUES(example_en),
            example_vi = VALUES(example_vi), synonyms = VALUES(synonyms),
            personal_note = VALUES(personal_note), ai_source = VALUES(ai_source),
            topic_id = VALUES(topic_id), topic_name = VALUES(topic_name),
            difficulty = VALUES(difficulty), remembered = VALUES(remembered),
            bookmarked = VALUES(bookmarked)
        """,
        (
            payload.id,
            user["id"],
            payload.word.strip(),
            payload.phonetic,
            payload.partOfSpeech,
            payload.meaningVi,
            payload.definitionEn,
            payload.exampleEn,
            payload.exampleVi,
            json.dumps(payload.synonyms, ensure_ascii=False),
            payload.personalNote,
            payload.aiSource,
            payload.topicId,
            payload.topicName,
            payload.difficulty,
            int(payload.remembered),
            int(payload.bookmarked),
            created_at,
        ),
    )
    return {"success": True}


@router.get("/vocabulary/topic-overrides")
def get_topic_overrides(user=Depends(get_current_user)):
    rows = db.fetch_all(
        """
        SELECT word_key, topic_id, topic_name
        FROM user_vocabulary_topic_overrides
        WHERE user_id = ?
        """,
        (user["id"],),
        use_cache=False,
    )
    return {"data": rows}


@router.put("/vocabulary/topic-overrides/{word_key}")
def save_topic_override(
    word_key: str,
    payload: TopicOverridePayload,
    user=Depends(get_current_user),
):
    normalized_key = payload.wordKey.strip().lower()
    if normalized_key != word_key.strip().lower():
        raise HTTPException(status_code=400, detail="Word key không khớp.")
    db.execute(
        """
        INSERT INTO user_vocabulary_topic_overrides (
            user_id, word_key, topic_id, topic_name
        ) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            topic_id = VALUES(topic_id), topic_name = VALUES(topic_name)
        """,
        (user["id"], normalized_key, payload.topicId, payload.topicName),
    )
    return {"success": True}
