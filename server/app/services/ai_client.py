"""Picks which local ai-service to talk to: the Mac mini first, the laptop copy as backup."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

import httpx

from app import config


@dataclass(frozen=True)
class AiEndpoint:
    key: str      # "primary" | "fallback"
    label: str    # shown to the learner, e.g. "Mac"
    url: str      # http(s) base url

    @property
    def ws_url(self) -> str:
        return self.url.replace("https://", "wss://", 1).replace("http://", "ws://", 1) + "/voice/ws"


@dataclass
class _Health:
    ok: bool
    checked_at: float
    model: str = ""
    profile: str = ""
    rtt_ms: int = 0


class AiRouter:
    def __init__(self, endpoints: Optional[List[AiEndpoint]] = None, force: Optional[str] = None,
                 ttl: Optional[float] = None, timeout: Optional[float] = None, client: Optional[httpx.AsyncClient] = None):
        if endpoints is None:
            endpoints = []
            if config.AI_PRIMARY_URL:
                endpoints.append(AiEndpoint("primary", config.AI_PRIMARY_LABEL, config.AI_PRIMARY_URL))
            if config.AI_FALLBACK_URL:
                endpoints.append(AiEndpoint("fallback", config.AI_FALLBACK_LABEL, config.AI_FALLBACK_URL))
        self.endpoints = endpoints
        self.force = force or config.AI_FORCE_ENDPOINT
        self.ttl = config.AI_HEALTH_TTL_SECONDS if ttl is None else ttl
        self.timeout = config.AI_HEALTH_TIMEOUT_SECONDS if timeout is None else timeout
        self._client = client
        self._health: Dict[str, _Health] = {}

    @property
    def enabled(self) -> bool:
        return bool(self.endpoints)

    def headers(self) -> Dict[str, str]:
        return {"X-AI-Token": config.AI_SERVICE_TOKEN} if config.AI_SERVICE_TOKEN else {}

    async def _probe(self, endpoint: AiEndpoint) -> _Health:
        started = time.monotonic()
        try:
            if self._client is not None:
                resp = await self._client.get(f"{endpoint.url}/health", timeout=self.timeout)
            else:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(f"{endpoint.url}/health")
            data = resp.json() if resp.status_code == 200 else {}
            return _Health(ok=bool(data.get("ok")), checked_at=time.monotonic(), model=str(data.get("llm") or ""),
                           profile=str(data.get("profile") or ""), rtt_ms=int((time.monotonic() - started) * 1000))
        except Exception:
            return _Health(ok=False, checked_at=time.monotonic())

    async def health(self, endpoint: AiEndpoint, fresh: bool = False) -> _Health:
        cached = self._health.get(endpoint.key)
        if cached and not fresh and time.monotonic() - cached.checked_at < self.ttl:
            return cached
        result = await self._probe(endpoint)
        self._health[endpoint.key] = result
        return result

    def mark_down(self, endpoint: AiEndpoint) -> None:
        """Called when a live connection drops, so the next pick skips it immediately."""
        self._health[endpoint.key] = _Health(ok=False, checked_at=time.monotonic())

    def _candidates(self, exclude: Optional[str] = None) -> List[AiEndpoint]:
        ordered = list(self.endpoints)
        if self.force in ("primary", "fallback"):
            ordered = [e for e in ordered if e.key == self.force]
        return [e for e in ordered if e.key != exclude]

    async def pick(self, exclude: Optional[str] = None) -> Optional[AiEndpoint]:
        """First healthy endpoint, probing in priority order. None when nothing answers."""
        for endpoint in self._candidates(exclude):
            if (await self.health(endpoint)).ok:
                return endpoint
        return None

    async def status(self) -> dict:
        probes = await asyncio.gather(*(self.health(e) for e in self._candidates()))
        servers = [{"key": e.key, "label": e.label, "ok": h.ok, "model": h.model, "profile": h.profile,
                    "rttMs": h.rtt_ms} for e, h in zip(self._candidates(), probes)]
        active = next((s for s in servers if s["ok"]), None)
        return {"enabled": self.enabled, "available": active is not None, "active": active, "servers": servers,
                "force": self.force}


ai_router = AiRouter()
