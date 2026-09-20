import json
import logging
import threading
import time
from datetime import date, datetime
from typing import Any, Optional

from app import config

logger = logging.getLogger("cache_service")

# Custom JSON encoder to serialize datetime/date objects from MySQL rows
def _json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


class CacheService:
    """Unified cache service supporting Redis with graceful in-memory fallback.
    
    Provides thread-safe session caching, instant active invalidation,
    and multi-worker synchronization.
    """

    def __init__(self):
        self._redis_client = None
        self._is_redis_ready = False
        self._fallback_mem = {}  # key -> (value, expire_at)
        self._fallback_user_tokens = {}  # user_id -> set(token_hash)
        self._mem_lock = threading.Lock()
        self._init_redis()

    def _init_redis(self):
        if not config.REDIS_ENABLED:
            logger.info("Redis disabled via config. Using in-memory cache.")
            return

        try:
            import redis
            pool = redis.ConnectionPool(
                host=config.REDIS_HOST,
                port=config.REDIS_PORT,
                db=config.REDIS_DB,
                password=config.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
                max_connections=20,
            )
            client = redis.Redis(connection_pool=pool)
            client.ping()
            self._redis_client = client
            self._is_redis_ready = True
            print(f"[+] Redis session cache connected: {config.REDIS_HOST}:{config.REDIS_PORT} (DB {config.REDIS_DB})")
        except Exception as err:
            self._is_redis_ready = False
            self._redis_client = None
            print(f"[!] Redis not reachable ({err}). Falling back to thread-safe in-memory cache.")

    @property
    def is_redis(self) -> bool:
        return self._is_redis_ready and self._redis_client is not None

    # ------------------------------------------------------------------
    # Session Cache API (with Active Invalidation)
    # ------------------------------------------------------------------

    def get_session(self, token_hash: str) -> Optional[dict]:
        """Fetch cached user dict by token_hash."""
        if self.is_redis:
            try:
                raw = self._redis_client.get(f"auth:session:{token_hash}")
                if raw:
                    return json.loads(raw)
                return None
            except Exception as e:
                logger.warning(f"Redis get_session error: {e}")

        # Fallback: In-memory
        with self._mem_lock:
            entry = self._fallback_mem.get(f"auth:session:{token_hash}")
            if entry:
                val, exp = entry
                if time.time() < exp:
                    return val.copy()
                self._fallback_mem.pop(f"auth:session:{token_hash}", None)
        return None

    def set_session(self, token_hash: str, user_dict: dict, ttl_seconds: int = 120):
        """Cache user session and track user_id -> token mapping for purge."""
        user_id = str(user_dict.get("id") or "")
        json_str = json.dumps(user_dict, default=_json_serial)

        if self.is_redis:
            try:
                pipe = self._redis_client.pipeline()
                pipe.set(f"auth:session:{token_hash}", json_str, ex=ttl_seconds)
                if user_id:
                    pipe.sadd(f"auth:user_tokens:{user_id}", token_hash)
                    pipe.expire(f"auth:user_tokens:{user_id}", ttl_seconds * 3)
                pipe.execute()
                return
            except Exception as e:
                logger.warning(f"Redis set_session error: {e}")

        # Fallback: In-memory
        exp = time.time() + ttl_seconds
        with self._mem_lock:
            self._fallback_mem[f"auth:session:{token_hash}"] = (user_dict.copy(), exp)
            if user_id:
                if user_id not in self._fallback_user_tokens:
                    self._fallback_user_tokens[user_id] = set()
                self._fallback_user_tokens[user_id].add(token_hash)

    def invalidate_token(self, token_hash: str):
        """Actively revoke session cache for a single token on LOGOUT."""
        if self.is_redis:
            try:
                self._redis_client.delete(f"auth:session:{token_hash}")
            except Exception as e:
                logger.warning(f"Redis invalidate_token error: {e}")

        with self._mem_lock:
            self._fallback_mem.pop(f"auth:session:{token_hash}", None)

    def invalidate_user(self, user_id: str):
        """Actively revoke all sessions for a user on BAN, FREEZE, ROLE CHANGE, APPROVAL."""
        if not user_id:
            return

        if self.is_redis:
            try:
                user_tokens_key = f"auth:user_tokens:{user_id}"
                tokens = self._redis_client.smembers(user_tokens_key)
                if tokens:
                    keys = [f"auth:session:{th}" for th in tokens]
                    self._redis_client.delete(*keys)
                self._redis_client.delete(user_tokens_key)
            except Exception as e:
                logger.warning(f"Redis invalidate_user error: {e}")

        with self._mem_lock:
            tokens = self._fallback_user_tokens.pop(user_id, set())
            for th in tokens:
                self._fallback_mem.pop(f"auth:session:{th}", None)

    # ------------------------------------------------------------------
    # Generic Cache API
    # ------------------------------------------------------------------

    def get(self, key: str) -> Optional[Any]:
        if self.is_redis:
            try:
                raw = self._redis_client.get(f"cache:{key}")
                if raw:
                    return json.loads(raw)
                return None
            except Exception:
                pass
        with self._mem_lock:
            entry = self._fallback_mem.get(f"cache:{key}")
            if entry:
                val, exp = entry
                if time.time() < exp:
                    return val
                self._fallback_mem.pop(f"cache:{key}", None)
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 120, ex: Optional[int] = None):
        ttl = ex if ex is not None else ttl_seconds
        try:
            json_str = json.dumps(value, default=_json_serial)
        except Exception:
            return

        if self.is_redis:
            try:
                self._redis_client.set(f"cache:{key}", json_str, ex=ttl)
                return
            except Exception:
                pass
        with self._mem_lock:
            self._fallback_mem[f"cache:{key}"] = (value, time.time() + ttl)

    def delete(self, key: str):
        """Delete a cached entry by key."""
        if self.is_redis:
            try:
                self._redis_client.delete(f"cache:{key}")
            except Exception as e:
                logger.warning(f"Redis delete error: {e}")
        with self._mem_lock:
            self._fallback_mem.pop(f"cache:{key}", None)

    def delete_pattern(self, pattern: str):
        """Delete all cached entries matching pattern using non-blocking SCAN."""
        if self.is_redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = self._redis_client.scan(cursor=cursor, match=f"cache:{pattern}", count=100)
                    if keys:
                        self._redis_client.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning(f"Redis delete_pattern error: {e}")
        with self._mem_lock:
            import fnmatch
            target = f"cache:{pattern}"
            keys_to_del = [k for k in self._fallback_mem if fnmatch.fnmatch(k, target)]
            for k in keys_to_del:
                self._fallback_mem.pop(k, None)

    # ------------------------------------------------------------------
    # Redis ZSET (Leaderboard & Fast Ranking)
    # ------------------------------------------------------------------

    def zadd(self, key: str, mapping: dict):
        """Add or update member scores in sorted set."""
        if self.is_redis:
            try:
                self._redis_client.zadd(f"zset:{key}", mapping)
            except Exception as e:
                logger.warning(f"Redis zadd error: {e}")

    def zrevrange(self, key: str, start: int, end: int, withscores: bool = False):
        """Retrieve range of members ordered by highest score first."""
        if self.is_redis:
            try:
                return self._redis_client.zrevrange(f"zset:{key}", start, end, withscores=withscores)
            except Exception as e:
                logger.warning(f"Redis zrevrange error: {e}")
        return []

    def zrevrank(self, key: str, member: str) -> Optional[int]:
        """Get 0-indexed ranking of member (0 = #1 top rank)."""
        if self.is_redis:
            try:
                return self._redis_client.zrevrank(f"zset:{key}", member)
            except Exception as e:
                logger.warning(f"Redis zrevrank error: {e}")
        return None


cache_service = CacheService()
