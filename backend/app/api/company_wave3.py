"""Company Wave 3 API — Hard LIVE evidence + wave status (no LIVE badge inflation)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services import company_wave3 as wave3

router = APIRouter()


class EvidenceMarkIn(BaseModel):
    module_id: str = Field(..., min_length=2, max_length=128)
    status: str = Field(
        ...,
        pattern=r"^(PASS|FAIL|PENDING_SMOKE|HELD_POLICY|PARTIAL|DEMO_ONLY)$",
    )
    smoke_sha: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=2000)


@router.get("/status")
def get_wave3_status(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave3.wave3_status(db)


@router.get("/hard-live/evidence")
def get_hard_live_evidence(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
    persona: str | None = Query(default="company", max_length=32),
    wave: str | None = Query(default="3", max_length=16),
) -> dict:
    return wave3.list_hard_live_evidence(db, persona=persona, wave=wave)


@router.post("/hard-live/evidence/mark", status_code=status.HTTP_200_OK)
def mark_hard_live_evidence(
    body: EvidenceMarkIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Authenticated mark after smoke — does not flip Gate F / Launch / Pilot."""
    try:
        return wave3.mark_evidence_after_smoke(
            db,
            module_id=body.module_id,
            status=body.status,
            smoke_sha=body.smoke_sha,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
