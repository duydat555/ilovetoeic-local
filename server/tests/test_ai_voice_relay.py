"""Relay tests with fake upstream servers; never touches MySQL or a real ai-service."""
import asyncio
import importlib
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class FakeUpstream:
    """Mimics a websockets connection: async-iterable, send(), close()."""

    def __init__(self, frames, hold=False):
        self.frames, self.hold = list(frames), hold
        self.sent, self.closed = [], False
        self._closed_event = None

    async def send(self, data):
        self.sent.append(data)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.frames:
            await asyncio.sleep(0.005)
            frame = self.frames.pop(0)
            return frame if isinstance(frame, bytes) else json.dumps(frame)
        if self.hold:
            if self._closed_event is None:
                self._closed_event = asyncio.Event()
            await self._closed_event.wait()
        raise StopAsyncIteration

    async def close(self):
        self.closed = True
        if self._closed_event:
            self._closed_event.set()


class StubRouter:
    def __init__(self, endpoints, enabled=True):
        self.endpoints, self.enabled, self.down = endpoints, enabled, set()

    async def pick(self, exclude=None):
        for e in self.endpoints:
            if e.key != exclude and e.key not in self.down:
                return e
        return None

    def mark_down(self, endpoint):
        self.down.add(endpoint.key)

    def headers(self):
        return {}


class AiVoiceRelayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        doubles = {
            "app.db": types.SimpleNamespace(db=MagicMock()),
            "app.services.cache_service": types.SimpleNamespace(cache_service=MagicMock()),
        }
        cls.modules_patch = patch.dict(sys.modules, doubles)
        cls.modules_patch.start()
        cls.ai_voice = importlib.import_module("app.routers.ai_voice")
        cls.client_mod = importlib.import_module("app.services.ai_client")
        cls.app = FastAPI()
        cls.app.include_router(cls.ai_voice.router)

    @classmethod
    def tearDownClass(cls):
        cls.modules_patch.stop()

    def setUp(self):
        E = self.client_mod.AiEndpoint
        self.primary = E("primary", "Mac", "http://mac:8100")
        self.fallback = E("fallback", "Laptop", "http://127.0.0.1:8100")
        self.stub = StubRouter([self.primary, self.fallback])
        self.user = {"id": "u1", "role": "student", "full_name": "Nguyễn An"}
        self.saved = []
        self.upstreams = {}
        self.ai_voice._active_users.clear()

        def fake_auth(token):
            if token != "good":
                raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn.")
            return self.user

        async def fake_connect(endpoint):
            return self.upstreams[endpoint.key]

        def fake_save(user_id, settings, label, started, summary, history):
            self.saved.append({"user": user_id, "label": label, "summary": summary, "history": list(history),
                               "settings": settings})
            return "conv-1"

        self.flags = {"ai_voice": True}
        patches = [
            patch.object(self.ai_voice, "ai_router", self.stub),
            patch.object(self.ai_voice, "_authenticate", fake_auth),
            patch.object(self.ai_voice, "connect_upstream", fake_connect),
            patch.object(self.ai_voice, "_save_conversation", fake_save),
            patch.object(self.ai_voice, "global_flags", lambda: self.flags),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)

    def start_frame(self, **extra):
        return json.dumps({"type": "start", "token": "good", "settings": {"mode": "speaking", **extra}})

    @staticmethod
    def read_until(ws, stop, limit=40):
        events, audio = [], []
        for _ in range(limit):
            msg = ws.receive()
            if msg.get("bytes") is not None:
                audio.append(msg["bytes"])
                continue
            event = json.loads(msg["text"])
            events.append(event)
            if event["type"] == stop:
                break
        return events, audio

    # ------------------------------------------------------------------ gatekeeping
    def test_bad_first_frame_closes(self):
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(json.dumps({"type": "text", "text": "hi"}))
            with self.assertRaises(WebSocketDisconnect) as ctx:
                ws.receive_text()
            self.assertEqual(ctx.exception.code, 4400)

    def test_bad_token_gets_auth_error(self):
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(json.dumps({"type": "start", "token": "nope", "settings": {}}))
            self.assertEqual(json.loads(ws.receive_text())["code"], "auth")

    def test_feature_off_blocks_students_but_not_admin(self):
        self.flags["ai_voice"] = False
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            self.assertEqual(json.loads(ws.receive_text())["code"], "feature_off")
        self.user = {**self.user, "role": "admin"}
        self.upstreams["primary"] = FakeUpstream([{"type": "state", "value": "listening"}], hold=True)
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            self.assertEqual(json.loads(ws.receive_text())["type"], "server")

    def test_no_server_reachable(self):
        self.stub.down = {"primary", "fallback"}
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            self.assertEqual(json.loads(ws.receive_text())["code"], "ai_unavailable")

    def test_second_session_for_same_user_is_refused(self):
        self.upstreams["primary"] = FakeUpstream([], hold=True)
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as first:
            first.send_text(self.start_frame())
            self.assertEqual(json.loads(first.receive_text())["type"], "server")
            with self.client.websocket_connect("/api/v1/ai/voice/ws") as second:
                second.send_text(self.start_frame())
                self.assertEqual(json.loads(second.receive_text())["code"], "already_active")

    # ------------------------------------------------------------------ happy path
    def test_relays_events_audio_and_saves_history_on_summary(self):
        up = FakeUpstream([
            {"type": "state", "value": "listening"},
            {"type": "transcript", "final": True, "text": "Hello", "lang": "en", "source": "voice"},
            {"type": "assistant_delta", "text": "Hi there.", "seq": 0},
            b"\x00\x00\x00\x00pcm",
            {"type": "summary", "turns": 1, "mistakes": [], "new_words": [], "tip": "Great", "transcript": [{"x": 1}]},
        ])
        self.upstreams["primary"] = up
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame(persona="strict", speed="fast", scenario="x" * 1000))
            ws.send_bytes(b"mic-audio")
            ws.send_text(json.dumps({"type": "mute", "value": True}))
            events, audio = self.read_until(ws, "summary")

        self.assertEqual(events[0], {"type": "server", "key": "primary", "label": "Mac"})
        summary = events[-1]
        self.assertEqual(summary["conversationId"], "conv-1")
        self.assertNotIn("transcript", summary)
        self.assertEqual(audio, [b"\x00\x00\x00\x00pcm"])

        start = json.loads(up.sent[0])
        self.assertEqual(start["type"], "start")
        self.assertNotIn("token", json.dumps(start), "the session token must never reach the ai-service")
        self.assertEqual(start["settings"]["persona"], "strict")
        self.assertEqual(start["settings"]["speed"], 1.0, "non-numeric speed falls back to default")
        self.assertEqual(len(start["settings"]["scenario"]), 400)
        self.assertIn("Nguyễn An", start["settings"]["user_brief"])
        self.assertIn(b"mic-audio", up.sent)
        self.assertEqual(self.saved[0]["history"], [{"role": "user", "content": "Hello"},
                                                    {"role": "assistant", "content": "Hi there."}])
        self.assertEqual(self.saved[0]["label"], "Mac")

    def test_client_cannot_inject_a_second_start(self):
        up = FakeUpstream([], hold=True)
        self.upstreams["primary"] = up
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            self.assertEqual(json.loads(ws.receive_text())["type"], "server")
            ws.send_text(json.dumps({"type": "start", "settings": {"mode": "examiner", "history": [1]}}))
            ws.send_text(json.dumps({"type": "interrupt"}))
            for _ in range(100):
                if len(up.sent) >= 2:
                    break
                import time; time.sleep(0.01)
        types_sent = [json.loads(s)["type"] for s in up.sent if isinstance(s, str)]
        self.assertEqual(types_sent, ["start", "interrupt"])

    # ------------------------------------------------------------------ failover
    def test_mac_drop_fails_over_to_laptop_and_replays_history(self):
        mac = FakeUpstream([
            {"type": "transcript", "final": True, "text": "Hello", "lang": "en", "source": "voice"},
            {"type": "assistant_delta", "text": "Hi there.", "seq": 0},
        ])  # then the stream ends: the connection dropped
        laptop = FakeUpstream([{"type": "summary", "turns": 1, "mistakes": [], "new_words": [], "tip": ""}])
        self.upstreams.update(primary=mac, fallback=laptop)

        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            events, _ = self.read_until(ws, "summary")

        kinds = [(e["type"], e.get("label") or e.get("from")) for e in events if e["type"] in ("server", "failover")]
        self.assertEqual(kinds, [("server", "Mac"), ("failover", "Mac"), ("server", "Laptop")])
        replay = json.loads(laptop.sent[0])["settings"]["history"]
        self.assertEqual(replay, [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there."}])
        self.assertIn("primary", self.stub.down)

    def test_both_servers_down_mid_session_reports_error(self):
        mac = FakeUpstream([{"type": "state", "value": "listening"}])
        self.upstreams["primary"] = mac
        self.stub.endpoints = [self.primary]  # no backup configured
        with self.client.websocket_connect("/api/v1/ai/voice/ws") as ws:
            ws.send_text(self.start_frame())
            events, _ = self.read_until(ws, "error")
        self.assertEqual(events[-1]["code"], "ai_unavailable")


class SettingsCleaningTests(unittest.TestCase):
    def test_clean_settings_whitelists_values(self):
        with patch.dict(sys.modules, {"app.db": types.SimpleNamespace(db=MagicMock()),
                                      "app.services.cache_service": types.SimpleNamespace(cache_service=MagicMock())}):
            mod = importlib.import_module("app.routers.ai_voice")
            cleaned = mod._clean_settings({"mode": "hack", "persona": 5, "speed": 9, "voices": {"en": "af", "x": "y"},
                                           "history": ["evil"], "correction": "instant"}, "A\x00B")
        self.assertEqual((cleaned["mode"], cleaned["persona"], cleaned["speed"]), ("assistant", "friendly", 1.3))
        self.assertEqual(cleaned["voices"], {"en": "af"})
        self.assertNotIn("history", cleaned)
        self.assertIn("AB", cleaned["user_brief"])


if __name__ == "__main__":
    unittest.main()
