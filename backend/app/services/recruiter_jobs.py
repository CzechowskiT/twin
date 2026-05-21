"""Employer-posted jobs via recruiter token (US-R006 minimal)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Job
from app.services.recruiter_inbox import _require_company_slug


def list_company_jobs(db: Session, *, company_slug: str, limit: int = 50) -> list[dict]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(Job)
        .filter(Job.job_board == "employer", Job.external_id.like(f"{slug}-%"))
        .order_by(Job.scraped_at.desc())
        .limit(limit)
        .all()
    )
    return [_job_row(j) for j in rows]


def create_company_job(
    db: Session,
    *,
    company_slug: str,
    title: str,
    location: str | None,
    description: str | None,
    url: str | None,
    salary_min: int | None,
    salary_max: int | None,
) -> dict:
    slug = _require_company_slug(company_slug)
    display_company = slug.replace("-", " ").title()
    external_id = f"{slug}-{secrets.token_hex(6)}"
    job_url = (url or "").strip() or f"https://twin.app/jobs/employer/{external_id}"
    row = Job(
        job_board="employer",
        external_id=external_id,
        title=title.strip()[:300],
        company=display_company[:200],
        location=(location or "").strip()[:200] or None,
        description=(description or "").strip()[:20_000] or None,
        url=job_url[:500],
        salary_min=salary_min,
        salary_max=salary_max,
        is_validated=True,
        scraped_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _job_row(row)


def _job_row(job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "url": job.url,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "is_validated": job.is_validated,
        "created_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }
