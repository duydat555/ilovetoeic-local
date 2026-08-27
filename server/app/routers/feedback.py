import json
import uuid
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import db
from app.notifications import create_notification
from app.security import get_current_user, get_dicebear_avatar

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback"])


class FeedbackCreate(BaseModel):
    type: Literal["feature_request", "suggestion"] = "feature_request"
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    images: Optional[List[str]] = Field(default=[], max_length=4)


class FeedbackUpdate(BaseModel):
    status: Optional[Literal["pending", "in_progress", "resolved", "rejected"]] = None
    admin_response: Optional[str] = None


def format_feedback_item(row: dict) -> dict:
    raw_images = row.get("images")
    images_list = []
    if raw_images:
        if isinstance(raw_images, list):
            images_list = raw_images
        elif isinstance(raw_images, str):
            try:
                images_list = json.loads(raw_images)
            except Exception:
                images_list = []

    return {
        "id": row["id"],
        "userId": row["user_id"],
        "type": row.get("type") or "feature_request",
        "title": row.get("title") or "",
        "description": row.get("description") or "",
        "images": images_list if isinstance(images_list, list) else [],
        "status": row.get("status") or "pending",
        "adminResponse": row.get("admin_response") or None,
        "respondedAt": row.get("responded_at").isoformat()
        if isinstance(row.get("responded_at"), datetime)
        else (str(row.get("responded_at") or "") or None),
        "respondedBy": row.get("responded_by") or None,
        "createdAt": row.get("created_at").isoformat()
        if isinstance(row.get("created_at"), datetime)
        else str(row.get("created_at") or ""),
        "userName": row.get("user_name") or row.get("full_name") or "Học viên",
        "userEmail": row.get("user_email") or row.get("email") or "",
        "userAvatar": row.get("avatar_url")
        or get_dicebear_avatar(row.get("user_name") or row.get("user_id")),
    }


@router.post("")
def submit_feedback(data: FeedbackCreate, current_user=Depends(get_current_user)):
    feedback_id = str(uuid.uuid4())
    images_json = json.dumps(data.images) if data.images else json.dumps([])

    db.execute(
        """
        INSERT INTO user_feedback (id, user_id, type, title, description, images, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
        """,
        (
            feedback_id,
            current_user["id"],
            data.type,
            data.title.strip(),
            data.description.strip(),
            images_json,
        ),
    )

    created_row = db.fetch_one(
        """
        SELECT f.*, u.full_name AS user_name, u.email AS user_email, u.avatar_url
        FROM user_feedback f
        JOIN users u ON u.id = f.user_id
        WHERE f.id = ?
        """,
        (feedback_id,),
        use_cache=False,
    )
    if not created_row:
        raise HTTPException(status_code=500, detail="Không thể tạo góp ý.")

    return {"data": format_feedback_item(created_row)}


@router.get("/my-feedback")
def get_my_feedback(current_user=Depends(get_current_user)):
    rows = db.fetch_all(
        """
        SELECT f.*, u.full_name AS user_name, u.email AS user_email, u.avatar_url
        FROM user_feedback f
        JOIN users u ON u.id = f.user_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        """,
        (current_user["id"],),
        use_cache=False,
    )
    return {"data": [format_feedback_item(r) for r in rows]}


@router.get("/admin/list")
def get_admin_feedback(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền xem trang này.")

    query = """
        SELECT f.*, u.full_name AS user_name, u.email AS user_email, u.avatar_url
        FROM user_feedback f
        JOIN users u ON u.id = f.user_id
        WHERE 1=1
    """
    params = []

    if status and status in ("pending", "in_progress", "resolved", "rejected"):
        query += " AND f.status = ?"
        params.append(status)

    if type and type in ("feature_request", "suggestion"):
        query += " AND f.type = ?"
        params.append(type)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query += " AND (f.title LIKE ? OR f.description LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)"
        params.extend([term, term, term, term])

    query += " ORDER BY f.created_at DESC"

    rows = db.fetch_all(query, tuple(params), use_cache=False)
    return {"data": [format_feedback_item(r) for r in rows]}


@router.patch("/admin/{feedback_id}")
def update_admin_feedback(
    feedback_id: str,
    data: FeedbackUpdate,
    current_user=Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền cập nhật.")

    existing = db.fetch_one(
        "SELECT * FROM user_feedback WHERE id = ?", (feedback_id,), use_cache=False
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi góp ý.")

    updates = []
    params = []

    if data.status and data.status != existing.get("status"):
        updates.append("status = ?")
        params.append(data.status)

    if data.admin_response is not None:
        updates.append("admin_response = ?")
        params.append(data.admin_response.strip())
        updates.append("responded_at = UTC_TIMESTAMP()")
        updates.append("responded_by = ?")
        params.append(current_user["id"])

    if not updates:
        return {"data": format_feedback_item(existing)}

    query = f"UPDATE user_feedback SET {', '.join(updates)} WHERE id = ?"
    params.append(feedback_id)
    db.execute(query, tuple(params))

    updated_row = db.fetch_one(
        """
        SELECT f.*, u.full_name AS user_name, u.email AS user_email, u.avatar_url
        FROM user_feedback f
        JOIN users u ON u.id = f.user_id
        WHERE f.id = ?
        """,
        (feedback_id,),
        use_cache=False,
    )

    # Notify student when admin responds or resolves/changes status
    if data.admin_response:
        msg = f"Giảng viên đã phản hồi góp ý của bạn ({updated_row.get('title')}): {data.admin_response[:100]}"
        create_notification(
            user_id=existing["user_id"],
            notification_type="system",
            title="Phản hồi từ Giảng viên",
            message=msg,
            action_url="/feedback",
            dedupe_key=f"feedback_reply_{feedback_id}_{int(datetime.utcnow().timestamp())}",
        )
    elif data.status and data.status != existing.get("status"):
        status_labels = {
            "in_progress": "Đang thực hiện",
            "resolved": "Đã giải quyết",
            "rejected": "Từ chối",
            "pending": "Chờ xử lý",
        }
        status_str = status_labels.get(data.status, data.status)
        msg = f"Trạng thái góp ý '{updated_row.get('title')}' đã được đổi thành: {status_str}"
        create_notification(
            user_id=existing["user_id"],
            notification_type="system",
            title="Cập nhật góp ý",
            message=msg,
            action_url="/feedback",
            dedupe_key=f"feedback_status_{feedback_id}_{data.status}",
        )

    return {"data": format_feedback_item(updated_row)}


@router.delete("/admin/{feedback_id}")
def delete_admin_feedback(feedback_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền xoá.")

    existing = db.fetch_one(
        "SELECT id FROM user_feedback WHERE id = ?", (feedback_id,), use_cache=False
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy góp ý.")

    db.execute("DELETE FROM user_feedback WHERE id = ?", (feedback_id,))
    return {"message": "Đã xoá góp ý thành công."}
