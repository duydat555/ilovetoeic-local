import uuid
from typing import Optional

from app.db import db


NOTIFICATION_TYPES = {"homework", "achievement", "reminder", "system"}


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    dedupe_key: Optional[str] = None,
):
    """Create an in-app notification once when a dedupe key is supplied."""
    normalized_type = (
        notification_type if notification_type in NOTIFICATION_TYPES else "system"
    )
    notification_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT IGNORE INTO user_notifications (
            id, user_id, type, title, message, action_url, dedupe_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            notification_id,
            user_id,
            normalized_type,
            title.strip()[:180],
            message.strip()[:600],
            action_url[:255] if action_url else None,
            dedupe_key[:190] if dedupe_key else None,
        ),
    )
    return notification_id
