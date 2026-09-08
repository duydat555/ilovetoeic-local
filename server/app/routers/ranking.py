from collections import defaultdict
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.db import db
from app.security import get_current_user, get_dicebear_avatar, parse_student_ranking_name


router = APIRouter(prefix="/api/v1", tags=["Leaderboard"])
Scope = Literal["course", "cohort", "cohorts"]


def serialize_member(row, identity):
    canonical_name, cohort_code = identity
    total_questions = int(row.get("total_questions") or 0)
    correct_questions = int(row.get("correct_questions") or 0)
    return {
        "id": row["id"],
        "name": canonical_name,
        "familyMiddleName": row.get("family_middle_name") or "",
        "cohortCode": cohort_code,
        "avatar": row.get("avatar_url") or get_dicebear_avatar(canonical_name),
        "streakDays": int(row.get("active_streak_days") or 0),
        "totalQuestions": total_questions,
        "correctQuestions": correct_questions,
        "accuracyRate": round(correct_questions * 100 / total_questions, 1) if total_questions else 0,
    }


import threading
import time

_ranking_cache_lock = threading.Lock()
_cached_leaderboard: dict = {
    "members": None,
    "cohorts": None,
    "timestamp": 0,
}
RANKING_CACHE_TTL = 120  # 2 minutes


def _get_cached_leaderboard_data():
    now = time.time()
    with _ranking_cache_lock:
        if _cached_leaderboard["members"] is not None and (now - _cached_leaderboard["timestamp"] < RANKING_CACHE_TTL):
            return _cached_leaderboard["members"], _cached_leaderboard["cohorts"]

    rows = db.fetch_all(
        """
        WITH answer_events AS (
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_question_activity GROUP BY user_id
            UNION ALL
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_grammar_question_activity GROUP BY user_id
            UNION ALL
            SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
            FROM test_attempts ta
            WHERE NOT EXISTS (
                SELECT 1 FROM user_question_activity uqa
                WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
            )
            GROUP BY ta.user_id
        ), activity_totals AS (
            SELECT user_id, SUM(question_count) AS total_questions,
                   SUM(correct_count) AS correct_questions
            FROM answer_events GROUP BY user_id
        )
        SELECT u.id, u.full_name, u.family_middle_name, u.avatar_url,
               CASE WHEN u.last_study_date IS NULL
                          OR u.last_study_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
                    THEN 0 ELSE u.streak_days END AS active_streak_days,
               COALESCE(a.total_questions, 0) AS total_questions,
               COALESCE(a.correct_questions, 0) AS correct_questions
        FROM users u
        LEFT JOIN activity_totals a ON a.user_id = u.id
        WHERE u.role = 'student' AND u.approval_status = 'approved'
        ORDER BY u.full_name ASC
        """,
        use_cache=False,
    )

    members = []
    for row in rows:
        identity = parse_student_ranking_name(row.get("full_name") or "")
        if identity:
            members.append(serialize_member(row, identity))

    grouped = defaultdict(lambda: {
        "memberCount": 0, "streakDays": 0, "totalQuestions": 0, "correctQuestions": 0,
    })
    for member in members:
        cohort = grouped[member["cohortCode"]]
        cohort["memberCount"] += 1
        cohort["streakDays"] += member["streakDays"]
        cohort["totalQuestions"] += member["totalQuestions"]
        cohort["correctQuestions"] += member["correctQuestions"]

    cohorts = []
    for cohort_code, values in grouped.items():
        total_questions = values["totalQuestions"]
        cohorts.append({
            "cohortCode": cohort_code,
            **values,
            "accuracyRate": round(values["correctQuestions"] * 100 / total_questions, 1)
            if total_questions else 0,
        })
    cohorts.sort(key=lambda item: int(item["cohortCode"][1:]))

    with _ranking_cache_lock:
        _cached_leaderboard["members"] = members
        _cached_leaderboard["cohorts"] = cohorts
        _cached_leaderboard["timestamp"] = time.time()

    return members, cohorts


@router.get("/leaderboard")
def get_leaderboard(scope: Scope = Query(default="course"), user=Depends(get_current_user)):
    members, cohorts = _get_cached_leaderboard_data()

    current_identity = parse_student_ranking_name(user.get("full_name") or "")
    current_cohort = current_identity[1] if current_identity else None
    if scope == "cohort":
        visible_members = [member for member in members if member["cohortCode"] == current_cohort]
    else:
        visible_members = members

    return {
        "currentMemberId": user["id"],
        "currentCohort": current_cohort,
        "scope": scope,
        "members": visible_members if scope != "cohorts" else [],
        "cohorts": cohorts if scope == "cohorts" else [],
        "updatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
