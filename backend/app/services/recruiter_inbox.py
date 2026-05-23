"""Recruiter batch acceptance inbox — short pre-qualified application list per company."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate, Job
from app.utils.slug import slugify_company


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def build_recruiter_batch(
    db: Session,
    *,
    company_slug: str,
    limit: int = 25,
) -> dict:
    """Applications for jobs matching company slug — applied/interview only."""
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(Application, Job, Candidate)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Application.status.in_((ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEW)),
        )
        .order_by(Application.updated_at.desc())
        .limit(200)
        .all()
    )
    items: list[dict] = []
    for app, job, cand in rows:
        if slugify_company(job.company) != slug:
            continue
        items.append(
            {
                "application_id": app.id,
                "job_title": job.title,
                "company": job.company,
                "candidate_name": (cand.name or "").strip() or "Candidate",
                "status": app.status.value,
                "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                "updated_at": app.updated_at.isoformat() if app.updated_at else None,
            },
        )
        if len(items) >= limit:
            break
    return {"company_slug": slug, "items": items, "total": len(items)}


def respond_recruiter_batch(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    action: str,
    decline_note: str | None = None,
) -> dict:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id)
        .first()
    )
    if not row:
        raise ValueError("Application not found.")
    app, job = row
    if slugify_company(job.company) != slug:
        raise ValueError("Application does not belong to this company.")
    act = action.strip().lower()
    if act == "accept":
        app.status = ApplicationStatus.INTERVIEW
    elif act == "decline":
        app.status = ApplicationStatus.REJECTED
        note = (decline_note or "").strip()
        if note:
            app.recruiter_feedback_raw = note[:2000]
    else:
        raise ValueError("action must be accept or decline")
    app.updated_at = datetime.now(timezone.utc)
    db.add(app)
    db.commit()
    db.refresh(app)
    return {"application_id": app.id, "status": app.status.value}
