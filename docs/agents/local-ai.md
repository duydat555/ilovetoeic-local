# Local AI (Voice Mode và các tính năng AI chạy trên máy)

Repo này chỉ dùng để phát triển local. Phần AI chạy trong `ai-service/` (FastAPI), tách khỏi backend chính.

## Kiến trúc

```
Trình duyệt ──WS──► Backend (server/app/routers/ai_voice.py) ──WS + X-AI-Token──► ai-service
                     kiểm tra đăng nhập, cờ ai_voice,                            Mac mini (chính, profile "mac")
                     chọn máy, failover, lưu lịch sử                             hoặc laptop (dự phòng, profile "win-lite")
```

- Trình duyệt chỉ nói chuyện với backend. Token phiên gửi trong **frame `start` đầu tiên** (không đặt trên URL). `AI_SERVICE_TOKEN` chỉ nằm ở server.
- `server/app/services/ai_client.py` (`AiRouter`) chọn máy theo thứ tự: `AI_PRIMARY_URL` rồi `AI_FALLBACK_URL`, kiểm tra `/health` (cache 10 giây). `AI_FORCE_ENDPOINT=primary|fallback` để ép một máy khi diễn tập.
- Mất kết nối giữa phiên: relay đánh dấu máy đó hỏng, gửi `{"type":"failover"}`, nối sang máy còn lại và **gửi lại lịch sử hội thoại** qua `settings.history` nên không mất mạch.
- Cờ tính năng `ai_voice` (mặc định **tắt**, admin luôn dùng được). Bật trong trang Quản lý tính năng.

## Giao thức WebSocket

Client → server: `start` (kèm `token`, `settings`), `text`, `mute`, `interrupt`, `end`; frame nhị phân = PCM16 mono 16 kHz.
Server → client: `server`, `state`, `transcript`, `assistant_delta`, `audio_start/end`, `interrupted`, `failover`, `error`, `summary`; frame nhị phân = 4 byte `seq` (big-endian) + PCM16 mono 24 kHz.
Chi tiết ở docstring đầu `ai-service/app/voice/session.py`.

## Quy tắc khi sửa

- Mỗi năng lực AI nằm sau interface trong `ai-service/app/backends/base.py`; chọn bản cài đặt qua `ai-service/config.<profile>.toml`. Đừng gọi thư viện model trực tiếp từ `voice/`.
- Barge-in: client **xả hàng đợi phát ngay** khi nhận `interrupted` hoặc `state=user-speaking` (server không biết client còn đang phát phần đệm).
- Gán `socket.onopen` ngay khi tạo socket (đừng sau `await` xin micro, đã từng gây lỗi không gửi được `start`).
- Giao diện: không gradient, không icon sparkle, không từ IT (server, token, websocket...) trên màn hình; thông báo lỗi bằng tiếng Việt dễ hiểu (xem `FRIENDLY_ERRORS` trong `client/src/hooks/voiceReducer.ts`).
- Migration `server/migrations/20261108_01_add_ai_conversations.sql` chỉ thêm bảng và một dòng cờ; sao lưu DB trước khi chạy.

## Cấu hình backend (`server/.env`)

`AI_PRIMARY_URL`, `AI_FALLBACK_URL`, `AI_SERVICE_TOKEN`, `AI_FORCE_ENDPOINT` (xem `server/.env.example`).

## Kiểm thử

| Phần | Lệnh |
|---|---|
| ai-service (VAD, tách câu, session, barge-in, WS) | `cd ai-service && python -m unittest discover -s tests` |
| Relay backend (auth, cờ, failover, lưu lịch sử) | `cd server && python tests/test_ai_voice_relay.py` |
| Reducer trạng thái client | `cd client && node --test tests/voice-reducer.test.mjs` |
| Trình duyệt thật, micro giả, mock WS | build, `npx vite preview --port 5175`, rồi `node tests/voice-mode.browser.mjs` (ảnh ở `.playwright-mcp/voice-audit/`) |

## Trạng thái hiện tại

Đã có: giao thức, session realtime, relay, giao diện, lịch sử. **Chưa có STT/TTS thật**: trong config đang là `backend = "fake"` (mlx-whisper, faster-whisper, Kokoro, Piper chưa được viết, cần chạy trên Mac để kiểm chứng).
