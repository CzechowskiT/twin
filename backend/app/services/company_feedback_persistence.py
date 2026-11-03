"""Company feedback persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CompanyFeedbackItem
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

ALLOWED_STATUSES = frozenset({"draft", "submitted_for_review", "needs_revision"})
PATCH_FIELDS = frozenset({"status", "rating_preview", "comment"})


def _serialize(row: CompanyFeedbackItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "candidate_ref": row.candidate_ref,
        "role_ref": row.role_ref,
        "status": row.status,
        "rating_preview": row.rating_preview,
        "comment": row.comment,
        "company_slug": row.company_slug,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def create_company_feedback(
    db: Session,
    *,
    candidate_ref: str,
    role_ref: str,
    user_id: int,
    company_slug: str | None = None,
    status: str = "draft",
    rating_preview: str | None = None,
    comment: str | None = None,
) -> dict[str, Any]:
    st = status.strip().lower()
    if st not in ALLOWED_STATUSES:
        raise ValueError("Unsupported status.")
    cand, role = candidate_ref.strip(), role_ref.strip()
    if not cand or not role:
        raise ValueError("candidate_ref and role_ref required.")
    row = CompanyFeedbackItem(
        candidate_ref=cand[:64],
        role_ref=role[:64],
        status=st,
        rating_preview=(rating_preview or "").strip()[:16] or None,
        comment=(comment or "").strip() or None,
        company_slug=slugify_company(company_slug.strip()) if company_slug else None,
        created_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="feedback_drafted",
        actor_persona="company",
        actor_id=str(user_id),
        target_type="company_feedback",
        target_id=str(row.id),
        metadata={"scope": "company", "preview": "true"},
    )
    return _serialize(row)


def list_company_feedback(db: Session, *, user_id: int, limit: int = 50) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    rows = (
        db.query(CompanyFeedbackItem)
        .filter(CompanyFeedbackItem.created_by_user_id == user_id)
        .order_by(CompanyFeedbackItem.updated_at.desc())
        .limit(cap)
        .all()
    )
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def patch_company_feedback(db: Session, *, item_id: int, user_id: int, fields: dict[str, Any]) -> dict[str, Any]:
    row = db.query(CompanyFeedbackItem).filter(CompanyFeedbackItem.id == item_id).first()
    if not row:
        raise ValueError("Feedback not found.")
    if row.created_by_user_id != user_id:
        raise ValueError("Not authorized.")
    before = row.status
    for key, value in fields.items():
        if key not in PATCH_FIELDS:
            continue
        if key == "status":
            st = str(value).strip().lower()
            if st not in ALLOWED_STATUSES:
                raise ValueError("Unsupported status.")
            row.status = st
        elif key == "rating_preview":
            row.rating_preview = str(value).strip()[:16] or None
        elif key == "comment":
            row.comment = str(value).strip() or None
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="company",
        actor_id=str(user_id),
        target_type="company_feedback",
        target_id=str(row.id),
        metadata={"status_before": before, "status_after": row.status},
    )
    return _serialize(row)
