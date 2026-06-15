"""Recruiter compliance audit trail — append-only, no PII or decline notes."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Job, RecruiterAuditEvent
from app.utils.slug import slugify_company

RECRUITER_AUDIT_ACTION_TYPES = frozenset(
    {
        "decision_accept",
        "decision_decline",
        "review_opened",
        "radar_shortlisted",
        "radar_snoozed",
        "radar_dismissed",
        "radar_draft_prepared",
        "radar_review_card_opened",
    }
)
RECRUITER_CLIENT_AUDIT_ACTION_TYPES = frozenset({"review_opened"})
ALLOWED_META_KEYS = frozenset(
    {
        "status_before",
        "status_after",
        "source",
        "snooze_days",
        "dismiss_reason_code",
        "candidate_id",
        "job_id",
        "radar_score_snapshot",
        "radar_fit_label_snapshot",
    }
)
_FORBIDDEN_META_KEYS = frozenset(
    {"decline_note", "note", "message", "body", "candidate_name", "email", "phone", "cv", "feedback"}
)


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _sanitize_meta(meta: dict[str, Any] | None) -> dict[str, str]:
    if not meta:
        return {}
    clean: dict[str, str] = {}
    for key, value in meta.items():
        if key in _FORBIDDEN_META_KEYS or key not in ALLOWED_META_KEYS or value is None:
            continue
        text = str(value).strip()
        if text:
            clean[key] = text[:256]
    return clean


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


def log_recruiter_audit_event(
    db: Session,
    *,
    application_id: int,
    company_slug: str,
    action_type: str,
    meta: dict[str, Any] | None = None,
) -> dict:
    act = action_type.strip()
    if act not in RECRUITER_AUDIT_ACTION_TYPES:
        raise ValueError("Unsupported audit action_type.")
    slug = _require_company_slug(company_slug)
    _application_for_company(db, application_id=application_id, company_slug=slug)
    clean_meta = _sanitize_meta(meta)
    row = RecruiterAuditEvent(
        application_id=application_id,
        company_slug=slug,
        action_type=act,
        meta_json=json.dumps(clean_meta) if clean_meta else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_event(row)


def list_recruiter_audit_events(
    db: Session,
    *,
    application_id: int,
    company_slug: str,
    limit: int = 50,
) -> dict:
    slug = _require_company_slug(company_slug)
    _application_for_company(db, application_id=application_id, company_slug=slug)
    cap = max(1, min(limit, 100))
    rows = (
        db.query(RecruiterAuditEvent)
        .filter(
            RecruiterAuditEvent.application_id == application_id,
            RecruiterAuditEvent.company_slug == slug,
        )
        .order_by(RecruiterAuditEvent.created_at.desc())
        .limit(cap)
        .all()
    )
    return {
        "application_id": application_id,
        "company_slug": slug,
        "items": [_serialize_event(row) for row in rows],
    }


def _serialize_event(row: RecruiterAuditEvent) -> dict:
    meta: dict[str, str] = {}
    if row.meta_json:
        try:
            loaded = json.loads(row.meta_json)
            if isinstance(loaded, dict):
                meta = _sanitize_meta(loaded)
        except json.JSONDecodeError:
            meta = {}
    return {
        "id": row.id,
        "application_id": row.application_id,
        "company_slug": row.company_slug,
        "action_type": row.action_type,
        "meta": meta,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
