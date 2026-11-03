"""Epic 2.9 pilot consolidation API — IA, first-value, inactive invite posture, telemetry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import pilot_consolidation as pc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate | None:
    return db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()


class TelemetryIn(BaseModel):
    event_name: str = Field(max_length=64)
    properties: dict | None = None


@router.get("/me/pilot-consolidation")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return pc.build_aggregate(
        db, user_id=user.id, candidate_id=cand.id if cand else None
    )


@router.get("/me/pilot-consolidation/first-value")
def get_first_value(
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return pc.first_value_contract()


@router.get("/me/pilot-consolidation/pilot-access")
def get_pilot_access(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return pc.pilot_access_snapshot(db)


@router.post("/me/pilot-consolidation/telemetry")
def post_telemetry(
    body: TelemetryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    # Synthetic / kpi-excluded accounts stay excluded
    kpi = bool(getattr(user, "exclude_from_product_metrics", False))
    out = pc.emit_pilot_event(
        db,
        event_name=body.event_name,
        user_id=user.id,
        kpi_excluded=True if kpi else True,  # always kpi_excluded for pilot telemetry path
        properties=body.properties,
    )
    if not out.get("ok"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=out.get("reason") or "rejected")
    return out

