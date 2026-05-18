"""Rate limits, blocklists, cooldowns, and optional human-in-the-loop ack for auto-apply."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import AutoApplyEvent, Job

logger = logging.getLogger(__name__)


def _split_blocklist(raw: str) -> list[str]:
    return [x.strip().lower() for x in (raw or "").split(",") if x.strip()]


def enforce_auto_apply_redis_rate_limit(*, user_id: int, settings: Settings) -> None:
    """Per-user fixed window using Redis (optional; fail-open if Redis is down)."""
    lim = settings.auto_apply_rate_limit_per_minute
    if lim <= 0:
        return
    try:
        import redis
    except ImportError:  # pragma: no cover
        return
    try:
        r = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        bucket = int(time.time()) // 60
        key = f"twin:ratelimit:auto_apply:{user_id}:{bucket}"
        n = int(r.incr(key))
        if n == 1:
            r.expire(key, 120)
        if n > lim:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Auto-apply rate limit exceeded. Try again in a minute.",
            )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - network / redis misconfig
        logger.warning("auto-apply redis rate limit skipped: %s", exc)


def enforce_human_ack_if_required(*, settings: Settings, human_acknowledged: bool) -> None:
    if settings.auto_apply_require_human_ack and not human_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirm autonomous submission (human_acknowledged=true) before auto-apply runs.",
        )


def enforce_job_blocklists(*, settings: Settings, job: Job) -> None:
    company = (job.company or "").strip().lower()
    title = (job.title or "").strip().lower()
    for token in _split_blocklist(settings.auto_apply_company_blocklist):
        if token and token in company:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This employer is on your auto-apply blocklist.",
            )
    for token in _split_blocklist(settings.auto_apply_title_blocklist):
        if token and token in title:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This job title matches your auto-apply title blocklist.",
            )


def enforce_daily_auto_apply_cap(*, db: Session, user_id: int, settings: Settings) -> None:
    cap = settings.auto_apply_daily_max_per_user
    if cap <= 0:
        return
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    n = (
        db.query(func.count())
        .select_from(AutoApplyEvent)
        .filter(AutoApplyEvent.user_id == user_id, AutoApplyEvent.created_at >= start)
        .scalar()
    )
    if (n or 0) >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily auto-apply limit reached. Try again tomorrow or raise the limit in settings.",
        )


def enforce_company_cooldown(*, db: Session, user_id: int, settings: Settings, job: Job) -> None:
    hours = settings.auto_apply_company_cooldown_hours
    if hours <= 0:
        return
    company_key = (job.company or "").strip().lower()
    if not company_key:
        return
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    last = (
        db.query(AutoApplyEvent)
        .filter(
            AutoApplyEvent.user_id == user_id,
            AutoApplyEvent.company_key == company_key,
            AutoApplyEvent.created_at >= since,
        )
        .order_by(AutoApplyEvent.created_at.desc())
        .first()
    )
    if last:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Auto-apply cooldown active for this company ({hours}h).",
        )


def record_auto_apply_event(
    db: Session,
    *,
    user_id: int,
    job: Job,
    outcome: str | None,
) -> None:
    row = AutoApplyEvent(
        user_id=user_id,
        job_id=job.id,
        company_key=(job.company or "").strip().lower()[:255] or None,
        outcome=outcome,
    )
    db.add(row)
    db.commit()
