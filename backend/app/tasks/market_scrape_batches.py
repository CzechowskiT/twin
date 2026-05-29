"""Autonomous daily market scrape batches — ingest only, no auto-apply side effects."""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.database.session import SessionLocal
from app.scrapers import compliance, linkedin
from app.scrapers.global_boards import GLOBAL_BOARD_SPECS
from app.scrapers.registry import (
    DEFAULT_BOARD_TIMEOUT_SEC,
    GREENHOUSE_SCRAPERS,
    SCRAPE_REGISTRY,
    _scrape_with_timeout,
    linkedin_scrape_enabled,
    scrape_board_ids_ordered,
)
from app.services.job_storage import upsert_jobs_with_metrics
from app.services.market_coverage import count_active_validated_jobs
from app.services.scrape_run_tracking import finish_run, record_board, start_run

logger = logging.getLogger(__name__)

PL_CORE_BOARD_IDS: tuple[str, ...] = (
    "pracuj",
    "pracuj-cities",
    "pracuj-sales",
    "rocketjobs",
    "rocketjobs-sales",
    "rocketjobs-roles",
    "justjoin",
    "praca",
)

LINKEDIN_BOARD_IDS: tuple[str, ...] = ("linkedin", "linkedin-sales")


def _scrape_limit() -> int:
    return max(12, min(200, get_settings().scrape_jobs_per_board))


def _linkedin_limit() -> int:
    cap = max(1, min(25, int(get_settings().linkedin_scrape_max_per_run)))
    return min(cap, _scrape_limit())


def _ordered_subset(board_ids: tuple[str, ...]) -> list[str]:
    allow = set(scrape_board_ids_ordered())
    return [bid for bid in board_ids if bid in allow and bid in SCRAPE_REGISTRY]


def _run_boards_serial(
    *,
    run_kind: str,
    board_ids: list[str],
    per_board_timeout_sec: int = DEFAULT_BOARD_TIMEOUT_SEC,
) -> dict[str, Any]:
    """Scrape boards one-by-one; continue on failure. Does not trigger auto-apply."""
    start_run(run_kind=run_kind, board_ids=board_ids)
    errors: dict[str, str] = {}
    total_saved = 0

    db = SessionLocal()
    try:
        for index, board_id in enumerate(board_ids):
            fn = SCRAPE_REGISTRY.get(board_id)
            if not fn:
                record_board(
                    run_kind=run_kind,
                    board_id=board_id,
                    metrics={"scraped": 0, "saved": 0, "new": 0, "updated": 0},
                    error="unknown board",
                )
                continue
            jobs: list = []
            error: str | None = None
            try:
                jobs, timeout_err = _scrape_with_timeout(fn, per_board_timeout_sec)
                error = timeout_err
            except linkedin.LinkedInScrapeError as exc:
                error = str(exc)
                logger.info("LinkedIn scrape skipped (%s): %s", board_id, error)
            except Exception as exc:
                error = str(exc)[:500]
                logger.warning("Board scrape failed %s: %s", board_id, error)

            metrics = {"scraped": 0, "saved": 0, "new": 0, "updated": 0, "deduped": 0, "rejected": 0}
            if jobs:
                stats = upsert_jobs_with_metrics(db, jobs)
                metrics = {k: int(stats.get(k, 0)) for k in ("scraped", "saved", "new", "updated", "deduped", "rejected")}
                total_saved += int(stats.get("new", 0))
            record_board(run_kind=run_kind, board_id=board_id, metrics=metrics, error=error)
            if error:
                errors[board_id] = error
            if index < len(board_ids) - 1:
                compliance.sleep_between_boards()
        active_after = count_active_validated_jobs(db)
    finally:
        db.close()

    finish_run(run_kind=run_kind, active_validated_after=active_after)
    return {"run_kind": run_kind, "total_saved": total_saved, "errors": errors, "active_validated_after": active_after}


def run_daily_pl_core() -> dict[str, Any]:
    return _run_boards_serial(run_kind="pl_core_daily", board_ids=_ordered_subset(PL_CORE_BOARD_IDS))


def run_daily_greenhouse() -> dict[str, Any]:
    gh_ids = tuple(sorted(GREENHOUSE_SCRAPERS.keys()))
    return _run_boards_serial(run_kind="greenhouse_daily", board_ids=_ordered_subset(gh_ids))


def run_daily_global_html() -> dict[str, Any]:
    global_ids = tuple(sorted(GLOBAL_BOARD_SPECS.keys()))
    return _run_boards_serial(run_kind="global_html", board_ids=_ordered_subset(global_ids))


def run_daily_linkedin() -> dict[str, Any]:
    """Low cap; off by default — enable LINKEDIN_SCRAPE_ENABLED or allowlist linkedin*."""
    if not linkedin_scrape_enabled():
        return {
            "run_kind": "linkedin_daily",
            "skipped": True,
            "reason": "linkedin scrape disabled (set LINKEDIN_SCRAPE_ENABLED=true or allowlist)",
        }
    return _run_boards_serial(run_kind="linkedin_daily", board_ids=_ordered_subset(LINKEDIN_BOARD_IDS))
