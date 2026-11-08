"""Voice mode relay between the browser and the local ai-service.

The browser only ever talks to this backend: the learner's session token is checked here, the ai-service
token never leaves the server, and a dropped Mac connection fails over to the laptop copy mid-conversation.

First client frame must be JSON: {"type":"start","token":"<session token>","settings":{...}}.
Everything after that is forwarded unchanged in both directions (see ai-service/app/voice/session.py).
"""
from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials

from app.db import db
from app.routers.features import global_flags
from app.security import get_current_user, get_session_user
from app.services.ai_client import AiEndpoint, ai_router

router = APIRouter(prefix="/api/v1/ai", tags=["Local AI"])

AUTH_TIMEOUT_SECONDS = 8
MODES = {"assistant", "speaking", "roleplay", "examiner"}
PERSONAS = {"friendly", "strict", "humorous", "colleague"}
_active_users: set = set()


# ----------------------------------------------------------------------------- helpers
def _clean_settings(raw: Any, display_name: str) -> Dict[str, Any]:
    raw = raw if isinstance(raw, dict) else {}
    speed = raw.get("speed")
    speed = float(speed) if isinstance(speed, (int, float)) and not isinstance(speed, bool) else 1.0
    settings: Dict[str, Any] = {
        "mode": raw.get("mode") if raw.get("mode") in MODES else "assistant",
        "persona": raw.get("persona") if raw.get("persona") in PERSONAS else "friendly",
        "correction": raw.get("correction") if raw.get("correction") in ("instant", "summary") else "summary",
        "speed": min(1.3, max(0.7, speed)),
    }
    voices = raw.get("voices")
    if isinstance(voices, dict):
        settings["voices"] = {k: str(v)[:60] for k, v in voices.items() if k in ("en", "vi")}
    if isinstance(raw.get("scenario"), str):
        settings["scenario"] = raw["scenario"][:400]
    name = re.sub(r"[\x00-\x1f]", "", display_name or "").strip()[:60]
    settings["user_brief"] = f"The learner's name is {name}. They are preparing for the TOEIC test." if name \
        else "The learner is preparing for the TOEIC test."
    return settings


def _authenticate(token: str) -> dict:
    """Same checks as the HTTP dependencies, usable outside a request."""
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return get_current_user(get_session_user(credentials))


def _ai_voice_allowed(user: dict) -> bool:
    if user.get("role") == "admin":
        return True
    return bool(global_flags().get("ai_voice"))


def _save_conversation(user_id: str, settings: dict, server_label: str, started: float, summary: Optional[dict],
                       history: List[dict]) -> Optional[str]:
    turns = sum(1 for m in history if m["role"] == "user")
    if turns == 0:
        return None
    conversation_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO ai_conversations (id, user_id, mode, persona, server_label, duration_seconds, turns, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (conversation_id, user_id, settings.get("mode", "assistant"), settings.get("persona", "friendly"),
         server_label[:40], int(time.monotonic() - started), turns,
         json.dumps(summary, ensure_ascii=False) if summary else None),
        invalidate_cache=False,
    )
    db.executemany(
        "INSERT INTO ai_messages (conversation_id, seq, role, content) VALUES (?, ?, ?, ?)",
        [(conversation_id, i, m["role"], m["content"][:4000]) for i, m in enumerate(history)],
        invalidate_cache=False,
    )
    return conversation_id


async def connect_upstream(endpoint: AiEndpoint):
    """Open the WebSocket to one ai-service. Patched in tests."""
    from websockets.asyncio.client import connect  # imported lazily: only needed when voice is used

    return await connect(endpoint.ws_url, additional_headers=ai_router.headers(), max_size=2 ** 22,
                         open_timeout=5, ping_interval=20)


# ----------------------------------------------------------------------------- relay
class VoiceRelay:
    def __init__(self, ws: WebSocket, user: dict, settings: dict):
        self.ws, self.user, self.settings = ws, user, settings
        self.history: List[dict] = []
        self._assistant = ""
        self.endpoint: Optional[AiEndpoint] = None
        self.upstream = None
        self.started = time.monotonic()
        self.summary: Optional[dict] = None
        self.client_gone = False
        self.finished = False
        self.saved_id: Optional[str] = None

    async def to_client(self, payload: dict) -> None:
        await self.ws.send_text(json.dumps(payload, ensure_ascii=False))

    def _flush_assistant(self) -> None:
        if self._assistant.strip():
            self.history.append({"role": "assistant", "content": self._assistant.strip()})
        self._assistant = ""

    def _observe(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "transcript" and event.get("final"):
            self._flush_assistant()
            self.history.append({"role": "user", "content": str(event.get("text", ""))})
        elif kind == "assistant_delta":
            self._assistant = f"{self._assistant} {event.get('text', '')}".strip()
        elif kind in ("interrupted", "summary"):
            self._flush_assistant()

    async def open_upstream(self, exclude: Optional[str] = None) -> bool:
        endpoint = await ai_router.pick(exclude=exclude)
        if endpoint is None:
            return False
        try:
            self.upstream = await connect_upstream(endpoint)
        except Exception:
            ai_router.mark_down(endpoint)
            return await self.open_upstream(exclude=endpoint.key) if exclude is None else False
        self.endpoint = endpoint
        start_settings = dict(self.settings)
        if self.history:
            self._flush_assistant()
            start_settings["history"] = self.history[-40:]
        await self.upstream.send(json.dumps({"type": "start", "settings": start_settings}))
        await self.to_client({"type": "server", "key": endpoint.key, "label": endpoint.label})
        return True

    async def pump_client_to_upstream(self) -> None:
        try:
            while True:
                message = await self.ws.receive()
                if message["type"] == "websocket.disconnect":
                    break
                target = self.upstream
                if target is None:
                    continue
                try:
                    if message.get("bytes") is not None:
                        await target.send(message["bytes"])
                    elif message.get("text") is not None:
                        data = json.loads(message["text"])
                        if isinstance(data, dict) and data.get("type") != "start":  # start is ours alone
                            await target.send(json.dumps(data))
                except Exception:
                    continue  # upstream hiccup: the other pump handles failover
        finally:
            self.client_gone = True
            if self.upstream is not None:
                try:
                    await self.upstream.close()
                except Exception:
                    pass

    async def pump_upstream_to_client(self) -> None:
        while not self.client_gone and not self.finished:
            current = self.upstream
            try:
                async for frame in current:
                    if isinstance(frame, bytes):
                        await self.ws.send_bytes(frame)
                        continue
                    event = json.loads(frame)
                    self._observe(event)
                    if event.get("type") == "summary":
                        self.summary = {k: event.get(k) for k in ("mistakes", "new_words", "tip")}
                        self.saved_id = await asyncio.to_thread(
                            _save_conversation, self.user["id"], self.settings,
                            self.endpoint.label if self.endpoint else "", self.started, self.summary, self.history)
                        event["conversationId"] = self.saved_id
                        event.pop("transcript", None)
                        await self.to_client(event)
                        self.finished = True
                        return
                    await self.to_client(event)
            except Exception:
                pass
            if self.client_gone or self.finished:
                return
            # The server we were using dropped mid-conversation: move to the other one.
            if self.endpoint:
                ai_router.mark_down(self.endpoint)
            lost = self.endpoint.key if self.endpoint else None
            await self.to_client({"type": "failover", "from": self.endpoint.label if self.endpoint else ""})
            if not await self.open_upstream(exclude=lost):
                await self.to_client({"type": "error", "code": "ai_unavailable",
                                      "message": "Máy chủ AI hiện không phản hồi."})
                self.finished = True
                return

    async def run(self) -> None:
        if not await self.open_upstream():
            await self.to_client({"type": "error", "code": "ai_unavailable",
                                  "message": "Máy chủ AI hiện không phản hồi."})
            return
        inbound = asyncio.create_task(self.pump_client_to_upstream())
        outbound = asyncio.create_task(self.pump_upstream_to_client())
        try:
            await asyncio.wait({inbound, outbound}, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in (inbound, outbound):
                task.cancel()
            await asyncio.gather(inbound, outbound, return_exceptions=True)
            if self.upstream is not None:
                try:
                    await self.upstream.close()
                except Exception:
                    pass
            if self.saved_id is None and self.history:
                self._flush_assistant()
                try:
                    await asyncio.to_thread(_save_conversation, self.user["id"], self.settings,
                                            self.endpoint.label if self.endpoint else "", self.started,
                                            self.summary, self.history)
                except Exception:
                    pass


# ----------------------------------------------------------------------------- routes
@router.websocket("/voice/ws")
async def voice_ws(ws: WebSocket):
    await ws.accept()
    try:
        first = json.loads(await asyncio.wait_for(ws.receive_text(), AUTH_TIMEOUT_SECONDS))
        if first.get("type") != "start" or not isinstance(first.get("token"), str):
            raise ValueError("bad first frame")
    except (asyncio.TimeoutError, ValueError, json.JSONDecodeError, WebSocketDisconnect):
        await ws.close(code=4400)
        return

    try:
        user = await asyncio.to_thread(_authenticate, first["token"])
    except HTTPException as exc:
        await ws.send_text(json.dumps({"type": "error", "code": "auth", "message": exc.detail}, ensure_ascii=False))
        await ws.close(code=4401)
        return

    allowed = await asyncio.to_thread(_ai_voice_allowed, user)
    if not allowed:
        await ws.send_text(json.dumps({"type": "error", "code": "feature_off",
                                       "message": "Tính năng trò chuyện với AI chưa được bật."}, ensure_ascii=False))
        await ws.close(code=4403)
        return
    if not ai_router.enabled:
        await ws.send_text(json.dumps({"type": "error", "code": "ai_unavailable",
                                       "message": "Máy chủ AI chưa được cấu hình."}, ensure_ascii=False))
        await ws.close(code=4503)
        return
    if user["id"] in _active_users:
        await ws.send_text(json.dumps({"type": "error", "code": "already_active",
                                       "message": "Bạn đang có một phiên trò chuyện khác đang mở."}, ensure_ascii=False))
        await ws.close(code=4409)
        return

    _active_users.add(user["id"])
    try:
        relay = VoiceRelay(ws, user, _clean_settings(first.get("settings"), user.get("full_name", "")))
        await relay.run()
    finally:
        _active_users.discard(user["id"])
        try:
            await ws.close()
        except RuntimeError:
            pass


@router.get("/status")
async def ai_status(user=Depends(get_current_user)):
    status = await ai_router.status()
    status["voiceEnabled"] = await asyncio.to_thread(_ai_voice_allowed, user)
    return {"success": True, "data": status}


@router.get("/conversations")
def list_conversations(user=Depends(get_current_user)):
    rows = db.fetch_all(
        """
        SELECT id, mode, persona, server_label, duration_seconds, turns, created_at
        FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
        """,
        (user["id"],), use_cache=False,
    )
    return {"success": True, "data": [
        {"id": r["id"], "mode": r["mode"], "persona": r["persona"], "server": r["server_label"],
         "durationSeconds": r["duration_seconds"], "turns": r["turns"], "createdAt": str(r["created_at"])}
        for r in rows]}


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user=Depends(get_current_user)):
    row = db.fetch_one("SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?",
                       (conversation_id, user["id"]), use_cache=False)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện.")
    messages = db.fetch_all("SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY seq",
                            (conversation_id,), use_cache=False)
    summary = row.get("summary")
    if isinstance(summary, (str, bytes)):
        summary = json.loads(summary)
    return {"success": True, "data": {"id": row["id"], "mode": row["mode"], "persona": row["persona"],
                                      "durationSeconds": row["duration_seconds"], "turns": row["turns"],
                                      "createdAt": str(row["created_at"]), "summary": summary,
                                      "messages": [{"role": m["role"], "content": m["content"]} for m in messages]}}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user=Depends(get_current_user)):
    db.execute("DELETE FROM ai_conversations WHERE id = ? AND user_id = ?", (conversation_id, user["id"]))
    return {"success": True}
