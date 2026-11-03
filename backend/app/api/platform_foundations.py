"""Platform foundations Wave 0 API — status + privacy case open (authenticated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.pilot_stance import resolve_pilot_stance
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
        "pilot": resolve_pilot_stance() if not enabled else "FLAG_ENABLED_INTERNAL_ONLY",
        "real_candidate_enrollment": "NOT_STARTED",
        "real_recruiter_enrollment": "NOT_STARTED",
        "message": (
            "Controlled pilot READY — invite-only only; external mass enrollment remains OFF."
            if not enabled
            else "Enrollment flag enabled — internal only until Launch GO."
        ),
    }


@router.get("/enrollment/capability")
def enrollment_capability(db: Session = Depends(get_db)) -> dict:
    """Capability readiness vs launch stance — kill-switch stays OFF.

    Isolated axes (do not conflate):
    - capability_ready=True → modules are engineering-ready under controls
    - external_pilot_enrollment_enabled / enrollment_kill_switch → Founder
      launch stance; default OFF means no real invites
    - launch_stance=OFF / pilot_stance=BLOCKED_BY_FOUNDER → unchanged

    Founder RELEASE_WITH_CONTROLS allows capability PASS language while
    EXTERNAL_PILOT_ENROLLMENT_ENABLED remains false.
    """
    enabled = foundations.is_external_pilot_enrollment_enabled(db)
    return {
        "enrollment_kill_switch": enabled,
        "external_pilot_enrollment_enabled": enabled,
        "capability_ready": True,
        "launch_stance": "OFF",
        "pilot_stance": resolve_pilot_stance(),
        "modules": {
            "rec_recruiter_onboarding": "READY_KILL_SWITCH_OFF",
            "rec_company_onboarding": "READY_KILL_SWITCH_OFF",
            "company_invite_delivery": "READY_KILL_SWITCH_OFF",
            "investor_self_serve_enrollment": "READY_KILL_SWITCH_OFF",
        },
        "real_invites": False,
        "message": "Capability ready with controls; global enrollment kill-switch OFF.",
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
