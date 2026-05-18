"""Public placement verification (magic link confirmation)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.application import PlacementConfirmIn, PlacementConfirmOut
from app.services.placement_verification import confirm_placement_token

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
