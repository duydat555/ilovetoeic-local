import json
import traceback
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
    type: Optional[str] = "feature_request"
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    images: Optional[List[str]] = Field(default=[])


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None


_TABLE_ENSURED = False


def ensure_feedback_table():
    """Ensure user_feedback table and performance indexes exist."""
    global _TABLE_ENSURED
    if _TABLE_ENSURED:
        return

    ddl = """
    CREATE TABLE IF NOT EXISTS user_feedback (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('feature_request', 'suggestion') NOT NULL DEFAULT 'feature_request',
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        images JSON NULL,
        status ENUM('pending', 'in_progress', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_response TEXT NULL,
        responded_at DATETIME NULL,
        responded_by CHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_feedback_user_created (user_id, created_at),
        INDEX idx_feedback_status_created (status, created_at),
        INDEX idx_feedback_created_at (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    try:
        db.execute(ddl)
    except Exception as e:
        print(f"[!] Warning: Could not auto-ensure user_feedback table: {e}")

    try:
        db.execute("ALTER TABLE user_feedback ADD INDEX idx_feedback_created_at (created_at DESC)")
    except Exception:
        pass

    # Ensure admin status and feature flag exist
    try:
        db.execute(
            """
            INSERT INTO admin_feature_statuses (
                route, status, title, description, icon_key, action_label, action_path, sort_order
            ) VALUES (
                '/admin/feedback', 'ready', 'Quản lý Góp ý', 'Xem và phản hồi ý kiến, đóng góp từ học viên.', 'message-square', NULL, NULL, 45
            ) ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                status = VALUES(status),
                icon_key = VALUES(icon_key);
            """
        )
        db.execute(
            """
            INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('feedback', 1)
            ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
            """
        )
    except Exception as e:
        print(f"[!] Warning: Could not insert admin feedback feature status: {e}")

    _TABLE_ENSURED = True


def attach_user_info(rows: List[dict]) -> List[dict]:
    """In-memory user resolution to eliminate SQL collation mismatch risks."""
    if not rows:
        return []
    user_ids = list({r["user_id"] for r in rows if r.get("user_id")})
    user_map = {}
    if user_ids:
        placeholders = ", ".join(["?"] * len(user_ids))
        try:
            user_rows = db.fetch_all(
                f"SELECT id, full_name, email, avatar_url FROM users WHERE id IN ({placeholders})",
                tuple(user_ids),
                use_cache=False,
            )
            user_map = {u["id"]: u for u in user_rows}
        except Exception as err:
            print(f"[!] Error fetching users for feedback: {err}")

    result = []
    for r in rows:
        user = user_map.get(r.get("user_id"), {})
        r_copy = dict(r)
        r_copy["user_name"] = user.get("full_name") or "Học viên"
        r_copy["user_email"] = user.get("email") or ""
        r_copy["avatar_url"] = user.get("avatar_url")
        result.append(r_copy)
    return result


def format_feedback_item(row: dict) -> dict:
    if not row or not isinstance(row, dict):
        return {}

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

    responded_at_val = row.get("responded_at")
    created_at_val = row.get("created_at")

    return {
        "id": str(row.get("id") or ""),
        "userId": str(row.get("user_id") or ""),
        "type": row.get("type") or "feature_request",
        "title": row.get("title") or "",
        "description": row.get("description") or "",
        "images": images_list if isinstance(images_list, list) else [],
        "status": row.get("status") or "pending",
        "adminResponse": row.get("admin_response") or None,
        "respondedAt": responded_at_val.isoformat()
        if hasattr(responded_at_val, "isoformat")
        else (str(responded_at_val or "") or None),
        "respondedBy": row.get("responded_by") or None,
        "createdAt": created_at_val.isoformat()
        if hasattr(created_at_val, "isoformat")
        else str(created_at_val or ""),
        "userName": row.get("user_name") or row.get("full_name") or "Học viên",
        "userEmail": row.get("user_email") or row.get("email") or "",
        "userAvatar": row.get("avatar_url")
        or get_dicebear_avatar(row.get("user_name") or row.get("user_id")),
    }


@router.post("")
def submit_feedback(data: FeedbackCreate, current_user=Depends(get_current_user)):
    ensure_feedback_table()
    feedback_id = str(uuid.uuid4())
    fb_type = data.type if data.type in ("feature_request", "suggestion") else "feature_request"
    clean_title = (data.title or "").strip()
    clean_desc = (data.description or "").strip()

    if not clean_title:
        raise HTTPException(status_code=400, detail="Vui lòng nhập tiêu đề góp ý.")
    if not clean_desc:
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả chi tiết.")

    clean_images = [img for img in (data.images or []) if isinstance(img, str)][:4]
    images_json = json.dumps(clean_images) if clean_images else None

    try:
        db.execute(
            """
            INSERT INTO user_feedback (id, user_id, type, title, description, images, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
            """,
            (
                feedback_id,
                current_user["id"],
                fb_type,
                clean_title,
                clean_desc,
                images_json,
            ),
        )

        created_row = db.fetch_one(
            "SELECT * FROM user_feedback WHERE id = ?",
            (feedback_id,),
            use_cache=False,
        )
        if not created_row:
            raise HTTPException(status_code=500, detail="Không thể tạo góp ý.")

        rows_with_user = attach_user_info([created_row])
        return {"data": format_feedback_item(rows_with_user[0])}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[Feedback API Error] Không thể gửi góp ý: {type(exc).__name__}: {str(exc)}",
        )


@router.get("/my-feedback")
def get_my_feedback(current_user=Depends(get_current_user)):
    ensure_feedback_table()
    try:
        # Deferred join: Avoid filesort on heavy JSON images column (prevents MySQL 1038 Out of sort memory)
        rows = db.fetch_all(
            """
            SELECT f.id, f.user_id, f.type, f.title, f.description, f.images, f.status,
                   f.admin_response, f.responded_at, f.responded_by, f.created_at, f.updated_at
            FROM (
                SELECT id, created_at FROM user_feedback
                WHERE user_id = ?
                ORDER BY created_at DESC
            ) AS sorted_ids
            JOIN user_feedback f ON f.id = sorted_ids.id
            ORDER BY sorted_ids.created_at DESC
            """,
            (current_user["id"],),
            use_cache=False,
        )
        rows_with_user = attach_user_info(rows)
        return {"data": [format_feedback_item(r) for r in rows_with_user]}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[Feedback API Error] Lỗi tải góp ý cá nhân: {type(exc).__name__}: {str(exc)}",
        )


@router.get("/admin/list")
def get_admin_feedback(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền xem trang này.")

    ensure_feedback_table()

    where_clauses = ["1=1"]
    params = []

    if status and status in ("pending", "in_progress", "resolved", "rejected"):
        where_clauses.append("status = ?")
        params.append(status)

    if type and type in ("feature_request", "suggestion"):
        where_clauses.append("type = ?")
        params.append(type)

    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append("(title LIKE ? OR description LIKE ?)")
        params.extend([term, term])

    where_sql = " AND ".join(where_clauses)

    # Deferred join: Sort only small ID and timestamp in memory, then join to fetch large JSON images
    # This completely eliminates MySQL Error 1038 (Out of sort memory)
    query = f"""
        SELECT f.id, f.user_id, f.type, f.title, f.description, f.images, f.status,
               f.admin_response, f.responded_at, f.responded_by, f.created_at, f.updated_at
        FROM (
            SELECT id, created_at FROM user_feedback
            WHERE {where_sql}
            ORDER BY created_at DESC
        ) AS sorted_ids
        JOIN user_feedback f ON f.id = sorted_ids.id
        ORDER BY sorted_ids.created_at DESC
    """

    try:
        rows = db.fetch_all(query, tuple(params), use_cache=False)
        rows_with_user = attach_user_info(rows)

        # In-memory filter for student name/email search if provided
        if search and search.strip():
            term_lower = search.strip().lower()
            matched_items = [
                r for r in rows_with_user
                if term_lower in r.get("user_name", "").lower()
                or term_lower in r.get("user_email", "").lower()
                or term_lower in r.get("title", "").lower()
                or term_lower in r.get("description", "").lower()
            ]
            rows_with_user = matched_items

        return {"data": [format_feedback_item(r) for r in rows_with_user]}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[Feedback API Error] Lỗi truy vấn danh sách góp ý: {type(exc).__name__}: {str(exc)}",
        )


@router.patch("/admin/{feedback_id}")
def update_admin_feedback(
    feedback_id: str,
    data: FeedbackUpdate,
    current_user=Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền cập nhật.")

    ensure_feedback_table()

    try:
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
            rows_with_user = attach_user_info([existing])
            return {"data": format_feedback_item(rows_with_user[0])}

        query = f"UPDATE user_feedback SET {', '.join(updates)} WHERE id = ?"
        params.append(feedback_id)
        db.execute(query, tuple(params))

        updated_row = db.fetch_one(
            "SELECT * FROM user_feedback WHERE id = ?",
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

        rows_with_user = attach_user_info([updated_row] if updated_row else [])
        return {"data": format_feedback_item(rows_with_user[0] if rows_with_user else {})}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[Feedback API Error] Lỗi cập nhật góp ý: {type(exc).__name__}: {str(exc)}",
        )


@router.delete("/admin/{feedback_id}")
def delete_admin_feedback(feedback_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có quyền xoá.")

    ensure_feedback_table()

    try:
        existing = db.fetch_one(
            "SELECT id FROM user_feedback WHERE id = ?", (feedback_id,), use_cache=False
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy góp ý.")

        db.execute("DELETE FROM user_feedback WHERE id = ?", (feedback_id,))
        return {"message": "Đã xoá góp ý thành công."}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[Feedback API Error] Lỗi xoá góp ý: {type(exc).__name__}: {str(exc)}",
        )
