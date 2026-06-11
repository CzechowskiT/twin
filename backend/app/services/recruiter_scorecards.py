"""Recruiter scorecards — internal notes per application (not audit trail)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, Job, RecruiterApplicationScorecard
from app.utils.slug import slugify_company

MAX_NOTE_LEN = 2000


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _application_for_company(db: Session, *, application_id: int, company_slug: str) -> Application:
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
    return app


def _serialize(row: RecruiterApplicationScorecard) -> dict:
    return {
        "application_id": row.application_id,
        "company_slug": row.company_slug,
        "rating": row.rating,
        "note": row.note,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def get_recruiter_scorecard(
    db: Session,
    *,
    application_id: int,
    company_slug: str,
) -> dict:
    slug = _require_company_slug(company_slug)
    _application_for_company(db, application_id=application_id, company_slug=slug)
    row = (
        db.query(RecruiterApplicationScorecard)
        .filter(
            RecruiterApplicationScorecard.application_id == application_id,
            RecruiterApplicationScorecard.company_slug == slug,
        )
        .first()
    )
    if not row:
        return {"application_id": application_id, "company_slug": slug, "rating": None, "note": None, "updated_at": None}
    return _serialize(row)


def upsert_recruiter_scorecard(
    db: Session,
    *,
    application_id: int,
    company_slug: str,
    rating: int | None = None,
    note: str | None = None,
) -> dict:
    slug = _require_company_slug(company_slug)
    _application_for_company(db, application_id=application_id, company_slug=slug)
    if rating is not None and not (1 <= rating <= 5):
        raise ValueError("rating must be between 1 and 5.")
    clean_note = (note or "").strip()[:MAX_NOTE_LEN] or None
    row = (
        db.query(RecruiterApplicationScorecard)
        .filter(
            RecruiterApplicationScorecard.application_id == application_id,
            RecruiterApplicationScorecard.company_slug == slug,
        )
        .first()
    )
    now = datetime.now(timezone.utc)
    if row:
        if rating is not None:
            row.rating = rating
        if note is not None:
            row.note = clean_note
        row.updated_at = now
    else:
        row = RecruiterApplicationScorecard(
            application_id=application_id,
            company_slug=slug,
            rating=rating,
            note=clean_note,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)
