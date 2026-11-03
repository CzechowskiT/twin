"""Live recruiter collaboration notes — tenant-scoped, no demo fixtures."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterCollaborationNote
from app.services.recruiter_inbox import _require_company_slug

DEMO_SUBJECT_IDS = frozenset({"demo-candidate-001", "demo-role-001"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_collaboration_notes(
    db: Session,
    *,
    company_slug: str,
    subject_type: str,
    subject_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    sid = (subject_id or "").strip()
    if sid in DEMO_SUBJECT_IDS:
        raise ValueError("demo_fixture_rejected")
    st = (subject_type or "candidate").strip().lower() or "candidate"
    rows = (
        db.query(RecruiterCollaborationNote)
        .filter(
            RecruiterCollaborationNote.company_slug == slug,
            RecruiterCollaborationNote.subject_type == st,
            RecruiterCollaborationNote.subject_id == sid,
        )
        .order_by(RecruiterCollaborationNote.created_at.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    return {
        "company_slug": slug,
        "subject_type": st,
        "subject_id": sid,
        "items": [
            {
                "id": r.id,
                "body": r.body,
                "author_label": r.author_label,
                "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
            }
            for r in rows
        ],
        "demo": False,
    }


def create_collaboration_note(
    db: Session,
    *,
    company_slug: str,
    subject_type: str,
    subject_id: str,
    body: str,
    author_label: str | None = None,
    created_by_user_id: int | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    sid = (subject_id or "").strip()
    if sid in DEMO_SUBJECT_IDS:
        raise ValueError("demo_fixture_rejected")
    text = (body or "").strip()
    if len(text) < 1 or len(text) > 4000:
        raise ValueError("invalid_body")
    st = (subject_type or "candidate").strip().lower() or "candidate"
    row = RecruiterCollaborationNote(
        company_slug=slug,
        subject_type=st,
        subject_id=sid,
        body=text,
        author_label=(author_label or "").strip()[:128] or None,
        created_by_user_id=created_by_user_id,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "company_slug": slug,
        "subject_type": st,
        "subject_id": sid,
        "body": row.body,
        "author_label": row.author_label,
        "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
        "demo": False,
    }
