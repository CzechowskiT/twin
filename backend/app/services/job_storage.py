"""Persist validated scraped jobs with deduplication."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Job
from app.scrapers.base import ScrapedJob


def _job_body_len(job: ScrapedJob) -> int:
    req = (job.requirements or "").strip()
    desc = (job.description or "").strip()
    return len(req) + len(desc)


def _soft_dedupe_key(job: ScrapedJob) -> tuple[str, str, str]:
    return (
        job.job_board,
        (job.title or "").strip().lower()[:200],
        (job.company or "").strip().lower()[:200],
    )


def _prepare_jobs_for_persist(jobs: list[ScrapedJob]) -> list[ScrapedJob]:
    """Drop too-thin rows (optional) and duplicate board+title+company within the same batch."""
    min_body = max(0, get_settings().scrape_min_job_body_chars)
    seen_soft: set[tuple[str, str, str]] = set()
    out: list[ScrapedJob] = []
    for job in jobs:
        if min_body > 0 and _job_body_len(job) < min_body:
            continue
        sk = _soft_dedupe_key(job)
        if sk in seen_soft:
            continue
        seen_soft.add(sk)
        out.append(job)
    return out


def upsert_jobs_with_metrics(db: Session, jobs: list[ScrapedJob]) -> dict[str, int]:
    """Persist jobs and return per-batch counters for scrape run telemetry."""
    min_body = max(0, get_settings().scrape_min_job_body_chars)
    prepared = _prepare_jobs_for_persist(jobs)
    rejected = 0
    if min_body > 0:
        for job in jobs:
            if _job_body_len(job) < min_body:
                rejected += 1
    deduped = max(0, len(jobs) - rejected - len(prepared))
    new_rows = 0
    updated_rows = 0
    now = datetime.utcnow()
    for item in prepared:
        exists = (
            db.query(Job)
            .filter(Job.job_board == item.job_board, Job.external_id == item.external_id)
            .first()
        )
        if exists:
            exists.scraped_at = now
            exists.is_validated = True
            if item.title:
                exists.title = item.title
            if item.company:
                exists.company = item.company
            if item.location:
                exists.location = item.location
            if item.url:
                exists.url = item.url
            if item.salary_min is not None:
                exists.salary_min = item.salary_min
            if item.salary_max is not None:
                exists.salary_max = item.salary_max
            if item.requirements:
                exists.requirements = item.requirements
            if item.description:
                exists.description = item.description
            updated_rows += 1
            continue
        db.add(
            Job(
                job_board=item.job_board,
                external_id=item.external_id,
                title=item.title,
                company=item.company,
                location=item.location,
                salary_min=item.salary_min,
                salary_max=item.salary_max,
                requirements=item.requirements,
                description=item.description,
                url=item.url,
                is_validated=True,
                scraped_at=now,
            )
        )
        new_rows += 1
    db.commit()
    return {
        "scraped": len(jobs),
        "saved": new_rows,
        "new": new_rows,
        "updated": updated_rows,
        "deduped": deduped,
        "rejected": rejected,
    }


def upsert_jobs(db: Session, jobs: list[ScrapedJob]) -> int:
    """Insert new jobs; refresh scraped_at on known external ids. Returns count of new rows."""
    return int(upsert_jobs_with_metrics(db, jobs).get("new", 0))
