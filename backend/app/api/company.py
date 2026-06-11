"""Company workspace APIs — pipeline quality overview (token + company slug)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.session import get_db
from app.services.company_pipeline_quality import build_company_pipeline_quality
from app.services.recruiter_company_auth import resolve_recruiter_access
from app.services.request_locale import locale_from_request

router = APIRouter()

COMPANY_WORKSPACE_UNAVAILABLE = "recruiter_inbox_unavailable"
COMPANY_WORKSPACE_INVALID_TOKEN = "recruiter_inbox_invalid_token"
COMPANY_WORKSPACE_COMPANY_REQUIRED = "recruiter_inbox_company_required"


def _resolved_company_slug(
    db: Session,
    settings: Settings,
    raw_token: str | None,
    company_slug_query: str | None,
) -> str:
    ok, slug = resolve_recruiter_access(db, settings, raw_token, company_slug_query)
    if ok:
        if not slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=COMPANY_WORKSPACE_COMPANY_REQUIRED,
            )
        return slug
    if not (settings.recruiter_inbox_token or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=COMPANY_WORKSPACE_UNAVAILABLE,
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=COMPANY_WORKSPACE_INVALID_TOKEN,
    )


@router.get("/pipeline-quality")
def company_pipeline_quality(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """Per-role pipeline segments and quality signals for one employer workspace."""
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_company_pipeline_quality(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
