from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import db
from app.security import active_streak_days, get_current_user, get_dicebear_avatar


router = APIRouter(prefix="/api/v1", tags=["Leaderboard"])
Period = Literal["week", "month", "all"]


def serialize_member(row):
    name = row.get("display_name") or "Học viên TOEIC"
    return {
        "id": row["id"],
        "name": name,
        "avatar": row.get("avatar_url") or get_dicebear_avatar(name or row["id"]),
        "score": int(row.get("total_score") or 0),
        "streakDays": int(row.get("streak_days") or 0),
        "completedLessons": int(row.get("completed_lessons") or 0),
        "rankChange": int(row.get("rank_change") or 0),
    }


@router.get("/leaderboard")
def get_leaderboard(
    class_id: Optional[str] = Query(default=None),
    period: Period = Query(default="all"),
    user=Depends(get_current_user),
):
    # Fetch all active classes in system
    all_classes_rows = db.fetch_all(
        """
        SELECT c.id, c.name, c.code, c.target_score,
               COUNT(DISTINCT cm.user_id) AS member_count,
               COALESCE(ROUND(AVG(u.current_score)), 0) AS average_score
        FROM learning_classes c
        LEFT JOIN class_memberships cm ON cm.class_id = c.id
        LEFT JOIN users u ON u.id = cm.user_id AND u.role = 'student'
        WHERE c.is_active = 1
        GROUP BY c.id, c.name, c.code, c.target_score
        ORDER BY average_score DESC, c.name ASC
        """,
        use_cache=False,
    )

    # Fetch classes current user belongs to
    own_memberships = db.fetch_all(
        "SELECT class_id FROM class_memberships WHERE user_id = ?",
        (user["id"],),
        use_cache=False,
    )
    own_class_ids = {row["class_id"] for row in own_memberships}

    # System-wide student count & average score
    total_students_row = db.fetch_one(
        "SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(current_score)), 0) AS avg_score FROM users WHERE role = 'student'",
        use_cache=False,
    )

    all_item = {
        "id": "all",
        "name": "Tất cả học sinh (Toàn trường)",
        "code": "ALL",
        "targetScore": 0,
        "memberCount": int((total_students_row or {}).get("count") or 0),
        "averageScore": int((total_students_row or {}).get("avg_score") or 0),
        "isOwnClass": False,
    }

    classes = [all_item] + [
        {
            "id": row["id"],
            "name": row["name"],
            "code": row["code"],
            "targetScore": int(row.get("target_score") or 0),
            "memberCount": int(row.get("member_count") or 0),
            "averageScore": int(row.get("average_score") or 0),
            "isOwnClass": row["id"] in own_class_ids,
        }
        for row in all_classes_rows
    ]

    valid_ids = {item["id"] for item in classes}
    if class_id and class_id in valid_ids:
        selected_class_id = class_id
    elif own_class_ids:
        selected_class_id = next((item["id"] for item in classes if item["id"] in own_class_ids), "all")
    else:
        selected_class_id = "all"

    attempt_condition = ""
    if period == "week":
        attempt_condition = "AND a.completed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"
    elif period == "month":
        attempt_condition = "AND a.completed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)"

    if selected_class_id == "all":
        member_rows = db.fetch_all(
            f"""
            SELECT u.id, u.full_name AS display_name, u.avatar_url,
                   0 AS rank_change,
                   CASE
                       WHEN ? = 'all' THEN GREATEST(
                           u.current_score,
                           COALESCE(SUM(a.total_score), 0)
                       )
                       ELSE COALESCE(SUM(a.total_score), 0)
                   END AS total_score,
                   CASE
                       WHEN u.last_study_date IS NULL THEN 0
                       WHEN u.last_study_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) THEN 0
                       ELSE u.streak_days
                   END AS streak_days,
                   COUNT(DISTINCT a.id) AS completed_lessons
            FROM users u
            LEFT JOIN test_attempts a ON a.user_id = u.id {attempt_condition}
            WHERE u.role = 'student'
            GROUP BY u.id, u.full_name, u.avatar_url, u.current_score, u.streak_days, u.last_study_date
            ORDER BY total_score DESC, completed_lessons DESC, u.full_name ASC
            """,
            (period,),
            use_cache=False,
        )
    else:
        member_rows = db.fetch_all(
            f"""
            SELECT u.id, u.full_name AS display_name, u.avatar_url,
                   0 AS rank_change,
                   CASE
                       WHEN ? = 'all' THEN GREATEST(
                           u.current_score,
                           COALESCE(SUM(a.total_score), 0)
                       )
                       ELSE COALESCE(SUM(a.total_score), 0)
                   END AS total_score,
                   CASE
                       WHEN u.last_study_date IS NULL THEN 0
                       WHEN u.last_study_date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) THEN 0
                       ELSE u.streak_days
                   END AS streak_days,
                   COUNT(DISTINCT a.id) AS completed_lessons
            FROM class_memberships cm
            JOIN users u ON u.id = cm.user_id AND u.role = 'student'
            LEFT JOIN test_attempts a ON a.user_id = u.id {attempt_condition}
            WHERE cm.class_id = ?
            GROUP BY u.id, u.full_name, u.avatar_url, u.current_score, u.streak_days, u.last_study_date
            ORDER BY total_score DESC, completed_lessons DESC, u.full_name ASC
            """,
            (period, selected_class_id),
            use_cache=False,
        )

    current_row = next((row for row in member_rows if row["id"] == user["id"]), None)
    if current_row is None:
        user_db = db.fetch_one("SELECT * FROM users WHERE id = ?", (user["id"],), use_cache=False)
        if user_db:
            current_row = {
                "id": user_db["id"],
                "display_name": user_db.get("full_name") or "Học viên TOEIC",
                "avatar_url": user_db.get("avatar_url") or "",
                "rank_change": 0,
                "total_score": int(user_db.get("current_score") or 0),
                "streak_days": active_streak_days(user_db),
                "completed_lessons": 0,
            }
        else:
            current_row = {
                "id": user["id"],
                "display_name": user.get("full_name") or "Học viên TOEIC",
                "avatar_url": user.get("avatar_url") or "",
                "rank_change": 0,
                "total_score": 0,
                "streak_days": 0,
                "completed_lessons": 0,
            }

    selected_payload = next(
        (item for item in classes if item["id"] == selected_class_id),
        classes[0],
    )
    class_comparison = [c for c in classes if c["id"] != "all"]

    return {
        "classes": classes,
        "selectedClass": selected_payload,
        "currentMemberId": user["id"],
        "currentUser": serialize_member(current_row),
        "members": [serialize_member(row) for row in member_rows],
        "classComparison": class_comparison,
        "updatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
