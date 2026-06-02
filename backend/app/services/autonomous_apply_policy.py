"""Shared server-side policy for autonomous and per-job auto-apply endpoints.

Default deny: verified readiness required; delegated submit remains off elsewhere.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.models import Candidate, User
from app.services.candidate_readiness import (
    autonomous_apply_allowed,
    auto_apply_profile_ready,
)

PROFILE_NOT_READY_DETAIL = "Complete your candidate profile and upload a CV first."
VERIFIED_READINESS_NOT_READY_DETAIL = (
    "Complete verified readiness (career brief, skill evidence, and consents) "
    "before autonomous applying."
)
MANUAL_TRIGGER_OPS_ONLY_DETAIL = (
    "Ops only — manual auto-apply trigger is not available for candidate accounts."
)


def candidate_for_user(db: Session, user_id: int) -> Candidate | None:
    return db.query(Candidate).filter(Candidate.user_id == user_id).first()


def enforce_autonomous_apply_allowed(
    user: User,
    candidate: Candidate | None,
    *,
    status_code: int = status.HTTP_403_FORBIDDEN,
) -> None:
    """Raise before any Playwright submit or nightly processing for this user."""
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create your candidate profile first.",
        )
    if not auto_apply_profile_ready(user, candidate):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=PROFILE_NOT_READY_DETAIL,
        )
    if not autonomous_apply_allowed(user, candidate):
        raise HTTPException(
            status_code=status_code,
            detail=VERIFIED_READINESS_NOT_READY_DETAIL,
        )
