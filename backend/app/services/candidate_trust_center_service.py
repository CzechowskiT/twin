"""Trust center hub aggregation — live candidate data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, User
from app.services.candidate_consent_service import MANUAL_PROCESSING_NOTICE, list_consents
from app.services.candidate_privacy_request_service import count_privacy_requests_by_type
from app.services.candidate_trust_audit_service import build_trust_timeline, list_trust_audit_events


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _build_data_sources(candidate: Candidate, db: Session) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    if candidate.cv_text or candidate.resume_path:
        sources.append(
            {
                "id": "ds-profile-cv",
                "kind": "profile_cv",
                "label": "Profile & CV",
                "detail": "Skills, experience, and CV you submitted.",
                "last_synced_at": candidate.cv_uploaded_at or candidate.created_at,
            }
        )
    app_count = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id)
        .count()
    )
    if app_count > 0:
        sources.append(
            {
                "id": "ds-applications",
                "kind": "application_submitted",
                "label": "Applications",
                "detail": f"{app_count} application(s) on record.",
                "last_synced_at": candidate.created_at,
            }
        )
    sources.append(
        {
            "id": "ds-match-signals",
            "kind": "match_signal",
            "label": "Match signals",
            "detail": "Fit scores from TWIN matching — not automated hiring decisions.",
            "last_synced_at": None,
        }
    )
    return sources


def _twin_knows_items(candidate: Candidate, db: Session) -> list[str]:
    items: list[str] = []
    if candidate.name:
        items.append(f"Display name: {candidate.name}")
    if candidate.location:
        items.append(f"Location preference: {candidate.location}")
    if candidate.cv_text:
        items.append("CV text stored for matching and applications.")
    app_count = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id)
        .count()
    )
    if app_count:
        items.append(f"{app_count} job application(s) submitted through TWIN.")
    if not items:
        items.append("Basic account profile — complete your profile to add more context.")
    return items


def build_trust_center(
    db: Session,
    *,
    candidate: Candidate,
    user: User,
) -> dict[str, Any]:
    consents = list_consents(db, candidate=candidate, user=user)
    audit = list_trust_audit_events(db, candidate_id=candidate.id, limit=1, offset=0)
    timeline = build_trust_timeline(db, candidate_id=candidate.id, limit=10)
    privacy_counts = count_privacy_requests_by_type(db, candidate_id=candidate.id)
    data_sources = _build_data_sources(candidate, db)
    knows_items = _twin_knows_items(candidate, db)
    configured = bool(knows_items) or bool(data_sources)
    return {
        "candidate_id": candidate.id,
        "display_name": candidate.name or user.email.split("@")[0],
        "configured": configured,
        "twin_knows_summary": (
            "What TWIN stores for your account — sourced from profile, applications, and consents."
        ),
        "twin_knows_items": knows_items,
        "data_sources": data_sources,
        "consent_items": consents["items"],
        "privacy_request_counts": privacy_counts,
        "audit_event_count": audit["total"],
        "trust_timeline": timeline,
        "manual_processing_notice": MANUAL_PROCESSING_NOTICE,
        "pilot_labelled": True,
        "updated_at": consents.get("updated_at") or _utcnow(),
    }
