"""Persist validated scraped jobs with deduplication."""

from sqlalchemy.orm import Session

from app.database.models import Job
from app.scrapers.base import ScrapedJob


def upsert_jobs(db: Session, jobs: list[ScrapedJob]) -> int:
    """Insert new jobs; skip duplicates. Returns count of new rows."""
    saved = 0
    for item in jobs:
        exists = (
            db.query(Job)
            .filter(Job.job_board == item.job_board, Job.external_id == item.external_id)
            .first()
        )
        if exists:
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
            )
        )
        saved += 1
    db.commit()
    return saved
