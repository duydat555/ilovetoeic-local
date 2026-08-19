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


def record_practice_streak(user):
    """Mark a day active when at least one practice answer reaches the database."""
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
    db.execute(
        """
        UPDATE users
        SET streak_days = ?, longest_streak = ?, last_study_date = ?
        WHERE id = ?
        """,
        (streak, longest, today, user["id"]),
    )


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
    questionId: str = Field(min_length=1, max_length=220)
    selectedAnswer: str = Field(min_length=1, max_length=5)
    answeredAt: Optional[str] = None


class QuestionActivityPayload(BaseModel):
    attemptId: str = Field(min_length=1, max_length=36)
    sourceType: Literal["test", "level", "grammar"]
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


class PracticeSessionPayload(BaseModel):
    sessionKey: str = Field(min_length=1, max_length=190)
    attemptId: str = Field(min_length=1, max_length=36)
    sourceType: str = Field(default="test", max_length=20)
    testId: Optional[str] = Field(default=None, max_length=100)
    level: Optional[int] = Field(default=None, ge=1, le=5)
    partScope: str = Field(default="all", max_length=50)
    currentGroupIndex: int = Field(default=0, ge=0)
    secondsSpent: int = Field(default=0, ge=0)
    answers: Dict[str, str] = Field(default_factory=dict)
    checkedGroupIds: List[str] = Field(default_factory=list)
    notes: Dict[str, str] = Field(default_factory=dict)
    annotations: Dict[str, Any] = Field(default_factory=dict)


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


@router.get("/study-summary")
def get_study_summary(user=Depends(get_current_user)):
    """Return all-time answered/correct totals without double-counting synced attempts."""
    row = db.fetch_one(
        """
        WITH answer_events AS (
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_question_activity
            WHERE user_id = ?
            GROUP BY user_id
            UNION ALL
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_grammar_question_activity
            WHERE user_id = ?
            GROUP BY user_id
            UNION ALL
            SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
            FROM test_attempts ta
            WHERE ta.user_id = ? AND NOT EXISTS (
                SELECT 1 FROM user_question_activity uqa
                WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
            )
            GROUP BY ta.user_id
        )
        SELECT COALESCE(SUM(question_count), 0) AS total_questions,
               COALESCE(SUM(correct_count), 0) AS correct_questions
        FROM answer_events
        """,
        (user["id"], user["id"], user["id"]),
        use_cache=False,
    ) or {}
    total_questions = int(row.get("total_questions") or 0)
    correct_questions = int(row.get("correct_questions") or 0)
    return {
        "totalQuestions": total_questions,
        "correctQuestions": correct_questions,
        "accuracyRate": round(correct_questions * 100 / total_questions, 1) if total_questions else 0,
    }


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
def delete_study_attempts(
    test_id: Optional[str] = Query(default=None, min_length=1, max_length=100),
    source_type: Literal["test", "level"] = Query(default="test"),
    part: Optional[int] = Query(default=None, ge=1, le=7),
    level: Optional[int] = Query(default=None, ge=1, le=5),
    user=Depends(get_current_user),
):
    if source_type == "test" and not test_id:
        raise HTTPException(status_code=400, detail="Thiếu mã đề thi cần xoá lịch sử.")
    if source_type == "level" and (part is None or level is None):
        raise HTTPException(status_code=400, detail="Thiếu Part hoặc Level cần xoá lịch sử.")

    user_id = user["id"]
    attempt_clauses = ["attempt.user_id = %s"]
    attempt_params: List[Any] = [user_id]
    if source_type == "test":
        attempt_clauses.append("attempt.test_id = %s")
        attempt_params.append(test_id)
    else:
        attempt_clauses.extend([
            "JSON_UNQUOTE(JSON_EXTRACT(attempt.metadata, '$.source')) = 'level_practice'",
            "COALESCE(attempt.part, JSON_UNQUOTE(JSON_EXTRACT(attempt.metadata, '$.selected_part'))) = %s",
            "JSON_UNQUOTE(JSON_EXTRACT(attempt.metadata, '$.selected_level')) = %s",
        ])
        attempt_params.extend([part, level])
    attempt_where = " AND ".join(attempt_clauses)

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
                WHERE """ + attempt_where,
                tuple(attempt_params),
            )
            cursor.execute(
                """
                DELETE notification
                FROM user_notifications notification
                INNER JOIN test_attempts attempt
                    ON attempt.user_id = notification.user_id
                   AND notification.dedupe_key = CONCAT('study-attempt:', attempt.id)
                WHERE """ + attempt_where,
                tuple(attempt_params),
            )
            cursor.execute(
                "DELETE attempt FROM test_attempts attempt WHERE " + attempt_where,
                tuple(attempt_params),
            )
            deleted_count = cursor.rowcount

            # Clean up matching in-progress question activities, practice sessions, and wrong questions
            if source_type == "level":
                cursor.execute(
                    """
                    DELETE activity
                    FROM user_question_activity activity
                    JOIN questions q ON q.id = activity.question_id
                    WHERE activity.user_id = %s
                      AND q.part = %s
                      AND q.difficulty_level = %s
                    """,
                    (user_id, part, level),
                )
                cursor.execute(
                    """
                    DELETE FROM user_practice_sessions
                    WHERE user_id = %s
                      AND (
                          (source_type = 'level' AND part_scope = %s AND level = %s)
                          OR session_key = %s
                          OR session_key LIKE %s
                          OR session_key LIKE %s
                      )
                    """,
                    (
                        user_id,
                        str(part),
                        level,
                        f"toeic-practice:level-{level}:{part}",
                        f"toeic-practice:wrong-level-{part}-{level}:%",
                        f"%level-{level}%:{part}",
                    ),
                )
                cursor.execute(
                    """
                    DELETE FROM user_wrong_questions
                    WHERE user_id = %s AND source_type = 'level' AND part = %s AND level = %s
                    """,
                    (user_id, part, level),
                )
            elif source_type == "test":
                cursor.execute(
                    """
                    DELETE activity
                    FROM user_question_activity activity
                    JOIN questions q ON q.id = activity.question_id
                    WHERE activity.user_id = %s
                      AND q.test_id = %s
                    """,
                    (user_id, test_id),
                )
                cursor.execute(
                    """
                    DELETE FROM user_practice_sessions
                    WHERE user_id = %s
                      AND (
                          test_id = %s
                          OR session_key = %s
                          OR session_key LIKE %s
                      )
                    """,
                    (
                        user_id,
                        test_id,
                        test_id,
                        f"toeic-practice:%{test_id}%",
                    ),
                )
                cursor.execute(
                    """
                    DELETE FROM user_wrong_questions
                    WHERE user_id = %s AND source_type = 'test' AND test_id = %s
                    """,
                    (user_id, test_id),
                )

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
    answer_map = {item.questionId: item.selectedAnswer.strip().upper() for item in payload.answers}
    answered_at_map = {
        item.questionId: parse_datetime(item.answeredAt or payload.answeredAt)
        for item in payload.answers
    }

    if payload.sourceType == "grammar":
        grammar_rows = db.fetch_all(
            f"""
            SELECT m.id AS membership_id, m.question_id, q.correct_answer
            FROM grammar_question_memberships m
            JOIN grammar_questions q ON q.id = m.question_id
            WHERE m.id IN ({placeholders})
            """,
            tuple(question_ids),
            use_cache=False,
        )
        grammar_map = {str(row["membership_id"]): row for row in grammar_rows}
        if len(grammar_map) != len(question_ids):
            raise HTTPException(status_code=400, detail="Danh sách câu hỏi ngữ pháp không hợp lệ.")
        values = [
            (
                user["id"], payload.attemptId, membership_id,
                str(grammar_map[membership_id]["question_id"]), answer_map[membership_id],
                1 if answer_map[membership_id] == str(grammar_map[membership_id].get("correct_answer") or "").upper() else 0,
                answered_at_map[membership_id],
            )
            for membership_id in question_ids
        ]
        with db.transaction() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO user_grammar_question_activity (
                        user_id, attempt_id, membership_id, question_id,
                        selected_answer, is_correct, answered_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        question_id = VALUES(question_id), selected_answer = VALUES(selected_answer),
                        is_correct = VALUES(is_correct), answered_at = VALUES(answered_at)
                    """,
                    values,
                )
        record_practice_streak(user)
        return {"success": True, "saved": len(values)}

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

    existing_rows = db.fetch_all(
        f"""
        SELECT question_id, is_correct
        FROM user_question_activity
        WHERE user_id = ? AND attempt_id = ? AND question_id IN ({placeholders})
        """,
        tuple([user["id"], payload.attemptId, *question_ids]),
        use_cache=False,
    )
    previous_correctness = {
        str(row["question_id"]): bool(row["is_correct"])
        for row in existing_rows
    }
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
            answered_at_map[question_id],
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
                answered_at = answered_at_map[question_id]
                if is_correct:
                    cursor.execute(
                        """
                        DELETE FROM user_wrong_questions
                        WHERE user_id = %s AND question_id = %s AND source_type = %s
                        """,
                        (user["id"], question_id, payload.sourceType),
                    )
                else:
                    increment_wrong_count = (
                        question_id not in previous_correctness
                        or previous_correctness[question_id]
                    )
                    duplicate_update = (
                        "wrong_count = wrong_count + 1, last_wrong_at = VALUES(last_wrong_at)"
                        if increment_wrong_count
                        else "last_wrong_at = VALUES(last_wrong_at)"
                    )
                    cursor.execute(
                        f"""
                        INSERT INTO user_wrong_questions (
                            user_id, question_id, source_type, test_id, part, level,
                            wrong_count, first_wrong_at, last_wrong_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            test_id = VALUES(test_id), part = VALUES(part), level = VALUES(level),
                            {duplicate_update}
                        """,
                        (
                            user["id"], question_id, payload.sourceType,
                            str(question["test_id"]), int(question["part"]),
                            payload.level if payload.sourceType == "level" else None,
                            answered_at, answered_at,
                        ),
                    )
    record_practice_streak(user)
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
               t.name AS test_name, t.year AS test_year
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
                "firstWrongAt": row["first_wrong_at"].isoformat() if hasattr(row.get("first_wrong_at"), "isoformat") else str(row.get("first_wrong_at") or ""),
                "lastWrongAt": row["last_wrong_at"].isoformat() if hasattr(row.get("last_wrong_at"), "isoformat") else str(row.get("last_wrong_at") or ""),
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
    student_id: Optional[str] = Query(default=None),
    user=Depends(get_current_user),
):
    """Return database-backed daily question counts, split by TOEIC Part."""
    target_user_id = user["id"]
    if student_id and student_id != user["id"]:
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem dữ liệu luyện tập này.")
        student = db.fetch_one(
            "SELECT id FROM users WHERE id = ? AND role = 'student'",
            (student_id,),
            use_cache=False,
        )
        if not student:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Học sinh.")
        target_user_id = student["id"]

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
        (target_user_id, range_start, range_end),
        use_cache=False,
    )
    activity_rows = db.fetch_all(
        """
        SELECT attempt_id, question_id, part, answered_at, 0 AS is_grammar
        FROM user_question_activity
        WHERE user_id = ? AND answered_at >= ? AND answered_at < ?
        ORDER BY answered_at ASC
        """,
        (target_user_id, range_start, range_end),
        use_cache=False,
    )
    grammar_activity_rows = db.fetch_all(
        """
        SELECT attempt_id, membership_id AS question_id, 5 AS part, answered_at, 1 AS is_grammar
        FROM user_grammar_question_activity
        WHERE user_id = ? AND answered_at >= ? AND answered_at < ?
        ORDER BY answered_at ASC
        """,
        (target_user_id, range_start, range_end),
        use_cache=False,
    )
    activity_rows.extend(grammar_activity_rows)
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
        "grammarQuestions": 0,
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
        if activity.get("is_grammar"):
            day["grammarQuestions"] += 1
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
                "totalQuestions", "practiceQuestions", "grammarQuestions",
                "examQuestions", "attempts"
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


@router.get("/practice-sessions/{session_key:path}")
def get_practice_session(
    session_key: str,
    user=Depends(get_current_user),
):
    row = db.fetch_one(
        """
        SELECT *
        FROM user_practice_sessions
        WHERE user_id = ? AND session_key = ?
        """,
        (user["id"], session_key),
        use_cache=False,
    )
    if not row:
        return {"session": None}
    return {
        "session": {
            "sessionKey": row["session_key"],
            "attemptId": row["attempt_id"],
            "sourceType": row["source_type"],
            "testId": row["test_id"],
            "level": row["level"],
            "partScope": row["part_scope"],
            "currentGroupIndex": row["current_group_index"],
            "secondsSpent": row["seconds_spent"],
            "answers": parse_json(row["answers"], {}),
            "checkedGroupIds": parse_json(row["checked_group_ids"], []),
            "notes": parse_json(row["notes"], {}),
            "annotations": parse_json(row["annotations"], {}),
            "updatedAt": row["updated_at"].isoformat() if row.get("updated_at") else None,
        }
    }


@router.put("/practice-sessions/{session_key:path}")
def save_practice_session(
    session_key: str,
    payload: PracticeSessionPayload,
    user=Depends(get_current_user),
):
    db.execute(
        """
        INSERT INTO user_practice_sessions (
            user_id, session_key, attempt_id, source_type, test_id, level,
            part_scope, current_group_index, seconds_spent, answers,
            checked_group_ids, notes, annotations, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE
            attempt_id = VALUES(attempt_id),
            source_type = VALUES(source_type),
            test_id = VALUES(test_id),
            level = VALUES(level),
            part_scope = VALUES(part_scope),
            current_group_index = VALUES(current_group_index),
            seconds_spent = VALUES(seconds_spent),
            answers = VALUES(answers),
            checked_group_ids = VALUES(checked_group_ids),
            notes = VALUES(notes),
            annotations = VALUES(annotations),
            updated_at = UTC_TIMESTAMP()
        """,
        (
            user["id"],
            session_key,
            payload.attemptId,
            payload.sourceType,
            payload.testId,
            payload.level,
            payload.partScope,
            payload.currentGroupIndex,
            payload.secondsSpent,
            json.dumps(payload.answers, ensure_ascii=False),
            json.dumps(payload.checkedGroupIds, ensure_ascii=False),
            json.dumps(payload.notes, ensure_ascii=False),
            json.dumps(payload.annotations, ensure_ascii=False),
        ),
    )
    return {"status": "saved"}


@router.delete("/practice-sessions/{session_key:path}")
def delete_practice_session(
    session_key: str,
    user=Depends(get_current_user),
):
    db.execute(
        """
        DELETE FROM user_practice_sessions
        WHERE user_id = ? AND session_key = ?
        """,
        (user["id"], session_key),
    )
    return {"status": "deleted"}


@router.delete("/practice-sessions")
def clear_practice_sessions(
    test_id: Optional[str] = Query(default=None),
    source_type: Optional[str] = Query(default=None),
    part: Optional[int] = Query(default=None),
    level: Optional[int] = Query(default=None),
    all_sessions: bool = Query(default=False),
    user=Depends(get_current_user),
):
    if all_sessions:
        db.execute(
            "DELETE FROM user_practice_sessions WHERE user_id = ?",
            (user["id"],),
        )
    elif source_type == "level" and part is not None and level is not None:
        db.execute(
            """
            DELETE FROM user_practice_sessions
            WHERE user_id = ?
              AND (
                  (source_type = 'level' AND part_scope = ? AND level = ?)
                  OR session_key = ?
                  OR session_key LIKE ?
                  OR session_key LIKE ?
              )
            """,
            (
                user["id"],
                str(part),
                level,
                f"toeic-practice:level-{level}:{part}",
                f"toeic-practice:wrong-level-{part}-{level}:%",
                f"%level-{level}%:{part}",
            ),
        )
    elif test_id:
        db.execute(
            """
            DELETE FROM user_practice_sessions
            WHERE user_id = ?
              AND (
                  test_id = ?
                  OR session_key = ?
                  OR session_key LIKE ?
              )
            """,
            (
                user["id"],
                test_id,
                test_id,
                f"toeic-practice:%{test_id}%",
            ),
        )
    return {"status": "deleted"}


class BulkWrongQuestionsSyncPayload(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/wrong-questions/bulk-sync")
def bulk_sync_wrong_questions(
    payload: BulkWrongQuestionsSyncPayload,
    user=Depends(get_current_user),
):
    if not payload.items:
        return {"success": True, "syncedCount": 0}

    question_ids = list(dict.fromkeys(
        str(item.get("questionId") or item.get("question_id") or "")
        for item in payload.items
        if item.get("questionId") or item.get("question_id")
    ))
    if not question_ids:
        return {"success": True, "syncedCount": 0}

    placeholders = ", ".join("?" for _ in question_ids)
    question_rows = db.fetch_all(
        f"SELECT id, test_id, part, difficulty_level FROM questions WHERE id IN ({placeholders})",
        tuple(question_ids),
        use_cache=False,
    )
    question_map = {str(row["id"]): row for row in question_rows}

    values = []
    for item in payload.items:
        qid = str(item.get("questionId") or item.get("question_id") or "")
        if qid not in question_map:
            continue
        q = question_map[qid]
        source_type = "level" if item.get("sourceType") == "level" else "test"
        test_id = str(item.get("testId") or q.get("test_id") or "")
        part = int(item.get("part") or q.get("part") or 1)
        level = int(item.get("level") or q.get("difficulty_level") or 1) if source_type == "level" else None
        updated_at = parse_datetime(item.get("updatedAt") or item.get("last_wrong_at") or "")
        values.append((
            user["id"], qid, source_type, test_id, part, level, updated_at, updated_at
        ))

    if values:
        with db.transaction() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO user_wrong_questions (
                        user_id, question_id, source_type, test_id, part, level,
                        wrong_count, first_wrong_at, last_wrong_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        test_id = VALUES(test_id), part = VALUES(part), level = VALUES(level),
                        last_wrong_at = VALUES(last_wrong_at)
                    """,
                    values,
                )
    return {"success": True, "syncedCount": len(values)}
