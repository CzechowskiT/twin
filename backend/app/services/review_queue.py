"""Review queue persistence service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import ReviewQueueItem
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

ALLOWED_KINDS = frozenset(
    {
        "correction_draft",
        "portability_preview",
        "revoke_delete_preview",
        "identity_verification_unavailable",
        "consent_receipt_review",
        "trust_audit_review",
    }
)
ALLOWED_STATUSES = frozenset({"open", "in_review", "waiting_info", "closed_no_action"})
PATCH_FIELDS = frozenset({"status", "owner_label", "priority"})


def _serialize(row: ReviewQueueItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "item_kind": row.item_kind,
        "subject_ref": row.subject_ref,
        "status": row.status,
        "priority": row.priority,
        "owner_label": row.owner_label,
        "company_slug": row.company_slug,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def create_review_queue_item(
    db: Session,
    *,
    item_kind: str,
    subject_ref: str,
    user_id: int,
    company_slug: str | None = None,
    status: str = "open",
    priority: str | None = None,
    owner_label: str | None = None,
) -> dict[str, Any]:
    kind = item_kind.strip()
    if kind not in ALLOWED_KINDS:
        raise ValueError("Unsupported item_kind.")
    st = status.strip().lower()
    if st not in ALLOWED_STATUSES:
        raise ValueError("Unsupported status.")
    subj = subject_ref.strip()
    if not subj:
        raise ValueError("subject_ref is required.")
    row = ReviewQueueItem(
        item_kind=kind,
        subject_ref=subj[:128],
        status=st,
        priority=(priority or "").strip()[:16] or None,
        owner_label=(owner_label or "").strip()[:120] or None,
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
        event_type="queue_item_opened",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="review_queue_item",
        target_id=str(row.id),
        metadata={"item_kind": kind, "scope": "review_queue"},
    )
    return _serialize(row)


def list_review_queue(db: Session, *, limit: int = 50) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    rows = db.query(ReviewQueueItem).order_by(ReviewQueueItem.updated_at.desc()).limit(cap).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def patch_review_queue_item(db: Session, *, item_id: int, user_id: int, fields: dict[str, Any]) -> dict[str, Any]:
    row = db.query(ReviewQueueItem).filter(ReviewQueueItem.id == item_id).first()
    if not row:
        raise ValueError("Queue item not found.")
    before = row.status
    for key, value in fields.items():
        if key not in PATCH_FIELDS:
            continue
        if key == "status":
            st = str(value).strip().lower()
            if st not in ALLOWED_STATUSES:
                raise ValueError("Unsupported status.")
            row.status = st
        elif key == "owner_label":
            row.owner_label = str(value).strip()[:120] or None
        elif key == "priority":
            row.priority = str(value).strip()[:16] or None
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="review_queue_item",
        target_id=str(row.id),
        metadata={"status_before": before, "status_after": row.status},
    )
    return _serialize(row)
