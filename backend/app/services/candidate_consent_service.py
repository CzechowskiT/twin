"""Candidate consent state, receipts, grant/withdraw — Wave B slice 2."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, CandidateConsentReceipt, User
from app.services.candidate_trust_audit_service import record_trust_audit_event

ALLOWED_PURPOSES = frozenset(
    {"cv_processing", "intro_audio_processing", "talent_pool", "profile_documents"}
)
MANUAL_PROCESSING_NOTICE = (
    "Consent changes are recorded immediately. Some downstream processing "
    "may require manual review before taking effect."
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


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


def _consent_note(purpose: str, status: str) -> str:
    notes = {
        "cv_processing": "CV storage and automated parsing.",
        "intro_audio_processing": "Voice intro storage and future processing.",
        "talent_pool": "Opt-in to recruiter talent pool visibility.",
        "profile_documents": "Additional profile document storage.",
    }
    base = notes.get(purpose, purpose)
    if status == "active":
        return f"{base} Consent granted."
    if status == "withdrawn":
        return f"{base} Consent withdrawn — manual review may apply."
    if status == "review_required":
        return f"{base} Requires explicit review before activation."
    return f"{base} Not yet granted."


def _purpose_status(
    candidate: Candidate,
    user: User,
    purpose: str,
) -> tuple[str, datetime | None, datetime | None]:
    if purpose == "cv_processing":
        if candidate.cv_processing_consent_at:
            return "active", candidate.cv_processing_consent_at, None
        return "not_granted", None, None
    if purpose == "intro_audio_processing":
        if candidate.intro_audio_processing_consent_at:
            return "active", candidate.intro_audio_processing_consent_at, None
        return "not_granted", None, None
    if purpose == "talent_pool":
        if candidate.talent_pool_opt_in:
            return "active", candidate.talent_pool_opt_in_at, None
        return "not_granted", None, None
    if purpose == "profile_documents":
        if user.profile_documents_processing_consent_at:
            return "active", user.profile_documents_processing_consent_at, None
        return "not_granted", None, None
    return "review_required", None, None


def list_consents(db: Session, *, candidate: Candidate, user: User) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    latest: datetime | None = None
    for purpose in sorted(ALLOWED_PURPOSES):
        status, granted_at, withdrawn_at = _purpose_status(candidate, user, purpose)
        if granted_at and (latest is None or granted_at > latest):
            latest = granted_at
        items.append(
            {
                "purpose": purpose,
                "status": status,
                "granted_at": granted_at,
                "withdrawn_at": withdrawn_at,
                "note": _consent_note(purpose, status),
            }
        )
    return {"items": items, "updated_at": latest}


def _find_receipt_by_idempotency(
    db: Session,
    *,
    candidate_id: int,
    idempotency_key: str | None,
) -> CandidateConsentReceipt | None:
    if not idempotency_key:
        return None
    return (
        db.query(CandidateConsentReceipt)
        .filter(
            CandidateConsentReceipt.candidate_id == candidate_id,
            CandidateConsentReceipt.idempotency_key == idempotency_key,
        )
        .first()
    )


def _issue_receipt(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    purpose: str,
    action: str,
    payload: dict[str, Any],
    idempotency_key: str | None,
) -> CandidateConsentReceipt:
    existing = _find_receipt_by_idempotency(db, candidate_id=candidate_id, idempotency_key=idempotency_key)
    if existing:
        return existing
    row = CandidateConsentReceipt(
        candidate_id=candidate_id,
        consent_purpose=purpose,
        action=action,
        status="issued",
        payload_json=_dump_json(payload),
        idempotency_key=idempotency_key,
        created_by_user_id=user_id,
    )
    db.add(row)
    db.flush()
    return row


def grant_consent(
    db: Session,
    *,
    candidate: Candidate,
    user: User,
    purpose: str,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    if purpose not in ALLOWED_PURPOSES:
        raise ValueError(f"Unknown consent purpose: {purpose}")
    now = _utcnow()
    if purpose == "cv_processing":
        candidate.cv_processing_consent_at = now
    elif purpose == "intro_audio_processing":
        candidate.intro_audio_processing_consent_at = now
    elif purpose == "talent_pool":
        candidate.talent_pool_opt_in = True
        candidate.talent_pool_opt_in_at = now
    elif purpose == "profile_documents":
        user.profile_documents_processing_consent_at = now
    receipt = _issue_receipt(
        db,
        candidate_id=candidate.id,
        user_id=user.id,
        purpose=purpose,
        action="grant",
        payload={"purpose": purpose, "granted_at": _iso(now)},
        idempotency_key=idempotency_key,
    )
    record_trust_audit_event(
        db,
        candidate_id=candidate.id,
        event_type="consent_granted",
        summary=f"Consent granted: {purpose}",
        metadata={"purpose": purpose, "receipt_id": receipt.id},
        actor="candidate",
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(candidate)
    db.refresh(user)
    return list_consents(db, candidate=candidate, user=user)


def patch_consent(
    db: Session,
    *,
    candidate: Candidate,
    user: User,
    purpose: str,
    action: str,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    if purpose not in ALLOWED_PURPOSES:
        raise ValueError(f"Unknown consent purpose: {purpose}")
    if action not in {"grant", "withdraw"}:
        raise ValueError("Action must be grant or withdraw")
    if action == "grant":
        return grant_consent(
            db,
            candidate=candidate,
            user=user,
            purpose=purpose,
            idempotency_key=idempotency_key,
        )
    now = _utcnow()
    if purpose == "cv_processing":
        candidate.cv_processing_consent_at = None
    elif purpose == "intro_audio_processing":
        candidate.intro_audio_processing_consent_at = None
    elif purpose == "talent_pool":
        candidate.talent_pool_opt_in = False
        candidate.talent_pool_opt_in_at = None
    elif purpose == "profile_documents":
        user.profile_documents_processing_consent_at = None
    receipt = _issue_receipt(
        db,
        candidate_id=candidate.id,
        user_id=user.id,
        purpose=purpose,
        action="withdraw",
        payload={"purpose": purpose, "withdrawn_at": _iso(now)},
        idempotency_key=idempotency_key,
    )
    record_trust_audit_event(
        db,
        candidate_id=candidate.id,
        event_type="consent_withdrawn",
        summary=f"Consent withdrawn: {purpose}",
        metadata={"purpose": purpose, "receipt_id": receipt.id},
        actor="candidate",
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(candidate)
    db.refresh(user)
    return list_consents(db, candidate=candidate, user=user)


def list_consent_receipts(
    db: Session,
    *,
    candidate_id: int,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    q = (
        db.query(CandidateConsentReceipt)
        .filter(CandidateConsentReceipt.candidate_id == candidate_id)
        .order_by(CandidateConsentReceipt.created_at.desc())
    )
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    items = [
        {
            "id": row.id,
            "consent_purpose": row.consent_purpose,
            "action": row.action,
            "status": row.status,
            "payload": _parse_json(row.payload_json),
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"items": items, "total": total}


def serialize_receipt(row: CandidateConsentReceipt) -> dict[str, Any]:
    return {
        "id": row.id,
        "consent_purpose": row.consent_purpose,
        "action": row.action,
        "status": row.status,
        "payload": _parse_json(row.payload_json),
        "created_at": row.created_at,
    }
