"""Candidate visibility preference store — internal TWIN state only."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateVisibilityPreference
from app.services.audit_events import create_audit_event

PROFILE_VISIBILITY = frozenset({"private", "pilot_visible", "recruiter_visible_preview"})
CV_VISIBILITY = frozenset({"private", "pilot_visible"})
MATCH_VISIBILITY = frozenset({"private", "pilot_visible", "recruiter_visible_preview"})
COMPANY_VISIBILITY = frozenset({"hidden", "visible_preview"})
COMMUNICATION_PREFERENCE = frozenset({"no_outreach", "draft_only", "manual_review_required"})
PATCH_FIELDS = frozenset(
    {
        "profile_visibility",
        "cv_visibility",
        "match_visibility",
        "company_visibility",
        "communication_preference",
    }
)


def _serialize(row: CandidateVisibilityPreference) -> dict[str, Any]:
    return {
        "id": row.id,
        "candidate_id": row.candidate_id,
        "profile_visibility": row.profile_visibility,
        "cv_visibility": row.cv_visibility,
        "match_visibility": row.match_visibility,
        "company_visibility": row.company_visibility,
        "communication_preference": row.communication_preference,
        "source": row.source,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_fields(fields: dict[str, str]) -> None:
    checks = {
        "profile_visibility": PROFILE_VISIBILITY,
        "cv_visibility": CV_VISIBILITY,
        "match_visibility": MATCH_VISIBILITY,
        "company_visibility": COMPANY_VISIBILITY,
        "communication_preference": COMMUNICATION_PREFERENCE,
    }
    for key, allowed in checks.items():
        if key in fields and fields[key] not in allowed:
            raise ValueError(f"Unsupported {key}.")


def create_visibility_preference(
    db: Session,
    *,
    candidate_id: str,
    user_id: int,
    profile_visibility: str = "private",
    cv_visibility: str = "private",
    match_visibility: str = "private",
    company_visibility: str = "hidden",
    communication_preference: str = "no_outreach",
) -> dict[str, Any]:
    cand = candidate_id.strip()
    if not cand:
        raise ValueError("candidate_id is required.")
    payload = {
        "profile_visibility": profile_visibility.strip().lower(),
        "cv_visibility": cv_visibility.strip().lower(),
        "match_visibility": match_visibility.strip().lower(),
        "company_visibility": company_visibility.strip().lower(),
        "communication_preference": communication_preference.strip().lower(),
    }
    _validate_fields(payload)
    row = CandidateVisibilityPreference(
        candidate_id=cand[:64],
        profile_visibility=payload["profile_visibility"],
        cv_visibility=payload["cv_visibility"],
        match_visibility=payload["match_visibility"],
        company_visibility=payload["company_visibility"],
        communication_preference=payload["communication_preference"],
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
        event_type="record_created",
        actor_persona="candidate",
        actor_id=str(user_id),
        target_type="visibility_preference",
        target_id=str(row.id),
        metadata={"scope": "candidate", "field": "visibility"},
    )
    return _serialize(row)


def list_visibility_preferences(
    db: Session,
    *,
    candidate_id: str | None = None,
    user_id: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(CandidateVisibilityPreference)
    if user_id is not None:
        query = query.filter(CandidateVisibilityPreference.created_by_user_id == user_id)
    if candidate_id:
        query = query.filter(CandidateVisibilityPreference.candidate_id == candidate_id.strip()[:64])
    rows = query.order_by(CandidateVisibilityPreference.updated_at.desc()).limit(cap).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def patch_visibility_preference(
    db: Session,
    *,
    preference_id: int,
    user_id: int,
    fields: dict[str, Any],
) -> dict[str, Any]:
    row = db.query(CandidateVisibilityPreference).filter(CandidateVisibilityPreference.id == preference_id).first()
    if not row:
        raise ValueError("Preference not found.")
    if row.created_by_user_id != user_id:
        raise ValueError("Not authorized.")
    updates: dict[str, str] = {}
    for key, value in fields.items():
        if key not in PATCH_FIELDS:
            continue
        updates[key] = str(value).strip().lower()
    _validate_fields(updates)
    for key, value in updates.items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_updated",
        actor_persona="candidate",
        actor_id=str(user_id),
        target_type="visibility_preference",
        target_id=str(row.id),
        metadata={"scope": "candidate", "field": "visibility"},
    )
    return _serialize(row)
