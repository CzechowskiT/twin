"""In-process sliding-window rate limit for credential login (per client key, e.g. IP)."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, status

_window_sec = 60.0
_lock = Lock()
_events: dict[str, list[float]] = defaultdict(list)


def reset_login_rate_limit_state() -> None:
    """Test helper: clear sliding-window buckets."""
    with _lock:
        _events.clear()


def enforce_login_rate_limit_per_minute(*, client_key: str, max_per_minute: int) -> None:
    """Raise 429 when the same client exceeds max attempts within ~60s (rolling)."""
    if max_per_minute <= 0:
        return
    key = (client_key or "unknown").strip() or "unknown"
    now = time.monotonic()
    cutoff = now - _window_sec
    with _lock:
        bucket = _events[key]
        bucket[:] = [t for t in bucket if t >= cutoff]
        if len(bucket) >= max_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Try again shortly.",
            )
        bucket.append(now)
