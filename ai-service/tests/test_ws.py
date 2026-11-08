import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from starlette.websockets import WebSocketDisconnect  # noqa: E402

from app.backends.base import BackendUnavailable  # noqa: E402,F401
from app.backends.factory import Backends  # noqa: E402
from app.backends.fake import FakeLLM, FakeSTT, FakeTTS, ScriptedVAD  # noqa: E402
from app.main import create_app  # noqa: E402
from app.settings import load_settings  # noqa: E402


def make_client(token=""):
    settings = load_settings("win-lite")
    settings.token = token
    backends = Backends(FakeLLM("Hi. Nice to meet you."), FakeSTT("good morning"), FakeTTS(), ScriptedVAD)
    return TestClient(create_app(settings, backends))


def collect_until(ws, stop_type, limit=60):
    events, audio = [], 0
    for _ in range(limit):
        msg = ws.receive()
        if msg.get("bytes") is not None:
            audio += 1
            continue
        event = json.loads(msg["text"])
        events.append(event)
        if event["type"] == stop_type:
            break
    return events, audio


class WebSocketTests(unittest.TestCase):
    def test_health(self):
        with make_client() as client:
            body = client.get("/health").json()
            self.assertTrue(body["ok"])
            self.assertEqual(body["profile"], "win-lite")

    def test_rejects_missing_or_wrong_token(self):
        with make_client(token="secret") as client:
            for kwargs in ({}, {"headers": {"x-ai-token": "nope"}}):
                with self.assertRaises(WebSocketDisconnect):
                    with client.websocket_connect("/voice/ws", **kwargs):
                        pass

    def test_accepts_header_or_query_token(self):
        with make_client(token="secret") as client:
            with client.websocket_connect("/voice/ws", headers={"x-ai-token": "secret"}) as ws:
                ws.send_text(json.dumps({"type": "start", "settings": {}}))
                self.assertEqual(json.loads(ws.receive_text())["value"], "listening")
            with client.websocket_connect("/voice/ws?token=secret") as ws:
                ws.send_text(json.dumps({"type": "start", "settings": {}}))
                self.assertEqual(json.loads(ws.receive_text())["value"], "listening")

    def test_text_turn_then_end_over_the_wire(self):
        with make_client() as client, client.websocket_connect("/voice/ws") as ws:
            ws.send_text(json.dumps({"type": "start", "settings": {}}))
            ws.send_text(json.dumps({"type": "text", "text": "Hello"}))
            events, audio = collect_until(ws, "audio_end")
            types = [e["type"] for e in events]
            self.assertIn("transcript", types)
            self.assertIn("audio_start", types)
            self.assertGreater(audio, 0)
            ws.send_text(json.dumps({"type": "end"}))
            tail, _ = collect_until(ws, "summary")
            self.assertEqual(tail[-1]["type"], "summary")

    def test_garbage_frames_do_not_kill_the_session(self):
        with make_client() as client, client.websocket_connect("/voice/ws") as ws:
            ws.send_text(json.dumps({"type": "start", "settings": {}}))
            ws.send_text("{not json")
            ws.send_text("[1,2,3]")
            ws.send_bytes(b"\x00" * 10)
            ws.send_text(json.dumps({"type": "mute", "value": True}))
            events, _ = collect_until(ws, "state", limit=5)
            self.assertEqual(events[0]["value"], "listening")


if __name__ == "__main__":
    unittest.main()
