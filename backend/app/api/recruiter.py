"""Recruiter batch acceptance inbox (token + company slug; no full employer SSO yet)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.session import get_db
from app.services.recruiter_company_auth import resolve_recruiter_access
from app.services.recruiter_inbox import build_recruiter_batch, respond_recruiter_batch

router = APIRouter()


def _resolved_company_slug(
    db: Session,
    settings: Settings,
    raw_token: str | None,
    company_slug_query: str | None,
) -> str:
    ok, slug = resolve_recruiter_access(db, settings, raw_token, company_slug_query)
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid recruiter token.")
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="company_slug is required with the global recruiter token.",
        )
    return slug


class RecruiterRespondIn(BaseModel):
    action: str = Field(..., description="accept | decline")


@router.get("/inbox")
def recruiter_inbox(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(25, ge=1, le=50),
) -> dict:
    """Pre-qualified applications for one employer (batch accept/decline in UI)."""
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_batch(db, company_slug=slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/inbox/{application_id}/respond")
def recruiter_inbox_respond(
    application_id: int,
    body: RecruiterRespondIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return respond_recruiter_batch(
            db,
            company_slug=slug,
            application_id=application_id,
            action=body.action,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
