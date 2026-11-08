# ai-service

Dịch vụ AI chạy local cho ilovetoeic (Voice Mode). Cùng một mã nguồn chạy trên Mac mini (profile `mac`) và laptop Windows (profile `win-lite`).

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env            # đặt AI_PROFILE và AI_SERVICE_TOKEN (chuỗi ngẫu nhiên dài)
AI_PROFILE=win-lite python -m uvicorn app.main:app --host 127.0.0.1 --port 8100
curl http://127.0.0.1:8100/health
```

- LLM cần Ollama đang chạy (`ollama serve`) và model trong `config.<profile>.toml` đã được `ollama pull`.
- STT và TTS hiện là bản giả (`backend = "fake"`); bản thật chưa được cài, xem `docs/agents/local-ai.md`.
- Chạy test: `python -m unittest discover -s tests`.
