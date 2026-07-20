"""Platform foundations Wave 0 API — status + privacy case open (authenticated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services import platform_foundations as foundations

router = APIRouter()


class PrivacyCaseCreate(BaseModel):
    case_type: str = Field(..., min_length=2, max_length=32, pattern=r"^(export|deletion|correction|consent)$")
    note: str | None = Field(None, max_length=500)


class DomainEventCreate(BaseModel):
    event_name: str = Field(..., min_length=3, max_length=128)
    aggregate_type: str = Field(..., min_length=2, max_length=64)
    aggregate_id: str = Field(..., min_length=1, max_length=128)


@router.get("/status")
def get_foundations_status(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Authenticated readiness — never claims product modules LIVE."""
    return foundations.foundations_status(db)


@router.get("/enrollment-gate")
def enrollment_gate(db: Session = Depends(get_db)) -> dict:
    """Public-ish gate for UI — enrollment remains OFF under Founder block."""
    enabled = foundations.is_external_pilot_enrollment_enabled(db)
    return {
        "external_pilot_enrollment_enabled": enabled,
        "pilot": "BLOCKED_BY_FOUNDER" if not enabled else "FLAG_ENABLED_INTERNAL_ONLY",
        "real_candidate_enrollment": "NOT_STARTED",
        "real_recruiter_enrollment": "NOT_STARTED",
        "message": "Do not invite real users while pilot is BLOCKED_BY_FOUNDER.",
    }


@router.post("/privacy-cases", status_code=status.HTTP_201_CREATED)
def create_privacy_case(
    body: PrivacyCaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    case = foundations.open_privacy_ops_case(
        db,
        user_id=user.id,
        case_type=body.case_type,
        payload={"note": body.note} if body.note else None,
    )
    return {
        "id": case.id,
        "case_type": case.case_type,
        "status": case.status,
        "live_claim": False,
        "note": "Foundation queue only — not a completed DSR LIVE path.",
    }


@router.post("/domain-events", status_code=status.HTTP_201_CREATED)
def create_domain_event(
    body: DomainEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not body.event_name.startswith("foundation."):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wave 0 only accepts foundation.* event names",
        )
    event = foundations.record_domain_event(
        db,
        event_name=body.event_name,
        aggregate_type=body.aggregate_type,
        aggregate_id=body.aggregate_id,
        actor_user_id=user.id,
    )
    return {
        "id": event.id,
        "event_name": event.event_name,
        "live_claim": False,
    }
