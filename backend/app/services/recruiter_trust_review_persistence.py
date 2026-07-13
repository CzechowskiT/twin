"""Recruiter trust review queue — consent-safe items and decision history."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.api.talent_pool import candidate_public_id
from app.config import Settings
from app.database.models import (
    Application,
    Candidate,
    CandidatePrivacyRequest,
    Job,
    RecruiterTrustReviewDecision,
    RecruiterTrustReviewItem,
)
from app.services.audit_events import create_audit_event
from app.services.recruiter_inbox import _require_company_slug
from app.utils.slug import slugify_company

ALLOWED_DECISIONS = frozenset({"approve", "reject", "request_clarification"})
ITEM_KINDS = frozenset(
    {
        "correction",
        "portability",
        "revoke_delete",
        "identity",
        "consent_receipt",
        "audit_export",
        "privacy_request",
    }
)
REQUEST_TYPE_TO_KIND: dict[str, str] = {
    "correction": "correction",
    "export": "audit_export",
    "portability": "portability",
    "withdrawal": "revoke_delete",
    "deletion": "revoke_delete",
}
PRIORITY_BY_KIND: dict[str, str] = {
    "revoke_delete": "high",
    "correction": "medium",
    "portability": "medium",
    "identity": "low",
    "consent_receipt": "low",
    "audit_export": "low",
    "privacy_request": "medium",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _candidate_consent_state(candidate: Candidate) -> str:
    if not candidate.talent_pool_opt_in:
        return "hidden"
    return "visible"


def _serialize_item(row: RecruiterTrustReviewItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "item_kind": row.item_kind,
        "subject_ref": row.subject_ref,
        "candidate_ref": row.candidate_ref,
        "reason_key": row.reason_key,
        "reason_summary": row.reason_summary,
        "status": row.status,
        "priority": row.priority,
        "consent_state": row.consent_state,
        "privacy_request_id": row.privacy_request_id,
        "company_slug": row.company_slug,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "decision_count": len(row.decisions or []),
    }


def _serialize_decision(row: RecruiterTrustReviewDecision) -> dict[str, Any]:
    return {
        "id": row.id,
        "item_id": row.item_id,
        "decision": row.decision,
        "note": row.note,
        "actor_ref": row.actor_ref,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def sync_trust_review_from_privacy_requests(
    db: Session,
    *,
    company_slug: str,
    settings: Settings,
) -> int:
    """Idempotent sync — open privacy requests from company applicants."""
    slug = _require_company_slug(company_slug)
    job_rows = db.query(Job.id, Job.company).all()
    job_ids = [jid for jid, company in job_rows if slugify_company(company) == slug]
    if not job_ids:
        return 0
    candidate_ids = (
        db.query(Application.candidate_id)
        .filter(Application.job_id.in_(job_ids))
        .distinct()
        .subquery()
    )
    requests = (
        db.query(CandidatePrivacyRequest)
        .filter(
            CandidatePrivacyRequest.candidate_id.in_(candidate_ids),
            CandidatePrivacyRequest.status.in_(["open", "in_review"]),
        )
        .all()
    )
    created = 0
    for req in requests:
        existing = (
            db.query(RecruiterTrustReviewItem)
            .filter(
                RecruiterTrustReviewItem.company_slug == slug,
                RecruiterTrustReviewItem.privacy_request_id == req.id,
            )
            .first()
        )
        if existing:
            continue
        cand = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
        if not cand:
            continue
        kind = REQUEST_TYPE_TO_KIND.get(req.request_type, "privacy_request")
        cand_ref = candidate_public_id(settings.secret_key, cand.id)
        consent = _candidate_consent_state(cand)
        if consent == "hidden" and kind in {"revoke_delete", "deletion"}:
            consent = "revoked"
        row = RecruiterTrustReviewItem(
            company_slug=slug,
            item_kind=kind,
            subject_ref=f"privacy-request-{req.id}",
            privacy_request_id=req.id,
            candidate_ref=cand_ref,
            reason_key=f"trust.{req.request_type}",
            reason_summary=f"Open {req.request_type} privacy request — manual recruiter review required.",
            status="pending_review",
            priority=PRIORITY_BY_KIND.get(kind, "medium"),
            consent_state=consent,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
        created += 1
    if created:
        db.commit()
    return created


def list_trust_review_queue(
    db: Session,
    *,
    company_slug: str,
    settings: Settings,
    limit: int = 50,
    offset: int = 0,
    status: str | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    sync_trust_review_from_privacy_requests(db, company_slug=slug, settings=settings)
    cap = max(1, min(limit, 100))
    off = max(0, offset)
    q = db.query(RecruiterTrustReviewItem).filter(RecruiterTrustReviewItem.company_slug == slug)
    if status:
        q = q.filter(RecruiterTrustReviewItem.status == status.strip())
    total = q.count()
    rows = (
        q.order_by(RecruiterTrustReviewItem.updated_at.desc())
        .offset(off)
        .limit(cap)
        .all()
    )
    pending = (
        db.query(RecruiterTrustReviewItem)
        .filter(
            RecruiterTrustReviewItem.company_slug == slug,
            RecruiterTrustReviewItem.status == "pending_review",
        )
        .count()
    )
    return {
        "company_slug": slug,
        "summary": {
            "total": total,
            "pending_review": pending,
            "shown": len(rows),
        },
        "offset": off,
        "limit": cap,
        "items": [_serialize_item(r) for r in rows],
        "pilot_status": "PILOT",
        "browser_smoke_status": "NEEDS_FOUNDER_AUTH_SMOKE",
    }


def get_trust_review_item(db: Session, *, company_slug: str, item_id: int) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(RecruiterTrustReviewItem)
        .filter(
            RecruiterTrustReviewItem.company_slug == slug,
            RecruiterTrustReviewItem.id == item_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Trust review item not found.")
    out = _serialize_item(row)
    out["decisions"] = [_serialize_decision(d) for d in (row.decisions or [])]
    return out


def record_trust_review_decision(
    db: Session,
    *,
    company_slug: str,
    item_id: int,
    decision: str,
    note: str | None,
    actor_ref: str,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    dec = decision.strip().lower()
    if dec not in ALLOWED_DECISIONS:
        raise ValueError("Unsupported decision.")
    row = (
        db.query(RecruiterTrustReviewItem)
        .filter(
            RecruiterTrustReviewItem.company_slug == slug,
            RecruiterTrustReviewItem.id == item_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Trust review item not found.")
    if row.consent_state == "deleted":
        raise ValueError("Candidate deletion state — item read-only.")
    status_map = {
        "approve": "approved",
        "reject": "rejected",
        "request_clarification": "clarification_requested",
    }
    now = _utcnow()
    decision_row = RecruiterTrustReviewDecision(
        item_id=row.id,
        decision=dec,
        note=(note or "").strip()[:500] or None,
        actor_ref=actor_ref.strip()[:120] or "recruiter",
        created_at=now,
    )
    row.status = status_map[dec]
    row.updated_at = now
    db.add(decision_row)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="recruiter",
        actor_id=actor_ref[:64],
        target_type="review_queue_item",
        target_id=str(row.id),
        metadata={"decision": dec, "company_slug": slug, "scope": "trust_review"},
    )
    out = _serialize_item(row)
    out["decision"] = _serialize_decision(decision_row)
    return out


def list_trust_review_decisions(
    db: Session,
    *,
    company_slug: str,
    item_id: int,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(RecruiterTrustReviewItem)
        .filter(
            RecruiterTrustReviewItem.company_slug == slug,
            RecruiterTrustReviewItem.id == item_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Trust review item not found.")
    return {
        "item_id": row.id,
        "decisions": [_serialize_decision(d) for d in (row.decisions or [])],
    }
