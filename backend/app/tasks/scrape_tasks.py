"""Celery tasks for job board scraping."""

from typing import Any

from app.config import get_settings
from app.database.session import SessionLocal
from app.scrapers import justjoin, linkedin, praca, pracuj, rocketjobs
from app.scrapers.global_boards import scrape_global_board
from app.scrapers.registry import DEFAULT_BOARD_TIMEOUT_SEC, scrape_all_boards
from app.services.job_storage import upsert_jobs
from app.tasks.celery_app import celery_app


def _scrape_limit() -> int:
    return max(12, min(150, get_settings().scrape_jobs_per_board))


@celery_app.task(name="app.tasks.scrape_tasks.scrape_pracuj_task")
def scrape_pracuj_task() -> dict[str, int]:
    jobs = pracuj.scrape_pracuj(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_task")
def scrape_rocketjobs_task() -> dict[str, int]:
    jobs = rocketjobs.scrape_rocketjobs(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_pracuj_sales_task")
def scrape_pracuj_sales_task() -> dict[str, int]:
    jobs = pracuj.scrape_pracuj_sales(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_sales_task")
def scrape_rocketjobs_sales_task() -> dict[str, int]:
    jobs = rocketjobs.scrape_rocketjobs_sales(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_roles_task")
def scrape_rocketjobs_roles_task() -> dict[str, int]:
    jobs = rocketjobs.scrape_rocketjobs_roles(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_justjoin_task")
def scrape_justjoin_task() -> dict[str, int]:
    jobs = justjoin.scrape_justjoin(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_praca_task")
def scrape_praca_task() -> dict[str, int]:
    jobs = praca.scrape_praca(limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


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
    jobs = scrape_global_board(board_id, limit=_scrape_limit())
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


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
