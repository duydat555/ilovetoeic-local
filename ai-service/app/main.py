"""ai-service entrypoint. Run: uvicorn app.main:app --host 0.0.0.0 --port 8100 (see scripts/)."""
from __future__ import annotations

import asyncio
import json
import secrets
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse

from .backends.base import BackendUnavailable
from .backends.factory import Backends, build_backends
from .settings import Settings, load_settings
from .voice.session import VoiceSession


def create_app(settings: Optional[Settings] = None, backends: Optional[Backends] = None) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings
        app.state.backends = backends or build_backends(settings)
        # Load models now so the first learner turn is not the slow one.
        b = app.state.backends
        await asyncio.gather(b.llm.warmup(), b.stt.warmup(), b.tts.warmup(), return_exceptions=True)
        yield

    app = FastAPI(title="ilovetoeic ai-service", version="0.1.0", lifespan=lifespan)

    @app.get("/health")
    async def health():
        return {"ok": True, "profile": settings.profile, "llm": settings.llm.get("model"),
                "stt": settings.stt.get("model"), "version": app.version}

    def authorized(token: Optional[str]) -> bool:
        return not settings.token or (token is not None and secrets.compare_digest(token, settings.token))

    @app.websocket("/voice/ws")
    async def voice_ws(ws: WebSocket, token: Optional[str] = None):
        header_token = ws.headers.get("x-ai-token")
        if not authorized(header_token or token):
            await ws.close(code=4401)
            return
        await ws.accept()
        lock = asyncio.Lock()

        async def send_json(payload: dict) -> None:
            async with lock:
                await ws.send_text(json.dumps(payload, ensure_ascii=False))

        async def send_bytes(payload: bytes) -> None:
            async with lock:
                await ws.send_bytes(payload)

        b = app.state.backends
        voice_cfg = settings.voice
        session = VoiceSession(
            b.llm, b.stt, b.tts, b.vad_factory(), send_json, send_bytes,
            max_history_chars=int(voice_cfg.get("max_history_chars", 6000)),
            max_session_seconds=int(voice_cfg.get("max_session_seconds", 900)),
        )
        try:
            while not session.ended:
                message = await ws.receive()
                if message["type"] == "websocket.disconnect":
                    break
                if message.get("bytes") is not None:
                    await session.handle_audio(message["bytes"])
                elif message.get("text") is not None:
                    try:
                        data = json.loads(message["text"])
                    except json.JSONDecodeError:
                        continue
                    if isinstance(data, dict):
                        await session.handle_json(data)
        except BackendUnavailable as exc:
            await send_json({"type": "error", "code": "ai_unavailable", "message": str(exc)})
        finally:
            await session._cancel_turn(announce=False)
            try:
                await ws.close()
            except RuntimeError:
                pass

    @app.exception_handler(BackendUnavailable)
    async def unavailable_handler(_, exc: BackendUnavailable):
        return JSONResponse(status_code=503, content={"error": str(exc)})

    return app


_default: Optional[FastAPI] = None


def __getattr__(name: str):
    """`uvicorn app.main:app` resolves `app` lazily, so importing this module in tests needs no config file."""
    global _default
    if name == "app":
        if _default is None:
            _default = create_app()
        return _default
    raise AttributeError(name)
