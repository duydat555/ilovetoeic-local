import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.db import db
from app.security import get_current_user, get_dicebear_avatar, get_optional_current_user

router = APIRouter(prefix="/api/v1/community-chat", tags=["CommunityChat"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message_data: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message_data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    reply_to_id: Optional[str] = None


class ReactionToggle(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)


def get_message_reactions(message_ids: List[str], current_user_id: Optional[str] = None) -> dict:
    if not message_ids:
        return {}

    placeholders = ", ".join(["?"] * len(message_ids))
    sql = f"""
        SELECT message_id, emoji, COUNT(*) AS cnt,
               SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS user_reacted
        FROM community_message_reactions
        WHERE message_id IN ({placeholders})
        GROUP BY message_id, emoji
    """
    params = [current_user_id or ""] + message_ids
    rows = db.fetch_all(sql, tuple(params), use_cache=False)

    res = {msg_id: [] for msg_id in message_ids}
    for r in rows:
        m_id = r["message_id"]
        res[m_id].append({
            "emoji": r["emoji"],
            "count": int(r["cnt"]),
            "userReacted": bool(r["user_reacted"]),
        })
    return res


def format_chat_message(row: dict, reactions: Optional[List[dict]] = None) -> dict:
    created_at = row.get("created_at")
    if isinstance(created_at, datetime):
        iso_str = created_at.isoformat()
    else:
        iso_str = str(created_at or "")

    user_name = row.get("user_name") or row.get("full_name") or "Học viên"
    user_avatar = row.get("avatar_url") or get_dicebear_avatar(user_name or row.get("user_id"))

    reply_to = None
    if row.get("parent_id"):
        reply_to = {
            "id": row.get("parent_id"),
            "userName": row.get("parent_user_name") or "Học viên",
            "content": row.get("parent_content") or "",
        }

    return {
        "id": row["id"],
        "userId": row["user_id"],
        "content": row.get("content") or "",
        "createdAt": iso_str,
        "userName": user_name,
        "userEmail": row.get("user_email") or "",
        "userRole": row.get("user_role") or "student",
        "userAvatar": user_avatar,
        "replyTo": reply_to,
        "reactions": reactions or [],
    }


@router.websocket("/ws")
async def community_chat_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get("/messages")
def get_chat_messages(
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(get_optional_current_user),
):
    current_user_id = current_user["id"] if current_user else None

    query = """
        SELECT m.id, m.user_id, m.parent_id, m.content, m.created_at,
               u.full_name AS user_name, u.email AS user_email, u.role AS user_role, u.avatar_url,
               p.content AS parent_content, pu.full_name AS parent_user_name
        FROM community_messages m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN community_messages p ON p.id = m.parent_id
        LEFT JOIN users pu ON pu.id = p.user_id
        ORDER BY m.created_at DESC
        LIMIT ?
    """
    rows = db.fetch_all(query, (limit,), use_cache=False)
    msg_ids = [r["id"] for r in rows]
    reactions_map = get_message_reactions(msg_ids, current_user_id)

    formatted = [
        format_chat_message(r, reactions=reactions_map.get(r["id"], []))
        for r in reversed(rows)
    ]
    return {"data": formatted}


@router.post("/messages")
async def send_chat_message(data: MessageCreate, current_user=Depends(get_current_user)):
    content_text = data.content.strip()
    if not content_text:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống.")

    parent_id = data.reply_to_id.strip() if data.reply_to_id else None
    if parent_id:
        parent_exists = db.fetch_one(
            "SELECT id FROM community_messages WHERE id = ?", (parent_id,), use_cache=False
        )
        if not parent_exists:
            parent_id = None

    msg_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO community_messages (id, user_id, parent_id, content)
        VALUES (?, ?, ?, ?)
        """,
        (msg_id, current_user["id"], parent_id, content_text),
    )

    created_row = db.fetch_one(
        """
        SELECT m.id, m.user_id, m.parent_id, m.content, m.created_at,
               u.full_name AS user_name, u.email AS user_email, u.role AS user_role, u.avatar_url,
               p.content AS parent_content, pu.full_name AS parent_user_name
        FROM community_messages m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN community_messages p ON p.id = m.parent_id
        LEFT JOIN users pu ON pu.id = p.user_id
        WHERE m.id = ?
        """,
        (msg_id,),
        use_cache=False,
    )

    if not created_row:
        raise HTTPException(status_code=500, detail="Không thể gửi tin nhắn.")

    formatted_msg = format_chat_message(created_row, reactions=[])

    await manager.broadcast({"type": "new_message", "data": formatted_msg})
    return {"data": formatted_msg}


@router.post("/messages/{message_id}/react")
async def toggle_message_reaction(
    message_id: str,
    data: ReactionToggle,
    current_user=Depends(get_current_user),
):
    emoji = data.emoji.strip()
    if not emoji:
        raise HTTPException(status_code=400, detail="Emoji không hợp lệ.")

    existing_msg = db.fetch_one(
        "SELECT id FROM community_messages WHERE id = ?", (message_id,), use_cache=False
    )
    if not existing_msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")

    user_id = current_user["id"]
    existing_reaction = db.fetch_one(
        """
        SELECT id FROM community_message_reactions
        WHERE message_id = ? AND user_id = ? AND emoji = ?
        """,
        (message_id, user_id, emoji),
        use_cache=False,
    )

    if existing_reaction:
        db.execute(
            "DELETE FROM community_message_reactions WHERE id = ?",
            (existing_reaction["id"],),
        )
    else:
        db.execute(
            """
            INSERT INTO community_message_reactions (id, message_id, user_id, emoji)
            VALUES (?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), message_id, user_id, emoji),
        )

    updated_reactions_map = get_message_reactions([message_id], user_id)
    updated_reactions = updated_reactions_map.get(message_id, [])

    await manager.broadcast({
        "type": "reaction_update",
        "messageId": message_id,
        "reactions": updated_reactions,
    })

    return {"data": updated_reactions}


@router.delete("/messages/{message_id}")
async def delete_chat_message(message_id: str, current_user=Depends(get_current_user)):
    existing = db.fetch_one(
        "SELECT id, user_id FROM community_messages WHERE id = ?",
        (message_id,),
        use_cache=False,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")

    is_author = existing["user_id"] == current_user["id"]
    is_admin = current_user.get("role") == "admin"

    if not (is_author or is_admin):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xoá tin nhắn này.")

    db.execute("DELETE FROM community_messages WHERE id = ?", (message_id,))
    await manager.broadcast({"type": "delete_message", "messageId": message_id})

    return {"message": "Đã xoá tin nhắn thành công."}
