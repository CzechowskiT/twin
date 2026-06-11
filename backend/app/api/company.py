"""Company workspace API — plan & usage readiness (no payments)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.recruiter import _resolved_company_slug
from app.config import Settings, get_settings
from app.database.session import get_db
from app.services.company_billing_readiness import build_company_plan_usage

router = APIRouter()


@router.get("/plan-usage")
def company_plan_usage(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """Read-only plan status and workspace usage — billing_live is always false."""
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_company_plan_usage(db, company_slug=slug, settings=settings)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
