"""Candidate role status — safe non-final statuses only."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateRoleStatus
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

SAFE_STATUSES = frozenset({"new", "reviewed", "shortlisted", "needs_feedback", "waiting_candidate", "paused"})
FORBIDDEN_STATUSES = frozenset({"hired", "rejected_final", "auto_rejected", "offer_sent"})


def _serialize(row: CandidateRoleStatus) -> dict[str, Any]:
    return {
        "id": row.id,
        "candidate_ref": row.candidate_ref,
        "role_ref": row.role_ref,
        "status": row.status,
        "company_slug": row.company_slug,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_status(status: str) -> str:
    st = status.strip().lower()
    if st in FORBIDDEN_STATUSES:
        raise ValueError("Forbidden final status.")
    if st not in SAFE_STATUSES:
        raise ValueError("Unsupported status.")
    return st


def create_candidate_role_status(
    db: Session,
    *,
    candidate_ref: str,
    role_ref: str,
    status: str,
    user_id: int,
    company_slug: str | None = None,
) -> dict[str, Any]:
    st = _validate_status(status)
    cand = candidate_ref.strip()
    role = role_ref.strip()
    if not cand or not role:
        raise ValueError("candidate_ref and role_ref are required.")
    slug = slugify_company(company_slug.strip()) if company_slug else None
    row = CandidateRoleStatus(
        candidate_ref=cand[:64],
        role_ref=role[:64],
        status=st,
        company_slug=slug,
        updated_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="status_changed",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="candidate_role",
        target_id=f"{cand}:{role}",
        metadata={"status_after": st},
    )
    return _serialize(row)


def list_candidate_role_statuses(
    db: Session,
    *,
    candidate_ref: str | None = None,
    role_ref: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(CandidateRoleStatus)
    if candidate_ref:
        query = query.filter(CandidateRoleStatus.candidate_ref == candidate_ref.strip())
    if role_ref:
        query = query.filter(CandidateRoleStatus.role_ref == role_ref.strip())
    rows = query.order_by(CandidateRoleStatus.updated_at.desc()).limit(cap).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def patch_candidate_role_status(
    db: Session,
    *,
    row_id: int,
    status: str,
    user_id: int,
) -> dict[str, Any]:
    row = db.query(CandidateRoleStatus).filter(CandidateRoleStatus.id == row_id).first()
    if not row:
        raise ValueError("Status row not found.")
    before = row.status
    row.status = _validate_status(status)
    row.updated_by_user_id = user_id
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="status_changed",
        actor_persona="recruiter",
        actor_id=str(user_id),
        target_type="candidate_role",
        target_id=f"{row.candidate_ref}:{row.role_ref}",
        metadata={"status_before": before, "status_after": row.status},
    )
    return _serialize(row)
