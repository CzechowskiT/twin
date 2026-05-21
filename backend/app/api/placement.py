"""Public placement verification (magic link confirmation).

HTTP listing of placement audit events lives under ``/applications/{id}/placement-events``
(see ``applications.list_placement_events``) with strict candidate ownership checks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.application import (
    PlacementConfirmIn,
    PlacementConfirmOut,
    PlacementEmployerConfirmIn,
)
from app.services.placement_verification import confirm_employer_attestation, confirm_placement_token

router = APIRouter()


@router.post("/verify/confirm", response_model=PlacementConfirmOut)
def verify_placement_confirm(
    body: PlacementConfirmIn,
    db: Session = Depends(get_db),
) -> PlacementConfirmOut:
    ok, msg = confirm_placement_token(db, body.token)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return PlacementConfirmOut(ok=True, message=msg)


@router.post("/employer/confirm", response_model=PlacementConfirmOut)
def employer_attest_confirm(
    body: PlacementEmployerConfirmIn,
    db: Session = Depends(get_db),
) -> PlacementConfirmOut:
    """Public employer one-click attestation (nonce link from candidate dashboard)."""
    ok, msg = confirm_employer_attestation(db, body.token)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return PlacementConfirmOut(ok=True, message=msg)
