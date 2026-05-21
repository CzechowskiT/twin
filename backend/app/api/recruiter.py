"""Recruiter batch acceptance inbox (token + company slug; no full employer SSO yet)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.session import get_db
from app.services.recruiter_inbox import build_recruiter_batch, respond_recruiter_batch

router = APIRouter()


def _require_recruiter_token(
    settings: Annotated[Settings, Depends(get_settings)],
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
) -> None:
    expected = (settings.recruiter_inbox_token or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recruiter inbox not configured. Set RECRUITER_INBOX_TOKEN.",
        )
    supplied = (x_twin_recruiter_token or token or "").strip()
    if supplied != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid recruiter token.")


class RecruiterRespondIn(BaseModel):
    action: str = Field(..., description="accept | decline")


@router.get("/inbox")
def recruiter_inbox(
    _auth: Annotated[None, Depends(_require_recruiter_token)],
    company_slug: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    """Pre-qualified applications for one employer (batch accept/decline in UI)."""
    try:
        return build_recruiter_batch(db, company_slug=company_slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/inbox/{application_id}/respond")
def recruiter_inbox_respond(
    application_id: int,
    body: RecruiterRespondIn,
    _auth: Annotated[None, Depends(_require_recruiter_token)],
    company_slug: str = Query(..., min_length=1, max_length=80),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return respond_recruiter_batch(
            db,
            company_slug=company_slug,
            application_id=application_id,
            action=body.action,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
