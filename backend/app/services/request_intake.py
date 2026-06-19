"""Request intake append queue service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RequestIntakeItem
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

ALLOWED_TYPES = frozenset(
    {
        "correction_preview",
        "portability_preview",
        "revoke_delete_preview",
        "identity_verification_pending",
        "consent_receipt_review",
        "trust_audit_review",
    }
)
ALLOWED_STATUSES = frozenset({"open", "triage", "waiting_human_review", "closed_no_action"})
FORBIDDEN_STATUSES = frozenset({"fulfilled", "completed", "legally_processed", "deleted", "revoked", "sent"})
PATCH_FIELDS = frozenset({"status"})


def _serialize(row: RequestIntakeItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "request_type": row.request_type,
        "subject_ref": row.subject_ref,
        "status": row.status,
        "candidate_ref": row.candidate_ref,
        "company_slug": row.company_slug,
        "source": row.source,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def create_request_intake(
    db: Session,
    *,
    request_type: str,
    subject_ref: str,
    user_id: int,
    candidate_ref: str | None = None,
    company_slug: str | None = None,
    status: str = "open",
) -> dict[str, Any]:
    rt = request_type.strip()
    if rt not in ALLOWED_TYPES:
        raise ValueError("Unsupported request_type.")
    st = status.strip().lower()
    if st in FORBIDDEN_STATUSES or st not in ALLOWED_STATUSES:
        raise ValueError("Unsupported status.")
    subj = subject_ref.strip()
    if not subj:
        raise ValueError("subject_ref is required.")
    row = RequestIntakeItem(
        request_type=rt,
        subject_ref=subj[:128],
        status=st,
        candidate_ref=(candidate_ref or "").strip()[:64] or None,
        company_slug=slugify_company(company_slug.strip()) if company_slug else None,
        source="twin_internal",
        created_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="queue_item_opened",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="request_intake_item",
        target_id=str(row.id),
        metadata={"scope": "request_intake", "item_kind": rt},
    )
    return _serialize(row)


def list_request_intake(db: Session, *, limit: int = 50) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    rows = db.query(RequestIntakeItem).order_by(RequestIntakeItem.updated_at.desc()).limit(cap).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def patch_request_intake(db: Session, *, item_id: int, user_id: int, fields: dict[str, Any]) -> dict[str, Any]:
    row = db.query(RequestIntakeItem).filter(RequestIntakeItem.id == item_id).first()
    if not row:
        raise ValueError("Intake item not found.")
    before = row.status
    for key, value in fields.items():
        if key not in PATCH_FIELDS:
            continue
        st = str(value).strip().lower()
        if st in FORBIDDEN_STATUSES or st not in ALLOWED_STATUSES:
            raise ValueError("Unsupported status.")
        row.status = st
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="request_intake_item",
        target_id=str(row.id),
        metadata={"status_before": before, "status_after": row.status},
    )
    return _serialize(row)
