"""Profile-based configuration for ai-service.

The same code runs on the Mac mini (profile "mac") and on the Windows laptop
(profile "win-lite"). Only the TOML file differs. Select it with AI_PROFILE.
Individual values can be overridden from the environment (see ENV_OVERRIDES).
"""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent.parent

# env var -> (section, key, caster)
ENV_OVERRIDES = {
    "AI_LLM_MODEL": ("llm", "model", str),
    "AI_LLM_BASE_URL": ("llm", "base_url", str),
    "AI_STT_MODEL": ("stt", "model", str),
}


@dataclass
class Settings:
    profile: str
    host: str = "127.0.0.1"
    port: int = 8100
    token: str = ""
    llm: Dict[str, Any] = field(default_factory=dict)
    stt: Dict[str, Any] = field(default_factory=dict)
    tts: Dict[str, Any] = field(default_factory=dict)
    vad: Dict[str, Any] = field(default_factory=dict)
    voice: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, profile: str, data: Dict[str, Any]) -> "Settings":
        server = data.get("server", {})
        return cls(
            profile=profile,
            host=server.get("host", "127.0.0.1"),
            port=int(server.get("port", 8100)),
            token=os.getenv("AI_SERVICE_TOKEN", server.get("token", "")),
            llm=dict(data.get("llm", {})),
            stt=dict(data.get("stt", {})),
            tts=dict(data.get("tts", {})),
            vad=dict(data.get("vad", {})),
            voice=dict(data.get("voice", {})),
        )


def load_settings(profile: str | None = None, config_dir: Path | None = None) -> Settings:
    profile = profile or os.getenv("AI_PROFILE", "mac")
    config_dir = config_dir or ROOT
    path = config_dir / f"config.{profile}.toml"
    if not path.is_file():
        raise FileNotFoundError(f"No config for AI_PROFILE={profile!r}: expected {path}")
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    settings = Settings.from_dict(profile, data)
    for env_name, (section, key, cast) in ENV_OVERRIDES.items():
        value = os.getenv(env_name)
        if value:
            getattr(settings, section)[key] = cast(value)
    return settings
