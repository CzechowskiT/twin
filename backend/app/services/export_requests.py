"""Export request persistence — preview records only."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import ExportRequest
from app.services.audit_events import create_audit_event

ALLOWED_TYPES = frozenset(
    {
        "candidate_export_preview",
        "trust_audit_preview",
        "consent_receipt_preview",
        "candidate_export_intake",
    }
)
# Intake / preview only — never claim legal DSR fulfillment via this table.
ALLOWED_STATUSES = frozenset(
    {"draft", "preview_created", "awaiting_human_review", "queued_for_ops_intake"}
)
FORBIDDEN_STATUSES = frozenset({"fulfilled", "sent", "completed", "legally_processed"})


def _serialize(row: ExportRequest) -> dict[str, Any]:
    return {
        "id": row.id,
        "request_type": row.request_type,
        "candidate_id": row.candidate_id,
        "role_context_id": row.role_context_id,
        "status": row.status,
        "source": row.source,
        "legal_claim": bool(row.legal_claim),
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def create_export_request(
    db: Session,
    *,
    request_type: str,
    candidate_id: str,
    user_id: int,
    role_context_id: str | None = None,
    status: str = "draft",
) -> dict[str, Any]:
    rt = request_type.strip()
    if rt not in ALLOWED_TYPES:
        raise ValueError("Unsupported request_type.")
    st = status.strip().lower()
    if st in FORBIDDEN_STATUSES or st not in ALLOWED_STATUSES:
        raise ValueError("Unsupported status.")
    cand = candidate_id.strip()
    if not cand:
        raise ValueError("candidate_id is required.")
    row = ExportRequest(
        request_type=rt,
        candidate_id=cand[:64],
        role_context_id=(role_context_id or "").strip()[:64] or None,
        status=st,
        source="twin_internal",
        legal_claim=False,
        created_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_created",
        actor_persona="candidate",
        actor_id=str(user_id),
        target_type="export_request",
        target_id=str(row.id),
        metadata={"scope": "candidate", "preview": "true"},
    )
    return _serialize(row)


def list_export_requests(db: Session, *, candidate_id: str | None = None, limit: int = 50) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(ExportRequest)
    if candidate_id:
        query = query.filter(ExportRequest.candidate_id == candidate_id.strip()[:64])
    rows = query.order_by(ExportRequest.created_at.desc()).limit(cap).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}
