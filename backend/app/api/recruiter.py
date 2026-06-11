"""Recruiter batch acceptance inbox (token + company slug; no full employer SSO yet)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.session import get_db
from app.limiter import limiter, recruiter_token_key
from app.services.recruiter_company_auth import resolve_recruiter_access
from app.services.recruiter_audit_trail import (
    RECRUITER_CLIENT_AUDIT_ACTION_TYPES,
    list_recruiter_audit_events,
    log_recruiter_audit_event,
)
from app.services.recruiter_candidate_search import build_recruiter_candidate_search
from app.services.recruiter_inbox import (
    build_recruiter_batch,
    respond_recruiter_batch,
    respond_recruiter_batch_bulk,
)
from app.services.recruiter_jobs import create_company_job, list_company_jobs
from app.services.request_locale import locale_from_request

router = APIRouter()

RECRUITER_INBOX_UNAVAILABLE = "recruiter_inbox_unavailable"
RECRUITER_INBOX_INVALID_TOKEN = "recruiter_inbox_invalid_token"
RECRUITER_INBOX_COMPANY_REQUIRED = "recruiter_inbox_company_required"


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
                detail=RECRUITER_INBOX_COMPANY_REQUIRED,
            )
        return slug
    if not (settings.recruiter_inbox_token or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=RECRUITER_INBOX_UNAVAILABLE,
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=RECRUITER_INBOX_INVALID_TOKEN,
    )


class RecruiterRespondIn(BaseModel):
    action: str = Field(..., description="accept | decline")
    decline_note: str | None = Field(None, max_length=2000, description="Internal note when declining")


class RecruiterBatchRespondIn(BaseModel):
    application_ids: list[int] = Field(..., min_length=1, max_length=50)
    action: str = Field(..., description="accept | decline")
    decline_note: str | None = Field(None, max_length=2000, description="Shared internal note when declining")


class RecruiterJobCreateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    location: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=20_000)
    url: str | None = Field(None, max_length=500)
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)


@router.get("/inbox")
def recruiter_inbox(
    request: Request,
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
        return build_recruiter_batch(
            db,
            company_slug=slug,
            limit=limit,
            locale=locale_from_request(request),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/inbox/{application_id}/respond")
@limiter.limit("60/minute", key_func=recruiter_token_key)
def recruiter_inbox_respond(
    request: Request,
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
            decline_note=body.decline_note,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc




class RecruiterAuditLogIn(BaseModel):
    action_type: str = Field(..., max_length=64)
    meta: dict[str, str] | None = Field(None, description="Optional non-PII metadata")


@router.get("/inbox/{application_id}/audit")
def recruiter_inbox_audit_list(
    application_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return list_recruiter_audit_events(
            db, application_id=application_id, company_slug=slug, limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/inbox/{application_id}/audit", status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute", key_func=recruiter_token_key)
def recruiter_inbox_audit_log(
    request: Request,
    application_id: int,
    body: RecruiterAuditLogIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    if body.action_type.strip() not in RECRUITER_CLIENT_AUDIT_ACTION_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="audit_action_not_allowed")
    try:
        return log_recruiter_audit_event(
            db,
            application_id=application_id,
            company_slug=slug,
            action_type=body.action_type,
            meta=body.meta,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

@router.post("/inbox/respond-batch")
@limiter.limit("60/minute", key_func=recruiter_token_key)
def recruiter_inbox_respond_batch(
    request: Request,
    body: RecruiterBatchRespondIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return respond_recruiter_batch_bulk(
            db,
            company_slug=slug,
            application_ids=body.application_ids,
            action=body.action,
            decline_note=body.decline_note,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/search")
def recruiter_candidate_search(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
    q: str | None = Query(None, max_length=200),
    name: str | None = Query(None, max_length=120),
    role_title: str | None = Query(None, max_length=200),
    skills: str | None = Query(None, max_length=300),
    location: str | None = Query(None, max_length=120),
    min_score: float | None = Query(None, ge=0, le=100),
    max_score: float | None = Query(None, ge=0, le=100),
    status: str | None = Query(None, max_length=32),
    pipeline_status: str | None = Query(None, max_length=32),
    data_confidence: str | None = Query(None, max_length=32),
    missing_data: bool | None = Query(None),
    availability: str | None = Query(None, max_length=32),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_candidate_search(
            db,
            company_slug=slug,
            limit=limit,
            locale=locale_from_request(request),
            q=q,
            name=name,
            role_title=role_title,
            skills=skills,
            location=location,
            min_score=min_score,
            max_score=max_score,
            status=status,
            pipeline_status=pipeline_status,
            data_confidence=data_confidence,
            missing_data=missing_data,
            availability=availability,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/jobs")
def recruiter_jobs_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        items = list_company_jobs(db, company_slug=slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"company_slug": slug, "items": items}


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def recruiter_jobs_create(
    body: RecruiterJobCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return create_company_job(
            db,
            company_slug=slug,
            title=body.title,
            location=body.location,
            description=body.description,
            url=body.url,
            salary_min=body.salary_min,
            salary_max=body.salary_max,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
