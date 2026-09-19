from collections import defaultdict
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.db import db
from app.security import (
    get_current_user,
    get_dicebear_avatar,
    get_vietnam_today,
    parse_student_ranking_name,
)
from app.services.cache_service import cache_service


router = APIRouter(prefix="/api/v1", tags=["Leaderboard"])
Scope = Literal["course", "cohort", "cohorts"]
RANKING_CACHE_KEY = "leaderboard:ranking_data"
RANKING_CACHE_TTL = 120  # 2 minutes


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
        "xp": int(row.get("xp") or 0),
        "level": int(row.get("level") or 1),
    }


def _compute_and_cache_leaderboard():
    # Cache lookup using Redis with thread-safe in-memory fallback
    cached = cache_service.get(RANKING_CACHE_KEY)
    if cached and isinstance(cached, dict) and "members" in cached and "cohorts" in cached:
        return cached["members"], cached["cohorts"]

    yesterday_vn = get_vietnam_today() - timedelta(days=1)

    # Materialized read directly from indexed users table (no UNION ALL or runtime log aggregation)
    rows = db.fetch_all(
        """
        SELECT u.id, u.full_name, u.family_middle_name, u.avatar_url,
               u.xp, u.level,
               CASE WHEN u.last_study_date IS NULL
                          OR u.last_study_date < ?
                    THEN 0 ELSE u.streak_days END AS active_streak_days,
               u.total_questions_answered AS total_questions,
               u.total_correct_answers AS correct_questions
        FROM users u
        WHERE u.role = 'student' AND u.approval_status = 'approved'
        ORDER BY u.xp DESC, u.total_questions_answered DESC, u.streak_days DESC, u.full_name ASC
        """,
        (yesterday_vn,),
        use_cache=False,
    )

    members = []
    for row in rows:
        identity = parse_student_ranking_name(row.get("full_name") or "")
        if identity:
            members.append(serialize_member(row, identity))

    grouped = defaultdict(lambda: {
        "memberCount": 0, "streakDays": 0, "totalQuestions": 0, "correctQuestions": 0, "totalXp": 0,
    })
    for member in members:
        cohort = grouped[member["cohortCode"]]
        cohort["memberCount"] += 1
        cohort["streakDays"] += member["streakDays"]
        cohort["totalQuestions"] += member["totalQuestions"]
        cohort["correctQuestions"] += member["correctQuestions"]
        cohort["totalXp"] += member["xp"]

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

    cache_service.set(RANKING_CACHE_KEY, {"members": members, "cohorts": cohorts}, ttl_seconds=RANKING_CACHE_TTL)
    return members, cohorts


@router.get("/leaderboard")
def get_leaderboard(scope: Scope = Query(default="course"), user=Depends(get_current_user)):
    members, cohorts = _compute_and_cache_leaderboard()

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
