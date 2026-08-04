from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import db
from app.notifications import create_notification
from app.security import get_current_user


router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class NotificationPreferencesPayload(BaseModel):
    studyReminders: bool = True
    reminderTime: str = Field(default="20:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")


def iso_datetime(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat(timespec="milliseconds") + "Z"
    normalized = str(value or "")
    if not normalized:
        return None
    return normalized if normalized.endswith("Z") else normalized + "Z"


def notification_response(row):
    return {
        "id": row["id"],
        "type": row.get("type") or "system",
        "title": row.get("title") or "Thông báo",
        "message": row.get("message") or "",
        "actionUrl": row.get("action_url"),
        "read": row.get("read_at") is not None,
        "readAt": iso_datetime(row.get("read_at")),
        "createdAt": iso_datetime(row.get("created_at")),
    }


def ensure_welcome_notification(user):
    role = "Giáo viên" if user.get("role") == "admin" else "Học viên"
    action_url = "/admin/overview" if user.get("role") == "admin" else "/dashboard"
    create_notification(
        user["id"],
        "system",
        f"Chào mừng {role} đến với ilovetoeic",
        "Khu vực thông báo sẽ cập nhật tiến độ học tập và những việc cần chú ý.",
        action_url=action_url,
        dedupe_key="welcome",
    )


def ensure_notification_preferences(user_id: str):
    db.execute(
        """
        INSERT IGNORE INTO notification_preferences (
            user_id, study_reminders, reminder_time
        ) VALUES (?, 1, '20:00:00')
        """,
        (user_id,),
    )
    return db.fetch_one(
        "SELECT * FROM notification_preferences WHERE user_id = ?",
        (user_id,),
        use_cache=False,
    )


def reminder_time_text(value):
    normalized = str(value or "20:00")
    return normalized[:5]


def ensure_daily_study_reminder(user):
    preferences = ensure_notification_preferences(user["id"])
    if not preferences or not bool(preferences.get("study_reminders")):
        return
    now = datetime.now()
    reminder_time = reminder_time_text(preferences.get("reminder_time"))
    if now.strftime("%H:%M") < reminder_time:
        return
    create_notification(
        user["id"],
        "reminder",
        "Đến giờ học TOEIC hôm nay",
        "Dành ít nhất 10 phút luyện tập để duy trì nhịp học và chuỗi ngày hiện tại.",
        action_url="/dashboard",
        dedupe_key=f"daily-study-reminder:{now.date().isoformat()}",
    )


@router.get("/preferences")
def get_notification_preferences(user=Depends(get_current_user)):
    preferences = ensure_notification_preferences(user["id"])
    return {
        "studyReminders": bool(preferences.get("study_reminders")),
        "reminderTime": reminder_time_text(preferences.get("reminder_time")),
    }


@router.put("/preferences")
def update_notification_preferences(
    payload: NotificationPreferencesPayload,
    user=Depends(get_current_user),
):
    db.execute(
        """
        INSERT INTO notification_preferences (
            user_id, study_reminders, reminder_time
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            study_reminders = VALUES(study_reminders),
            reminder_time = VALUES(reminder_time)
        """,
        (user["id"], payload.studyReminders, f"{payload.reminderTime}:00"),
    )
    return {
        "success": True,
        "studyReminders": payload.studyReminders,
        "reminderTime": payload.reminderTime,
    }


@router.get("")
def get_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    unread_only: bool = Query(default=False),
    user=Depends(get_current_user),
):
    ensure_welcome_notification(user)
    ensure_daily_study_reminder(user)
    unread_clause = " AND read_at IS NULL" if unread_only else ""
    rows = db.fetch_all(
        f"""
        SELECT id, type, title, message, action_url, read_at, created_at
        FROM user_notifications
        WHERE user_id = ?{unread_clause}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        """,
        (user["id"], limit),
        use_cache=False,
    )
    unread = db.fetch_one(
        """
        SELECT COUNT(*) AS unread_count
        FROM user_notifications
        WHERE user_id = ? AND read_at IS NULL
        """,
        (user["id"],),
        use_cache=False,
    )
    return {
        "success": True,
        "data": [notification_response(row) for row in rows],
        "unreadCount": int((unread or {}).get("unread_count") or 0),
    }


@router.post("/read-all")
def mark_all_notifications_read(user=Depends(get_current_user)):
    db.execute(
        """
        UPDATE user_notifications
        SET read_at = UTC_TIMESTAMP()
        WHERE user_id = ? AND read_at IS NULL
        """,
        (user["id"],),
    )
    return {"success": True, "readAt": datetime.utcnow().isoformat() + "Z"}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    user=Depends(get_current_user),
):
    existing = db.fetch_one(
        "SELECT id FROM user_notifications WHERE id = ? AND user_id = ?",
        (notification_id, user["id"]),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")
    db.execute(
        """
        UPDATE user_notifications
        SET read_at = COALESCE(read_at, UTC_TIMESTAMP())
        WHERE id = ? AND user_id = ?
        """,
        (notification_id, user["id"]),
    )
    return {"success": True}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    user=Depends(get_current_user),
):
    existing = db.fetch_one(
        "SELECT id FROM user_notifications WHERE id = ? AND user_id = ?",
        (notification_id, user["id"]),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")
    db.execute(
        "DELETE FROM user_notifications WHERE id = ? AND user_id = ?",
        (notification_id, user["id"]),
    )
    return {"success": True}
