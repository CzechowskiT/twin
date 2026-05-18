"""Celery tasks for job board scraping."""

import logging
from collections.abc import Callable
from typing import Any

from app.config import get_settings
from app.database.session import SessionLocal
from app.scrapers import justjoin, linkedin, praca, pracuj, rocketjobs
from app.scrapers.global_boards import GLOBAL_BOARD_SPECS, scrape_global_board
from app.scrapers.registry import DEFAULT_BOARD_TIMEOUT_SEC, scrape_all_boards
from app.services.job_storage import upsert_jobs
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _scrape_limit() -> int:
    return max(12, min(150, get_settings().scrape_jobs_per_board))


def _persist_scrape_board(task_label: str, fetch_jobs: Callable[[], list[Any]]) -> dict[str, int | str]:
    """Run a scraper + DB upsert; swallow scrape/upsert errors into the Celery result (same shape as LinkedIn tasks)."""
    try:
        jobs = fetch_jobs()
    except Exception as exc:
        logger.exception("Board scrape failed (%s)", task_label)
        return {"scraped": 0, "saved": 0, "error": str(exc)}
    db = SessionLocal()
    try:
        try:
            saved = upsert_jobs(db, jobs)
        except Exception as exc:
            logger.exception("Board upsert failed (%s)", task_label)
            return {"scraped": len(jobs), "saved": 0, "error": str(exc)}
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


def _persist_global_board(board_id: str) -> dict[str, int]:
    try:
        jobs = scrape_global_board(board_id, limit=_scrape_limit())
    except Exception:
        logger.exception("Global board scrape failed (board_id=%s)", board_id)
        raise
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_pracuj_task")
def scrape_pracuj_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("pracuj", lambda: pracuj.scrape_pracuj(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_task")
def scrape_rocketjobs_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("rocketjobs", lambda: rocketjobs.scrape_rocketjobs(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_pracuj_sales_task")
def scrape_pracuj_sales_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("pracuj-sales", lambda: pracuj.scrape_pracuj_sales(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_sales_task")
def scrape_rocketjobs_sales_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("rocketjobs-sales", lambda: rocketjobs.scrape_rocketjobs_sales(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_roles_task")
def scrape_rocketjobs_roles_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("rocketjobs-roles", lambda: rocketjobs.scrape_rocketjobs_roles(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_justjoin_task")
def scrape_justjoin_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("justjoin", lambda: justjoin.scrape_justjoin(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_praca_task")
def scrape_praca_task() -> dict[str, int | str]:
    lim = _scrape_limit()
    return _persist_scrape_board("praca", lambda: praca.scrape_praca(limit=lim))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_linkedin_task")
def scrape_linkedin_task() -> dict[str, int | str]:
    try:
        jobs = linkedin.scrape_linkedin(limit=_scrape_limit())
    except linkedin.LinkedInScrapeError as exc:
        return {"scraped": 0, "saved": 0, "error": str(exc)}
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_linkedin_sales_task")
def scrape_linkedin_sales_task() -> dict[str, int | str]:
    try:
        jobs = linkedin.scrape_linkedin_sales(limit=_scrape_limit())
    except linkedin.LinkedInScrapeError as exc:
        return {"scraped": 0, "saved": 0, "error": str(exc)}
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_global_board_task")
def scrape_global_board_task(board_id: str) -> dict[str, int]:
    """Generic entrypoint with a board id (scripts, retries). Prefer board-specific tasks below."""
    return _persist_global_board(board_id)


def _register_global_board_celery_tasks() -> dict[str, Any]:
    """One Celery task per global board id (same ids as /jobs/scrape/{board} and SCRAPE_REGISTRY)."""
    out: dict[str, Any] = {}
    for board_id in GLOBAL_BOARD_SPECS:
        suffix = board_id.replace("-", "_")
        task_name = f"app.tasks.scrape_tasks.scrape_{suffix}_task"

        def _make_task(bid: str, tname: str) -> Any:
            @celery_app.task(name=tname)
            def _board_task() -> dict[str, int]:
                return _persist_global_board(bid)

            return _board_task

        out[board_id] = _make_task(board_id, task_name)
    return out


GLOBAL_BOARD_SCRAPE_TASKS: dict[str, Any] = _register_global_board_celery_tasks()


@celery_app.task(name="app.tasks.scrape_tasks.scrape_all_boards_task")
def scrape_all_boards_task(
    per_board_timeout_sec: int = DEFAULT_BOARD_TIMEOUT_SEC,
) -> dict[str, Any]:
    """Scrape all boards sequentially and persist jobs (continues on per-board failure)."""
    outcomes = scrape_all_boards(per_board_timeout_sec=per_board_timeout_sec)
    boards: dict[str, dict[str, int | str]] = {}
    errors: dict[str, str] = {}
    total_saved = 0

    db = SessionLocal()
    try:
        for outcome in outcomes:
            saved = 0
            if outcome.jobs:
                saved = upsert_jobs(db, outcome.jobs)
                total_saved += saved
            entry: dict[str, int | str] = {
                "scraped": len(outcome.jobs),
                "saved": saved,
            }
            if outcome.error:
                entry["error"] = outcome.error
                errors[outcome.board_id] = outcome.error
            boards[outcome.board_id] = entry
    finally:
        db.close()

    return {"total_saved": total_saved, "boards": boards, "errors": errors}
