"""Market coverage metrics and active validated feed helpers."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.config import get_settings
from app.database.models import Job


def active_feed_cutoff(*, days: int | None = None, now: datetime | None = None) -> datetime:
    """UTC cutoff: jobs with scraped_at on or after this instant are in the active feed."""
    ref = now or datetime.utcnow()
    window = days if days is not None else get_settings().job_feed_active_days
    window = max(1, min(120, int(window)))
    return ref - timedelta(days=window)


def apply_active_feed_filter(query: Query, *, days: int | None = None) -> Query:
    """Restrict to validated listings refreshed within the active window."""
    cutoff = active_feed_cutoff(days=days)
    return query.filter(Job.is_validated.is_(True), Job.scraped_at >= cutoff)


def count_active_validated_jobs(db: Session, *, days: int | None = None) -> int:
    return int(
        apply_active_feed_filter(db.query(func.count(Job.id)), days=days).scalar() or 0
    )


def count_validated_jobs(db: Session) -> int:
    return int(db.query(func.count(Job.id)).filter(Job.is_validated.is_(True)).scalar() or 0)


def count_fresh_validated(db: Session, *, hours: int) -> int:
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return int(
        db.query(func.count(Job.id))
        .filter(Job.is_validated.is_(True), Job.scraped_at >= cutoff)
        .scalar()
        or 0
    )


def jobs_by_source(db: Session, *, active_only: bool = False) -> dict[str, int]:
    q = db.query(Job.job_board, func.count(Job.id))
    if active_only:
        q = apply_active_feed_filter(q)
    else:
        q = q.filter(Job.is_validated.is_(True))
    rows = q.group_by(Job.job_board).all()
    return {str(board): int(cnt) for board, cnt in rows}


def build_market_coverage_report(db: Session) -> dict:
    """Ops snapshot for 10k sprint — corpus size, freshness, active feed."""
    settings = get_settings()
    active_days = settings.job_feed_active_days
    now = datetime.utcnow()
    validated = count_validated_jobs(db)
    active = count_active_validated_jobs(db)
    return {
        "generated_at": now.isoformat() + "Z",
        "job_feed_active_days": active_days,
        "validated_jobs_total": validated,
        "active_validated_jobs": active,
        "active_validated_pct": round(100.0 * active / validated, 1) if validated else None,
        "fresh_jobs_24h": count_fresh_validated(db, hours=24),
        "fresh_jobs_7d": count_fresh_validated(db, hours=24 * 7),
        "total_jobs_by_source": jobs_by_source(db, active_only=False),
        "active_jobs_by_source": jobs_by_source(db, active_only=True),
        "scrape_jobs_per_board": settings.scrape_jobs_per_board,
        "match_jobs_scan_limit": settings.match_jobs_scan_limit,
        "registry_adapter_count": 30,
    }
