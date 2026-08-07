"""Epic 2.14 API — private canary control plane + FV ladder + friction."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import canary_journey as journey
from app.services import first_value_ladder as ladder
from app.services import private_canary as canary
from app.services import canary_designation as designation

router = APIRouter()
admin_router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _require_ops(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


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


@admin_router.get("/canary/control")
def admin_canary_snapshot(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return canary.snapshot(db)


@admin_router.post("/canary/control")
def admin_canary_action(
    body: CanaryActionIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    try:
        return canary.apply_action(db, action=body.action, reason=body.reason)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@admin_router.get("/canary/completion-report")
def admin_canary_report(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return canary.completion_report(db)


@admin_router.post("/canary/evaluate-gate")
def admin_evaluate_gate(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return canary.evaluate_gate(db)


@admin_router.get("/canary/designation")
def admin_designation_get(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return designation.designation_status(db)


@admin_router.post("/canary/designation")
def admin_designation_set(
    body: DesignateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Persist Founder designation — never activates, never sends invite, never raises caps."""
    _require_ops(settings, authorization)
    try:
        return designation.designate(
            db,
            delivery_identity=body.delivery_identity,
            delivery_channel=body.delivery_channel,
            secure_roster_reference=body.secure_roster_reference,
            replace_existing=body.replace_existing,
            actor="ops_admin",
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@admin_router.post("/canary/designation/revoke")
def admin_designation_revoke(
    body: RevokeDesignationIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return designation.revoke(db, designation_id=body.designation_id, actor="ops_admin")


@admin_router.get("/canary/activation-preflight")
def admin_activation_preflight(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Read-only preflight — never executes activation."""
    _require_ops(settings, authorization)
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
