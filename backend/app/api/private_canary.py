"""Epic 2.14 API — private canary control plane + FV ladder + friction.

Admin routes: Founder allowlist session (elevated + CSRF for mutations) or
machine OPS/BETA bearer for scripts. Browser never presents OPS_ADMIN_TOKEN.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import canary_journey as journey
from app.services import first_value_ladder as ladder
from app.services import private_canary as canary
from app.services import canary_designation as designation
from app.services.founder_canary_auth import (
    FounderCanaryPrincipal,
    actor_label,
    elevate_founder_canary,
    founder_allowlist,
    founder_canary_mfa_required,
    require_founder_canary_mutate,
    require_founder_canary_read,
)
from app.services import candidate_mfa as mfa

router = APIRouter()
admin_router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


class CanaryActionIn(BaseModel):
    action: str = Field(max_length=48)
    reason: str | None = Field(default=None, max_length=200)


class LadderIn(BaseModel):
    target: str = Field(max_length=32)
    lane: str = Field(default="SYNTHETIC", max_length=16)


class FrictionIn(BaseModel):
    event_code: str = Field(max_length=64)
    surface: str | None = Field(default=None, max_length=64)
    lane: str = Field(default="SYNTHETIC", max_length=16)
    payload: dict | None = None


class DesignateIn(BaseModel):
    delivery_identity: str = Field(max_length=254)
    delivery_channel: str = Field(default="email", max_length=32)
    secure_roster_reference: str | None = Field(default=None, max_length=128)
    replace_existing: bool = True


class RevokeDesignationIn(BaseModel):
    designation_id: str | None = Field(default=None, max_length=64)


class ElevateIn(BaseModel):
    """Optional body for elevate — prefer headers for secrets."""

    step_up_token: str | None = Field(default=None, max_length=512)
    mfa_code: str | None = Field(default=None, max_length=32)


# --- Candidate ---


@router.get("/me/canary-journey/disclosure")
def get_disclosure(user: User = Depends(get_current_user)) -> dict:
    _ = user
    return journey.disclosure_catalog()


@router.get("/me/canary-journey/adoption-registry")
def get_adoption(user: User = Depends(get_current_user)) -> dict:
    _ = user
    return journey.adoption_registry()


@router.get("/me/first-value-ladder")
def get_ladder(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ladder.ladder_status(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/first-value-ladder")
def post_ladder(
    body: LadderIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    # Authenticated candidate sessions from mint are synthetic by default
    lane = "SYNTHETIC"
    if body.lane.upper() == "REAL" and not bool(getattr(user, "exclude_from_product_metrics", True)):
        lane = "REAL"
    try:
        return ladder.advance_ladder(
            db, candidate_id=cand.id, user_id=user.id, target=body.target, lane=lane
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/canary-journey/friction")
def post_friction(
    body: FrictionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    lane = "SYNTHETIC" if bool(getattr(user, "exclude_from_product_metrics", True)) else "REAL"
    try:
        return journey.record_friction(
            db,
            candidate_id=cand.id,
            user_id=user.id,
            event_code=body.event_code,
            surface=body.surface,
            lane=lane,
            payload=body.payload,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


# --- Admin / Founder control plane ---


@admin_router.get("/canary/auth-status")
def admin_canary_auth_status(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> dict:
    """Read-only gate for Founder canary UI — never returns secrets."""
    mfa_on = False
    if principal.user_id is not None:
        mfa_on = bool(mfa.user_mfa_enabled(db, user_id=principal.user_id))
    return {
        "ok": True,
        "via": principal.via,
        "email": principal.email,
        "elevated": principal.via in {"founder_elevated", "ops_machine"},
        "mfa_enabled": mfa_on,
        "allowlist_configured": bool(founder_allowlist(settings)),
        "mutates_require_elevated_or_step_up": True,
        "mfa_enrollment_required": founder_canary_mfa_required(settings),
        "dedicated_session_secret_configured": bool(
            (getattr(settings, "founder_canary_session_secret", "") or "").strip()
        ),
    }


@admin_router.post("/canary/founder-elevate")
def admin_canary_founder_elevate(
    request: Request,
    body: ElevateIn | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Issue short-lived elevated Founder canary session after step-up or TOTP.

    Never accepts OPS_ADMIN_TOKEN as a browser elevation path.
    """
    auth = request.headers.get("Authorization")
    step = (body.step_up_token if body else None) or request.headers.get("X-Twin-Step-Up")
    code = (body.mfa_code if body else None) or request.headers.get("X-Twin-Mfa-Code")
    return elevate_founder_canary(
        db,
        settings,
        request,
        authorization=auth,
        oauth_token=None,
        step_up_token=step,
        mfa_code=code,
    )


@admin_router.get("/canary/control")
def admin_canary_snapshot(
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> dict:
    _ = principal
    return canary.snapshot(db)


@admin_router.post("/canary/control")
def admin_canary_action(
    body: CanaryActionIn,
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_mutate),
) -> dict:
    _ = principal
    try:
        return canary.apply_action(db, action=body.action, reason=body.reason)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@admin_router.get("/canary/completion-report")
def admin_canary_report(
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> dict:
    _ = principal
    return canary.completion_report(db)


@admin_router.post("/canary/evaluate-gate")
def admin_evaluate_gate(
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_mutate),
) -> dict:
    _ = principal
    return canary.evaluate_gate(db)


@admin_router.get("/canary/designation")
def admin_designation_get(
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> dict:
    _ = principal
    return designation.designation_status(db)


@admin_router.post("/canary/designation")
def admin_designation_set(
    body: DesignateIn,
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_mutate),
) -> dict:
    """Persist Founder designation — never activates, never sends invite, never raises caps."""
    try:
        return designation.designate(
            db,
            delivery_identity=body.delivery_identity,
            delivery_channel=body.delivery_channel,
            secure_roster_reference=body.secure_roster_reference,
            replace_existing=body.replace_existing,
            actor=actor_label(principal),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@admin_router.post("/canary/designation/revoke")
def admin_designation_revoke(
    body: RevokeDesignationIn,
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_mutate),
) -> dict:
    return designation.revoke(
        db, designation_id=body.designation_id, actor=actor_label(principal)
    )


@admin_router.get("/canary/activation-preflight")
def admin_activation_preflight(
    db: Session = Depends(get_db),
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> dict:
    """Read-only preflight — never executes activation."""
    _ = principal
    tech = canary.snapshot(db)
    des = designation.activation_preflight(db)
    return {
        **des,
        "technical_gate_ready": bool(tech.get("gate_ready")),
        "technical_gate_name": tech.get("gate_name"),
        "canary_state": tech.get("state"),
        "activation_command": tech.get("activation_command"),
        "effective_caps_unchanged": True,
    }
