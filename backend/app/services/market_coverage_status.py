"""Ops status: corpus metrics + autonomous scrape run telemetry."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.market_coverage import build_market_coverage_report
from app.services.scrape_run_tracking import get_latest_run, get_run_history, last_scrape_run_at


def _parse_run_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def market_update_label(last_at: str | None) -> str | None:
    """Dashboard copy: today / yesterday / older / unknown."""
    dt = _parse_run_ts(last_at)
    if not dt:
        return "unknown"
    now = datetime.now(timezone.utc)
    if dt.date() == now.date():
        return "today"
    if (now - dt).days == 1:
        return "yesterday"
    return "older"


def feed_stale_hours_threshold() -> int:
    """Hours without a finished scrape before dashboard warns."""
    return max(24, int(get_settings().job_feed_active_days) * 12)


def build_market_coverage_status(db: Session) -> dict:
    """Admin / health snapshot for autonomous market coverage."""
    settings = get_settings()
    coverage = build_market_coverage_report(db)
    target = max(1000, int(settings.market_coverage_target_jobs))
    active = int(coverage.get("active_validated_jobs") or 0)
    progress_pct = round(min(100.0, 100.0 * active / target), 1) if target else None

    last_at = last_scrape_run_at()
    last_dt = _parse_run_ts(last_at)
    now = datetime.now(timezone.utc)
    hours_since: float | None = None
    feed_stale = False
    if last_dt:
        hours_since = round((now - last_dt).total_seconds() / 3600.0, 1)
        feed_stale = hours_since > feed_stale_hours_threshold()
    elif active > 0:
        feed_stale = False
    else:
        feed_stale = True

    warnings: list[str] = []
    if feed_stale:
        warnings.append("feed_stale_no_recent_scrape")
    if active < target * 0.5:
        warnings.append("active_corpus_below_half_target")
    latest = get_latest_run()
    if latest and latest.get("status") == "running":
        warnings.append("scrape_run_in_progress")
    for w in list(latest.get("warnings") or []) if latest else []:
        if isinstance(w, str) and w not in warnings:
            warnings.append(w)

    return {
        **coverage,
        "market_coverage_target_jobs": target,
        "progress_to_10k_pct": progress_pct,
        "last_scrape_run_at": last_at,
        "market_update_label": market_update_label(last_at),
        "hours_since_last_scrape": hours_since,
        "feed_stale": feed_stale,
        "feed_stale_hours_threshold": feed_stale_hours_threshold(),
        "warnings": warnings,
        "latest_scrape_run": latest,
        "scrape_run_history": get_run_history(limit=5),
        "scrape_beat_enabled": settings.scrape_beat_enabled,
        "scrape_worker_ready": settings.scrape_worker_ready,
        "celery_task_always_eager": settings.celery_task_always_eager,
        "scrape_jobs_per_board": settings.scrape_jobs_per_board,
        "scrape_between_boards_sec": settings.scrape_between_boards_sec,
        "linkedin_scrape_max_per_run": settings.linkedin_scrape_max_per_run,
        "scrape_respect_robots_txt": settings.scrape_respect_robots_txt,
        "scrape_user_trigger_enabled": settings.scrape_user_trigger_enabled,
        "market_update_label": market_update_label(last_at),
    }
