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
        role_status="published",
        scraped_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _job_row(row)


def _job_for_company(db: Session, *, job_id: int, company_slug: str) -> Job:
    slug = _require_company_slug(company_slug)
    job = db.query(Job).filter(Job.id == job_id, Job.job_board == "employer").one_or_none()
    if job is None:
        raise ValueError("Job not found.")
    if not (job.external_id or "").startswith(f"{slug}-"):
        raise ValueError("Job does not belong to this company.")
    return job


def update_company_job(
    db: Session,
    *,
    company_slug: str,
    job_id: int,
    title: str | None = None,
    location: str | None = None,
    description: str | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    role_status: str | None = None,
) -> dict:
    job = _job_for_company(db, job_id=job_id, company_slug=company_slug)
    if title is not None:
        clean = title.strip()
        if len(clean) < 2:
            raise ValueError("title is required.")
        job.title = clean[:300]
    if location is not None:
        job.location = location.strip()[:200] or None
    if description is not None:
        job.description = description.strip()[:20_000] or None
    if salary_min is not None:
        job.salary_min = salary_min
    if salary_max is not None:
        job.salary_max = salary_max
    if role_status is not None:
        status = role_status.strip().lower()
        if status not in {"draft", "published", "archived", "closed"}:
            raise ValueError("role_status must be draft|published|archived|closed.")
        job.role_status = status
        if status in {"archived", "closed"}:
            job.is_validated = False
        elif status == "published":
            job.is_validated = True
    db.commit()
    db.refresh(job)
    return _job_row(job)


def archive_company_job(db: Session, *, company_slug: str, job_id: int) -> dict:
    return update_company_job(
        db,
        company_slug=company_slug,
        job_id=job_id,
        role_status="archived",
    )


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
        "role_status": job.role_status or "draft",
        "created_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }
