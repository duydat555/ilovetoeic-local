import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import db
from app.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Announcements"])

AnnouncementType = Literal["info", "warning", "success", "event"]


class AnnouncementCreatePayload(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    type: AnnouncementType = "info"
    actionUrl: Optional[str] = Field(default=None, max_length=255)
    actionLabel: Optional[str] = Field(default=None, max_length=100)
    isActive: bool = True
    showPopup: bool = True
    sendInAppNotification: bool = False


class AnnouncementUpdatePayload(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    type: AnnouncementType = "info"
    actionUrl: Optional[str] = Field(default=None, max_length=255)
    actionLabel: Optional[str] = Field(default=None, max_length=100)
    isActive: bool = True
    showPopup: bool = True


def _require_admin(user: dict) -> None:
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giáo viên mới có quyền quản lý thông báo.")


def _serialize_announcement(row: Dict[str, Any]) -> Dict[str, Any]:
    created_at = row.get("created_at")
    updated_at = row.get("updated_at")
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "content": row.get("content") or "",
        "type": row.get("type") or "info",
        "actionUrl": row.get("action_url"),
        "actionLabel": row.get("action_label"),
        "isActive": bool(row.get("is_active")),
        "showPopup": bool(row.get("show_popup")),
        "createdBy": row.get("created_by"),
        "readCount": int(row.get("read_count") or 0),
        "createdAt": created_at.isoformat() + "Z" if isinstance(created_at, datetime) else str(created_at or ""),
        "updatedAt": updated_at.isoformat() + "Z" if isinstance(updated_at, datetime) else str(updated_at or ""),
    }


# ==============================================================================
# Public / Student Endpoints
# ==============================================================================

@router.get("/announcements/unread-popup", summary="Lấy thông báo pop-up mới nhất mà học viên chưa đọc")
def get_unread_popup_announcement(user=Depends(get_current_user)):
    """Trả về thông báo dạng pop-up mới nhất đang kích hoạt mà user chưa đọc."""
    row = db.fetch_one(
        """
        SELECT a.id, a.title, a.content, a.type, a.action_url, a.action_label,
               a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at, 0 AS read_count
        FROM system_announcements a
        WHERE a.is_active = 1 AND a.show_popup = 1
          AND NOT EXISTS (
              SELECT 1 FROM user_announcement_reads r
              WHERE r.user_id = ? AND r.announcement_id = a.id
          )
        ORDER BY a.created_at DESC
        LIMIT 1
        """,
        (user["id"],),
        use_cache=False,
    )
    if not row:
        return {"data": None}
    return {"data": _serialize_announcement(row)}


@router.post("/announcements/{announcement_id}/read", summary="Đánh dấu đã đọc thông báo")
def mark_announcement_as_read(announcement_id: str, user=Depends(get_current_user)):
    """Đánh dấu học viên đã xem thông báo pop-up để không hiển thị lại."""
    existing = db.fetch_one(
        "SELECT id FROM system_announcements WHERE id = ?",
        (announcement_id,),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")

    db.execute(
        """
        INSERT IGNORE INTO user_announcement_reads (user_id, announcement_id)
        VALUES (?, ?)
        """,
        (user["id"], announcement_id),
    )
    return {"success": True}


# ==============================================================================
# Admin Management Endpoints
# ==============================================================================

@router.get("/admin/announcements", summary="Danh sách toàn bộ thông báo hệ thống")
def list_admin_announcements(user=Depends(get_current_user)):
    _require_admin(user)
    rows = db.fetch_all(
        """
        SELECT a.id, a.title, a.content, a.type, a.action_url, a.action_label,
               a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at,
               COUNT(r.user_id) AS read_count
        FROM system_announcements a
        LEFT JOIN user_announcement_reads r ON r.announcement_id = a.id
        GROUP BY a.id, a.title, a.content, a.type, a.action_url, a.action_label,
                 a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at
        ORDER BY a.created_at DESC
        """,
        use_cache=False,
    )
    return {"data": [_serialize_announcement(r) for r in rows]}


@router.post("/admin/announcements", summary="Tạo thông báo mới")
def create_admin_announcement(payload: AnnouncementCreatePayload, user=Depends(get_current_user)):
    _require_admin(user)
    announcement_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO system_announcements (
            id, title, content, type, action_url, action_label, is_active, show_popup, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            announcement_id,
            payload.title.strip(),
            payload.content.strip(),
            payload.type,
            payload.actionUrl.strip() if payload.actionUrl else None,
            payload.actionLabel.strip() if payload.actionLabel else None,
            1 if payload.isActive else 0,
            1 if payload.showPopup else 0,
            user["id"],
        ),
    )

    # Tùy chọn gửi thông báo đẩy vào danh sách chuông thông báo cá nhân của toàn bộ học viên
    if payload.sendInAppNotification:
        try:
            db.execute(
                """
                INSERT IGNORE INTO user_notifications (id, user_id, type, title, message, action_url, dedupe_key)
                SELECT UUID(), id, 'system', ?, ?, ?, CONCAT('announcement:', ?)
                FROM users
                WHERE role = 'student' AND approval_status = 'approved'
                """,
                (
                    payload.title.strip()[:180],
                    payload.content.strip()[:600],
                    payload.actionUrl.strip()[:255] if payload.actionUrl else None,
                    announcement_id,
                ),
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast in-app notification for announcement {announcement_id}: {e}")

    created = db.fetch_one(
        """
        SELECT a.id, a.title, a.content, a.type, a.action_url, a.action_label,
               a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at, 0 AS read_count
        FROM system_announcements a
        WHERE a.id = ?
        """,
        (announcement_id,),
        use_cache=False,
    )
    return {"success": True, "data": _serialize_announcement(created)}


@router.put("/admin/announcements/{announcement_id}", summary="Cập nhật thông báo")
def update_admin_announcement(
    announcement_id: str,
    payload: AnnouncementUpdatePayload,
    user=Depends(get_current_user),
):
    _require_admin(user)
    existing = db.fetch_one(
        "SELECT id FROM system_announcements WHERE id = ?",
        (announcement_id,),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")

    db.execute(
        """
        UPDATE system_announcements
        SET title = ?, content = ?, type = ?, action_url = ?, action_label = ?,
            is_active = ?, show_popup = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            payload.title.strip(),
            payload.content.strip(),
            payload.type,
            payload.actionUrl.strip() if payload.actionUrl else None,
            payload.actionLabel.strip() if payload.actionLabel else None,
            1 if payload.isActive else 0,
            1 if payload.showPopup else 0,
            announcement_id,
        ),
    )
    updated = db.fetch_one(
        """
        SELECT a.id, a.title, a.content, a.type, a.action_url, a.action_label,
               a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at,
               COUNT(r.user_id) AS read_count
        FROM system_announcements a
        LEFT JOIN user_announcement_reads r ON r.announcement_id = a.id
        WHERE a.id = ?
        GROUP BY a.id, a.title, a.content, a.type, a.action_url, a.action_label,
                 a.is_active, a.show_popup, a.created_by, a.created_at, a.updated_at
        """,
        (announcement_id,),
        use_cache=False,
    )
    return {"success": True, "data": _serialize_announcement(updated)}


@router.patch("/admin/announcements/{announcement_id}/toggle", summary="Bật/tắt trạng thái kích hoạt thông báo")
def toggle_admin_announcement_status(announcement_id: str, user=Depends(get_current_user)):
    _require_admin(user)
    existing = db.fetch_one(
        "SELECT id, is_active FROM system_announcements WHERE id = ?",
        (announcement_id,),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")

    new_status = 0 if bool(existing.get("is_active")) else 1
    db.execute(
        "UPDATE system_announcements SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_status, announcement_id),
    )
    return {"success": True, "isActive": bool(new_status)}


@router.delete("/admin/announcements/{announcement_id}", summary="Xóa thông báo")
def delete_admin_announcement(announcement_id: str, user=Depends(get_current_user)):
    _require_admin(user)
    existing = db.fetch_one(
        "SELECT id FROM system_announcements WHERE id = ?",
        (announcement_id,),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")

    db.execute("DELETE FROM system_announcements WHERE id = ?", (announcement_id,))
    return {"success": True}
