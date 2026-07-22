"""Candidate privacy requests — manual processing workflow."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidatePrivacyRequest
from app.services.candidate_trust_audit_service import record_trust_audit_event

ALLOWED_REQUEST_TYPES = frozenset(
    {
        "correction",
        "export",
        "portability",
        "withdrawal",
        "deletion",
        "identity_review",
        "objection",
        "restriction",
    }
)
OPS_ONLY_REQUEST_TYPES = frozenset({"legal_hold"})
ALL_REQUEST_TYPES = ALLOWED_REQUEST_TYPES | OPS_ONLY_REQUEST_TYPES
ALLOWED_STATUSES = frozenset({"open", "processing", "completed", "cancelled"})
FULFILLMENT_STATUSES = frozenset(
    {"queued", "in_progress", "fulfilled", "rejected", "cancelled"}
)
CANDIDATE_MUTABLE_STATUSES = frozenset({"open", "cancelled"})
MANUAL_PROCESSING_NOTICE = (
    "Privacy requests are reviewed manually. TWIN does not auto-complete "
    "correction, export, portability, withdrawal, deletion, identity_review, "
    "objection, or restriction without human review. Self-serve GET "
    "/candidates/me/export.json and account delete are separate from ops DSR "
    "fulfillment. Legal hold is ops-only."
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_json(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _dump_json(data: dict[str, Any]) -> str:
    return json.dumps(data)


def _serialize(row: CandidatePrivacyRequest) -> dict[str, Any]:
    return {
        "id": row.id,
        "request_type": row.request_type,
        "status": row.status,
        "payload": _parse_json(row.payload_json),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "completed_at": row.completed_at,
        "fulfillment_status": getattr(row, "fulfillment_status", None) or "queued",
        "fulfilled_at": getattr(row, "fulfilled_at", None),
        "fulfilled_by_user_id": getattr(row, "fulfilled_by_user_id", None),
        "delivery_receipt": _parse_json(getattr(row, "delivery_receipt_json", None)),
        "legal_hold": bool(getattr(row, "legal_hold", False)),
        "manual_processing_notice": MANUAL_PROCESSING_NOTICE,
    }


def _find_by_idempotency(
    db: Session,
    *,
    candidate_id: int,
    idempotency_key: str | None,
) -> CandidatePrivacyRequest | None:
    if not idempotency_key:
        return None
    return (
        db.query(CandidatePrivacyRequest)
        .filter(
            CandidatePrivacyRequest.candidate_id == candidate_id,
            CandidatePrivacyRequest.idempotency_key == idempotency_key,
        )
        .first()
    )


def create_privacy_request(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    request_type: str,
    payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    if request_type not in ALLOWED_REQUEST_TYPES:
        raise ValueError(f"Unknown request type: {request_type}")
    existing = _find_by_idempotency(db, candidate_id=candidate_id, idempotency_key=idempotency_key)
    if existing:
        return _serialize(existing)
    row = CandidatePrivacyRequest(
        candidate_id=candidate_id,
        request_type=request_type,
        status="open",
        payload_json=_dump_json(payload or {}),
        idempotency_key=idempotency_key,
        created_by_user_id=user_id,
        fulfillment_status="queued",
        legal_hold=False,
    )
    db.add(row)
    db.flush()
    record_trust_audit_event(
        db,
        candidate_id=candidate_id,
        event_type="privacy_request_created",
        summary=f"Privacy request submitted: {request_type}",
        metadata={"request_id": row.id, "request_type": request_type},
        actor="candidate",
        actor_user_id=user_id,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)


def get_privacy_request(
    db: Session,
    *,
    candidate_id: int,
    request_id: int,
) -> dict[str, Any] | None:
    row = (
        db.query(CandidatePrivacyRequest)
        .filter(
            CandidatePrivacyRequest.id == request_id,
            CandidatePrivacyRequest.candidate_id == candidate_id,
        )
        .first()
    )
    return _serialize(row) if row else None


def list_privacy_requests(
    db: Session,
    *,
    candidate_id: int,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    q = (
        db.query(CandidatePrivacyRequest)
        .filter(CandidatePrivacyRequest.candidate_id == candidate_id)
        .order_by(CandidatePrivacyRequest.created_at.desc())
    )
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    return {"items": [_serialize(row) for row in rows], "total": total}


def cancel_privacy_request(
    db: Session,
    *,
    candidate_id: int,
    request_id: int,
    user_id: int,
) -> dict[str, Any]:
    row = (
        db.query(CandidatePrivacyRequest)
        .filter(
            CandidatePrivacyRequest.id == request_id,
            CandidatePrivacyRequest.candidate_id == candidate_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Privacy request not found")
    if row.status in {"completed", "cancelled"}:
        raise ValueError(f"Cannot cancel request in status: {row.status}")
    row.status = "cancelled"
    row.updated_at = _utcnow()
    record_trust_audit_event(
        db,
        candidate_id=candidate_id,
        event_type="privacy_request_cancelled",
        summary=f"Privacy request cancelled: {row.request_type}",
        metadata={"request_id": row.id},
        actor="candidate",
        actor_user_id=user_id,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)


def count_privacy_requests_by_type(db: Session, *, candidate_id: int) -> dict[str, int]:
    rows = (
        db.query(CandidatePrivacyRequest)
        .filter(CandidatePrivacyRequest.candidate_id == candidate_id)
        .all()
    )
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.request_type] = counts.get(row.request_type, 0) + 1
    return counts


def create_ops_privacy_request(
    db: Session,
    *,
    candidate_id: int,
    actor_user_id: int | None,
    request_type: str,
    payload: dict[str, Any] | None = None,
    legal_hold: bool = False,
) -> dict[str, Any]:
    """Ops/admin path — supports legal_hold and queue seeding."""
    from app.database.models import Candidate

    if request_type not in ALL_REQUEST_TYPES:
        raise ValueError(f"Unknown request type: {request_type}")
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError("Candidate not found")
    # created_by_user_id is NOT NULL FK — attribute to candidate owner when ops actor is token-only.
    created_by = actor_user_id if actor_user_id and actor_user_id > 0 else candidate.user_id
    is_hold = request_type == "legal_hold" or legal_hold
    row = CandidatePrivacyRequest(
        candidate_id=candidate_id,
        request_type=request_type,
        status="open",
        payload_json=_dump_json(payload or {}),
        created_by_user_id=created_by,
        fulfillment_status="queued",
        legal_hold=is_hold,
    )
    db.add(row)
    db.flush()
    record_trust_audit_event(
        db,
        candidate_id=candidate_id,
        event_type="privacy_request_ops_created",
        summary=f"Ops privacy request: {request_type}",
        metadata={"request_id": row.id, "request_type": request_type, "legal_hold": is_hold},
        actor="ops",
        actor_user_id=actor_user_id if actor_user_id and actor_user_id > 0 else None,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)


def set_privacy_request_legal_hold(
    db: Session,
    *,
    request_id: int,
    legal_hold: bool,
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    row = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.id == request_id).first()
    if not row:
        raise ValueError("Privacy request not found")
    row.legal_hold = bool(legal_hold)
    row.updated_at = _utcnow()
    record_trust_audit_event(
        db,
        candidate_id=row.candidate_id,
        event_type="privacy_request_ops_created",
        summary=f"Legal hold {'set' if legal_hold else 'cleared'} on privacy request {request_id}",
        metadata={"request_id": row.id, "legal_hold": bool(legal_hold)},
        actor="ops",
        actor_user_id=actor_user_id if actor_user_id and actor_user_id > 0 else None,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)


def list_privacy_ops_queue(
    db: Session,
    *,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    q = db.query(CandidatePrivacyRequest).order_by(CandidatePrivacyRequest.created_at.desc())
    if status_filter:
        if status_filter in FULFILLMENT_STATUSES:
            q = q.filter(CandidatePrivacyRequest.fulfillment_status == status_filter)
        elif status_filter in ALLOWED_STATUSES:
            q = q.filter(CandidatePrivacyRequest.status == status_filter)
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    return {"items": [_serialize(row) for row in rows], "total": total}


def fulfill_privacy_request(
    db: Session,
    *,
    request_id: int,
    actor_user_id: int | None,
    fulfillment_status: str,
    delivery_receipt: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if fulfillment_status not in FULFILLMENT_STATUSES:
        raise ValueError(f"Invalid fulfillment_status: {fulfillment_status}")
    row = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.id == request_id).first()
    if not row:
        raise ValueError("Privacy request not found")
    if row.legal_hold and fulfillment_status == "fulfilled" and row.request_type == "deletion":
        raise ValueError("legal_hold_blocks_deletion_fulfillment")
    row.fulfillment_status = fulfillment_status
    row.updated_at = _utcnow()
    actor_id = actor_user_id if actor_user_id and actor_user_id > 0 else None
    if fulfillment_status == "fulfilled":
        row.status = "completed"
        row.completed_at = _utcnow()
        row.fulfilled_at = _utcnow()
        row.fulfilled_by_user_id = actor_id
        if delivery_receipt is not None:
            row.delivery_receipt_json = _dump_json(delivery_receipt)
    elif fulfillment_status == "rejected":
        row.status = "completed"
        row.completed_at = _utcnow()
        row.fulfilled_by_user_id = actor_id
        if delivery_receipt is not None:
            row.delivery_receipt_json = _dump_json(delivery_receipt)
    elif fulfillment_status == "cancelled":
        row.status = "cancelled"
    elif fulfillment_status == "in_progress":
        row.status = "processing"
    record_trust_audit_event(
        db,
        candidate_id=row.candidate_id,
        event_type="privacy_request_fulfilled",
        summary=f"Privacy request {fulfillment_status}: {row.request_type}",
        metadata={
            "request_id": row.id,
            "fulfillment_status": fulfillment_status,
            "delivery_receipt": delivery_receipt or {},
        },
        actor="ops",
        actor_user_id=actor_id,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)
