"""LLM backend that talks to a local Ollama server (same API on macOS and Windows)."""
from __future__ import annotations

import json
from typing import AsyncIterator, List, Optional

import httpx

from .base import BackendUnavailable, LLMBackend, Message


class OllamaLLM(LLMBackend):
    def __init__(self, base_url: str = "http://127.0.0.1:11434", model: str = "qwen3:14b",
                 keep_alive: str | int = "30m", num_ctx: int = 4096, temperature: float = 0.6,
                 think: bool = False, client: Optional[httpx.AsyncClient] = None):
        self.model = model
        self.keep_alive = keep_alive
        self.num_ctx = num_ctx
        self.temperature = temperature
        self.think = think
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=httpx.Timeout(120.0, connect=5.0))

    def _payload(self, messages: List[Message], stream: bool, **options) -> dict:
        body = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "think": self.think,
            "keep_alive": self.keep_alive,
            "options": {
                "num_ctx": self.num_ctx,
                "temperature": options.pop("temperature", self.temperature),
                **options,
            },
        }
        return body

    async def stream(self, messages: List[Message], **options) -> AsyncIterator[str]:
        try:
            async with self._client.stream("POST", "/api/chat", json=self._payload(messages, True, **options)) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    delta = data.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                    if data.get("done"):
                        break
        except httpx.ConnectError as exc:
            raise BackendUnavailable("Ollama is not reachable. Is `ollama serve` running?") from exc

    async def complete(self, messages: List[Message], json_schema: Optional[dict] = None, **options) -> str:
        body = self._payload(messages, False, **options)
        if json_schema is not None:
            body["format"] = json_schema
        try:
            resp = await self._client.post("/api/chat", json=body)
            resp.raise_for_status()
        except httpx.ConnectError as exc:
            raise BackendUnavailable("Ollama is not reachable. Is `ollama serve` running?") from exc
        return resp.json().get("message", {}).get("content", "")

    async def warmup(self) -> None:
        # An empty chat loads the model into memory and applies keep_alive.
        try:
            await self._client.post("/api/chat", json={"model": self.model, "messages": [],
                                                       "keep_alive": self.keep_alive})
        except httpx.HTTPError:
            pass
