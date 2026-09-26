import calendar
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass(frozen=True)
class QuotaStatus:
    provider: str
    used: int
    budget: int
    ratio_used: float
    remaining_ratio: float
    level: str
    tracker_available: bool

    @property
    def routable(self) -> bool:
        return self.tracker_available and self.level != "critical" and self.budget > 0


class RedisQuotaTracker:
    def __init__(self, redis_getter) -> None:
        self._redis_getter = redis_getter

    @staticmethod
    def _period(now: Optional[datetime] = None) -> str:
        current = now or datetime.now(timezone.utc)
        return current.strftime("%Y-%m")

    @classmethod
    def _key(cls, provider: str, now: Optional[datetime] = None) -> str:
        return f"translation:usage:{provider}:{cls._period(now)}"

    @staticmethod
    def _ttl_seconds(now: Optional[datetime] = None) -> int:
        current = now or datetime.now(timezone.utc)
        days_in_month = calendar.monthrange(current.year, current.month)[1]
        if current.month == 12:
            next_month = current.replace(year=current.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = current.replace(month=current.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        seconds = int((next_month - current).total_seconds())
        return max(seconds + days_in_month * 86400, 86400)

    @staticmethod
    def _status(provider: str, used: int, budget: int, available: bool) -> QuotaStatus:
        if not available or budget <= 0:
            return QuotaStatus(provider, used, budget, 1.0, 0.0, "critical", False)
        ratio = max(0.0, used / budget)
        if ratio >= 0.95:
            level = "critical"
        elif ratio >= 0.80:
            level = "soft"
        else:
            level = "normal"
        return QuotaStatus(provider, used, budget, ratio, max(0.0, 1.0 - ratio), level, True)

    async def get_status(self, provider: str, budget: int) -> QuotaStatus:
        try:
            redis_client = await self._redis_getter()
            if not redis_client:
                return self._status(provider, budget, budget, False)
            raw: Any = await redis_client.get(self._key(provider))
            used = int(raw or 0)
            return self._status(provider, used, budget, True)
        except Exception:
            return self._status(provider, budget, budget, False)

    async def record_usage(self, provider: str, character_count: int) -> bool:
        if character_count <= 0:
            return True
        try:
            redis_client = await self._redis_getter()
            if not redis_client:
                return False
            key = self._key(provider)
            pipe = redis_client.pipeline()
            pipe.incrby(key, character_count)
            pipe.expire(key, self._ttl_seconds())
            await pipe.execute()
            return True
        except Exception:
            return False
