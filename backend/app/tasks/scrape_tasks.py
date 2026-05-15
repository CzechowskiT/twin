"""Celery tasks for job board scraping."""

from app.database.session import SessionLocal
from app.scrapers import pracuj, rocketjobs
from app.services.job_storage import upsert_jobs
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.scrape_tasks.scrape_pracuj_task")
def scrape_pracuj_task() -> dict[str, int]:
    jobs = pracuj.scrape_pracuj()
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_rocketjobs_task")
def scrape_rocketjobs_task() -> dict[str, int]:
    jobs = rocketjobs.scrape_rocketjobs()
    db = SessionLocal()
    try:
        saved = upsert_jobs(db, jobs)
    finally:
        db.close()
    return {"scraped": len(jobs), "saved": saved}
