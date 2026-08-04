from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import db
from app.security import get_current_user


router = APIRouter(prefix="/api/v1", tags=["Leaderboard"])
Period = Literal["week", "month", "all"]

def serialize_member(row):
    return {
        "id": row["id"],
        "name": row.get("display_name") or "Học viên TOEIC",
        "avatar": row.get("avatar_url") or "",
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
    membership_rows = db.fetch_all(
        """
        SELECT c.id, c.name, c.code, c.target_score
        FROM class_memberships cm
        JOIN learning_classes c ON c.id = cm.class_id
        WHERE cm.user_id = ? AND c.is_active = 1
        ORDER BY cm.joined_at ASC
        """,
        (user["id"],),
        use_cache=False,
    )
    if not membership_rows:
        raise HTTPException(
            status_code=404,
            detail="Bạn chưa tham gia lớp học nào đang hoạt động.",
        )
    membership_ids = {row["id"] for row in membership_rows}
    selected_class_id = class_id or membership_rows[0]["id"]
    if selected_class_id not in membership_ids:
        raise HTTPException(status_code=404, detail="Bạn không thuộc lớp học này.")

    attempt_condition = ""
    if period == "week":
        attempt_condition = "AND a.completed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"
    elif period == "month":
        attempt_condition = "AND a.completed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)"

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
               u.streak_days,
               COUNT(a.id) AS completed_lessons
        FROM class_memberships cm
        JOIN users u ON u.id = cm.user_id AND u.role = 'student'
        LEFT JOIN test_attempts a ON a.user_id = u.id {attempt_condition}
        WHERE cm.class_id = ?
        GROUP BY u.id, u.full_name, u.avatar_url, u.current_score, u.streak_days
        ORDER BY total_score DESC, completed_lessons DESC, u.full_name ASC
        """,
        (period, selected_class_id),
        use_cache=False,
    )
    current_row = next((row for row in member_rows if row["id"] == user["id"]), None)
    if current_row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu xếp hạng của bạn.")
    class_rows = db.fetch_all(
        """
        SELECT c.id, c.name, c.code, c.target_score,
               COUNT(cm.user_id) AS member_count,
               COALESCE(ROUND(AVG(u.current_score)), 0) AS average_score
        FROM learning_classes c
        JOIN class_memberships own_cm
            ON own_cm.class_id = c.id AND own_cm.user_id = ?
        LEFT JOIN class_memberships cm ON cm.class_id = c.id
        LEFT JOIN users u ON u.id = cm.user_id AND u.role = 'student'
        WHERE c.is_active = 1
        GROUP BY c.id, c.name, c.code, c.target_score
        ORDER BY average_score DESC, c.name ASC
        """,
        (user["id"],),
        use_cache=False,
    )

    classes = [
        {
            "id": row["id"],
            "name": row["name"],
            "code": row["code"],
            "targetScore": int(row.get("target_score") or 0),
            "memberCount": int(row.get("member_count") or 0),
            "averageScore": int(row.get("average_score") or 0),
            "isOwnClass": row["id"] == selected_class_id,
        }
        for row in class_rows
    ]
    selected_payload = next(
        item for item in classes if item["id"] == selected_class_id
    )
    return {
        "classes": classes,
        "selectedClass": selected_payload,
        "currentMemberId": user["id"],
        "currentUser": serialize_member(current_row),
        "members": [serialize_member(row) for row in member_rows],
        "classComparison": classes,
        "updatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
