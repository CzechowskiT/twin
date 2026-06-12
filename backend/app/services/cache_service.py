"""Tiny JSON cache: Redis when healthy, otherwise in-process (per-process only)."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self) -> None:
        self._redis = None
        self._mem: dict[str, Any] = {}
        try:
            import redis

            s = get_settings()
            client = redis.Redis.from_url(
                s.redis_url,
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=2.0,
            )
            client.ping()
            self._redis = client
            logger.info("CacheService using Redis")
        except Exception as exc:
            logger.warning("CacheService falling back to memory: %s", exc)
            self._redis = None

    def get_json(self, key: str) -> Any | None:
        if self._redis:
            try:
                raw = self._redis.get(key)
                return json.loads(raw) if raw else None
            except Exception:
                return self._mem.get(key)
        return self._mem.get(key)

    def set_json(self, key: str, value: Any, ttl_sec: int = 3600) -> None:
        ttl_sec = max(1, min(86400 * 7, ttl_sec))
        if self._redis:
            try:
                self._redis.setex(key, ttl_sec, json.dumps(value, default=str))
                return
            except Exception:
                pass
        self._mem[key] = value


_cache: CacheService | None = None


def get_cache_service() -> CacheService:
    global _cache
    if _cache is None:
        _cache = CacheService()
    return _cache
