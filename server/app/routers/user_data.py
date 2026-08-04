import json
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
    new_score = max(int(user.get("current_score") or 0), int(payload.totalScore or 0))
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
    for row in rows:
        metadata = parse_json(row.get("metadata"), {})
        completed_at = row.get("completed_at")
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
            "answers": parse_json(row.get("answers"), {}),
            "questionIds": parse_json(row.get("question_ids"), []),
            "metadata": metadata,
            "completedAt": completed_at.isoformat() if completed_at else "",
        })
    return {"data": data}


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
