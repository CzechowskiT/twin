"""Candidate privacy requests — manual processing workflow."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidatePrivacyRequest
from app.services.candidate_trust_audit_service import record_trust_audit_event

ALLOWED_REQUEST_TYPES = frozenset({"correction", "export", "portability", "withdrawal", "deletion"})
ALLOWED_STATUSES = frozenset({"open", "processing", "completed", "cancelled"})
CANDIDATE_MUTABLE_STATUSES = frozenset({"open", "cancelled"})
MANUAL_PROCESSING_NOTICE = (
    "Privacy requests are reviewed manually. TWIN does not auto-complete "
    "correction, export, portability, withdrawal, or deletion without human review."
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
