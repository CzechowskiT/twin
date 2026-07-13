"""Recruiter in-app notification preferences — per-company, tenant-isolated."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterNotificationPreferences
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

DEFAULTS = {
    "in_app_inbox_digest": True,
    "in_app_interview_reminder": True,
    "in_app_trust_review_alert": True,
    "in_app_pipeline_update": True,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _serialize(row: RecruiterNotificationPreferences) -> dict[str, Any]:
    return {
        "company_slug": row.company_slug,
        "in_app_inbox_digest": bool(row.in_app_inbox_digest),
        "in_app_interview_reminder": bool(row.in_app_interview_reminder),
        "in_app_trust_review_alert": bool(row.in_app_trust_review_alert),
        "in_app_pipeline_update": bool(row.in_app_pipeline_update),
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "updated_by_ref": row.updated_by_ref,
    }


def _get_or_create(db: Session, company_slug: str) -> RecruiterNotificationPreferences:
    slug = _require_slug(company_slug)
    row = (
        db.query(RecruiterNotificationPreferences)
        .filter(RecruiterNotificationPreferences.company_slug == slug)
        .first()
    )
    if row:
        return row
    row = RecruiterNotificationPreferences(company_slug=slug, **DEFAULTS)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_notification_prefs(db: Session, *, company_slug: str) -> dict[str, Any]:
    return _serialize(_get_or_create(db, company_slug))


def put_notification_prefs(
    db: Session,
    *,
    company_slug: str,
    data: dict[str, bool],
    actor_ref: str = "recruiter_token",
) -> dict[str, Any]:
    slug = _require_slug(company_slug)
    row = _get_or_create(db, slug)
    for key in DEFAULTS:
        row.__setattr__(key, bool(data.get(key, DEFAULTS[key])))
    row.updated_at = _utcnow()
    row.updated_by_ref = actor_ref[:120]
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="recruiter",
        actor_id=actor_ref[:64],
        target_type="visibility_preference",
        target_id=str(row.id),
        metadata={"scope": "recruiter_notification", "field": "all"},
    )
    return _serialize(row)


def patch_notification_prefs(
    db: Session,
    *,
    company_slug: str,
    data: dict[str, bool],
    actor_ref: str = "recruiter_token",
) -> dict[str, Any]:
    if not data:
        raise ValueError("Provide at least one preference field.")
    slug = _require_slug(company_slug)
    row = _get_or_create(db, slug)
    for key, value in data.items():
        if key in DEFAULTS:
            row.__setattr__(key, bool(value))
    row.updated_at = _utcnow()
    row.updated_by_ref = actor_ref[:120]
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="recruiter",
        actor_id=actor_ref[:64],
        target_type="visibility_preference",
        target_id=str(row.id),
        metadata={"scope": "recruiter_notification", "field": ",".join(sorted(data.keys()))[:64]},
    )
    return _serialize(row)


def reset_notification_prefs(
    db: Session,
    *,
    company_slug: str,
    actor_ref: str = "recruiter_token",
) -> dict[str, Any]:
    return put_notification_prefs(db, company_slug=company_slug, data=dict(DEFAULTS), actor_ref=actor_ref)
