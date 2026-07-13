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
from app.schemas.recruiter_activation import RecruiterActivationOut
from app.services.recruiter_activation_persistence import (
    record_first_decision,
    record_queue_loaded,
    serialize_activation,
)
from app.services.recruiter_analytics import build_recruiter_analytics
from app.services.recruiter_audit_trail import (
    RECRUITER_CLIENT_AUDIT_ACTION_TYPES,
    list_recruiter_audit_events,
    log_recruiter_audit_event,
)
from app.services.recruiter_candidate_search import build_recruiter_candidate_search
from app.services.recruiter_talent_radar import build_recruiter_talent_radar
from app.services.recruiter_talent_radar_decisions import (
    list_recruiter_talent_radar_decisions,
    log_recruiter_talent_radar_decision,
)
from app.services.recruiter_talent_radar_digest import build_recruiter_talent_radar_digest
from app.services.recruiter_talent_pool import build_recruiter_talent_pool
from app.services.recruiter_talent_pool_persistence import (
    add_talent_pool_record,
    archive_talent_pool_record,
    get_talent_pool_record,
    list_talent_pool_records,
)
from app.services.recruiter_trust_review_persistence import (
    get_trust_review_item,
    list_trust_review_decisions,
    list_trust_review_queue,
    record_trust_review_decision,
)
from app.schemas.recruiter_c2 import TalentPoolAddIn, TrustReviewDecisionIn
from app.services.recruiter_talent_pool_import import (
    commit_talent_pool_import,
    preview_talent_pool_import,
)
from app.services.recruiter_inbox import (
    build_recruiter_batch,
    respond_recruiter_batch,
    respond_recruiter_batch_bulk,
)
from app.services.recruiter_pipeline import build_recruiter_pipeline, transition_recruiter_pipeline
from app.services.recruiter_scorecards import get_recruiter_scorecard, upsert_recruiter_scorecard
from app.services.recruiter_scheduling import save_recruiter_manual_schedule
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



class RecruiterScheduleIn(BaseModel):
    slot_date: str = Field(..., min_length=8, max_length=10)
    slot_time: str = Field(..., min_length=4, max_length=8)
    duration_minutes: int | None = Field(None, ge=15, le=480)
    meeting_link: str | None = Field(None, max_length=2000)
    scheduling_status: str = Field(..., description="invited | interview_scheduled")


class RecruiterPipelineTransitionIn(BaseModel):
    action: str = Field(..., description="to_contact | mark_invited | on_hold | reject | reopen")

class RecruiterJobCreateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    location: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=20_000)
    url: str | None = Field(None, max_length=500)
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)


@router.get("/activation", response_model=RecruiterActivationOut)
def recruiter_activation(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """Recruiter onboarding state — steps through first decision activation event."""
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    return serialize_activation(db, company_slug=slug)


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
        payload = build_recruiter_batch(
            db,
            company_slug=slug,
            limit=limit,
            locale=locale_from_request(request),
        )
        record_queue_loaded(db, company_slug=slug, queue_total=payload.get("total", 0))
        return payload
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
        result = respond_recruiter_batch(
            db,
            company_slug=slug,
            application_id=application_id,
            action=body.action,
            decline_note=body.decline_note,
        )
        record_first_decision(
            db,
            company_slug=slug,
            action=body.action,
            application_id=application_id,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc




class RecruiterAuditLogIn(BaseModel):
    action_type: str = Field(..., max_length=64)
    meta: dict[str, str] | None = Field(None, description="Optional non-PII metadata")


class RecruiterTalentRadarDecisionIn(BaseModel):
    application_id: int = Field(..., ge=1)
    action_type: str = Field(..., max_length=64)
    meta: dict[str, str] | None = Field(None, description="Optional non-PII metadata")
    snooze_days: int | None = Field(None, description="7, 30, or 90 when action_type is snoozed")
    dismiss_reason_code: str | None = Field(
        None,
        max_length=32,
        description="Category code when action_type is dismissed",
    )


class RecruiterScorecardIn(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    note: str | None = Field(default=None, max_length=2000)


@router.get("/inbox/{application_id}/scorecard")
def recruiter_inbox_scorecard_get(
    application_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return get_recruiter_scorecard(db, application_id=application_id, company_slug=slug)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/inbox/{application_id}/scorecard")
@limiter.limit("60/minute", key_func=recruiter_token_key)
def recruiter_inbox_scorecard_upsert(
    request: Request,
    application_id: int,
    body: RecruiterScorecardIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return upsert_recruiter_scorecard(
            db,
            application_id=application_id,
            company_slug=slug,
            rating=body.rating,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


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
        result = respond_recruiter_batch_bulk(
            db,
            company_slug=slug,
            application_ids=body.application_ids,
            action=body.action,
            decline_note=body.decline_note,
        )
        first_ok = next(
            (r for r in result.get("results", []) if r.get("ok")),
            None,
        )
        if first_ok:
            record_first_decision(
                db,
                company_slug=slug,
                action=body.action,
                application_id=first_ok.get("application_id"),
            )
        return result
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


@router.get("/talent-radar")
def recruiter_talent_radar(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    role_id: int | None = Query(None, ge=1),
    segment: str | None = Query(None, max_length=48),
    timing_window: str | None = Query(None, max_length=48),
    signal_type: str | None = Query(None, max_length=48),
    limit: int = Query(10, ge=1, le=10),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_talent_radar(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
            role_id=role_id,
            segment=segment,
            timing_window=timing_window,
            signal_type=signal_type,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/talent-radar/decisions")
def recruiter_talent_radar_decisions_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    application_id: int | None = Query(None, ge=1),
    decision_filter: str | None = Query(None, max_length=32),
    limit: int = Query(100, ge=1, le=200),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return list_recruiter_talent_radar_decisions(
            db,
            company_slug=slug,
            application_id=application_id,
            decision_filter=decision_filter,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/talent-radar/digest")
def recruiter_talent_radar_digest(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    period: str | None = Query("7d", max_length=16),
    job_id: int | None = Query(None, ge=1, alias="jobId"),
    include_dismissed_summary: bool = Query(True, alias="includeDismissedSummary"),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_talent_radar_digest(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
            period=period,
            job_id=job_id,
            include_dismissed_summary=include_dismissed_summary,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/talent-radar/decisions", status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute", key_func=recruiter_token_key)
def recruiter_talent_radar_decisions_log(
    request: Request,
    body: RecruiterTalentRadarDecisionIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return log_recruiter_talent_radar_decision(
            db,
            application_id=body.application_id,
            company_slug=slug,
            action_type=body.action_type,
            meta=body.meta,
            snooze_days=body.snooze_days,
            dismiss_reason_code=body.dismiss_reason_code,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/inbox/{application_id}/schedule")
@limiter.limit("60/minute", key_func=recruiter_token_key)
def recruiter_inbox_schedule(
    request: Request,
    application_id: int,
    body: RecruiterScheduleIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return save_recruiter_manual_schedule(
            db,
            company_slug=slug,
            application_id=application_id,
            slot_date=body.slot_date,
            slot_time=body.slot_time,
            duration_minutes=body.duration_minutes,
            meeting_link=body.meeting_link,
            scheduling_status=body.scheduling_status,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/analytics")
def recruiter_analytics(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    days: int = Query(7, ge=1, le=30),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_analytics(db, company_slug=slug, days=days)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/pipeline")
def recruiter_pipeline_list(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    status: str | None = Query(None, max_length=32),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return build_recruiter_pipeline(
            db,
            company_slug=slug,
            limit=limit,
            locale=locale_from_request(request),
            status_filter=status,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/pipeline/{application_id}/transition")
@limiter.limit("60/minute", key_func=recruiter_token_key)
def recruiter_pipeline_transition(
    request: Request,
    application_id: int,
    body: RecruiterPipelineTransitionIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return transition_recruiter_pipeline(
            db,
            company_slug=slug,
            application_id=application_id,
            action=body.action,
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


class RecruiterTalentPoolImportPreviewIn(BaseModel):
    csv_text: str = Field(..., min_length=1, max_length=512_000)
    import_source: str = Field("csv_paste", max_length=64)


class RecruiterTalentPoolImportCommitIn(BaseModel):
    import_id: int = Field(..., ge=1)


@router.get("/talent-pool")
def recruiter_talent_pool_list(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_archived: bool = Query(False),
    source_type: str | None = Query(None, max_length=32),
    pipeline_status: str | None = Query(None, max_length=32),
    search: str | None = Query(None, max_length=80),
    detail: bool = Query(False),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        if detail or search or source_type or pipeline_status or include_archived or offset:
            listed = list_talent_pool_records(
                db,
                company_slug=slug,
                limit=limit,
                offset=offset,
                include_archived=include_archived,
                source_type=source_type,
                pipeline_status=pipeline_status,
                search=search,
            )
            summary = build_recruiter_talent_pool(
                db,
                company_slug=slug,
                locale=locale_from_request(request),
                limit=limit,
            )
            return {**summary, **listed, "items": listed["items"]}
        return build_recruiter_talent_pool(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/talent-pool/candidates", status_code=201)
@limiter.limit("30/minute", key_func=recruiter_token_key)
def recruiter_talent_pool_add_candidate(
    request: Request,
    body: TalentPoolAddIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return add_talent_pool_record(
            db,
            company_slug=slug,
            display_name=body.display_name,
            job_title=body.job_title,
            location=body.location,
            seniority=body.seniority,
            skills=body.skills,
            external_ats_id=body.external_ats_id,
            candidate_id=body.candidate_id,
            pipeline_status=body.pipeline_status,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/talent-pool/{record_id}")
def recruiter_talent_pool_detail(
    request: Request,
    record_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return get_talent_pool_record(db, company_slug=slug, record_id=record_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/talent-pool/{record_id}")
@limiter.limit("30/minute", key_func=recruiter_token_key)
def recruiter_talent_pool_archive(
    request: Request,
    record_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return archive_talent_pool_record(db, company_slug=slug, record_id=record_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/trust-review-queue")
def recruiter_trust_review_queue_list(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None, max_length=32),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return list_trust_review_queue(
            db,
            company_slug=slug,
            settings=settings,
            limit=limit,
            offset=offset,
            status=status,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/trust-review-queue/{item_id}")
def recruiter_trust_review_queue_detail(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return get_trust_review_item(db, company_slug=slug, item_id=item_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/trust-review-queue/{item_id}/decisions", status_code=201)
@limiter.limit("30/minute", key_func=recruiter_token_key)
def recruiter_trust_review_queue_decide(
    request: Request,
    item_id: int,
    body: TrustReviewDecisionIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    actor = (x_twin_recruiter_token or token or "recruiter")[:120]
    try:
        return record_trust_review_decision(
            db,
            company_slug=slug,
            item_id=item_id,
            decision=body.decision,
            note=body.note,
            actor_ref=actor,
        )
    except ValueError as exc:
        code = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(code, detail=str(exc)) from exc


@router.get("/trust-review-queue/{item_id}/decisions")
def recruiter_trust_review_queue_decisions(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return list_trust_review_decisions(db, company_slug=slug, item_id=item_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/talent-pool/import/preview")
@limiter.limit("30/minute", key_func=recruiter_token_key)
def recruiter_talent_pool_import_preview(
    request: Request,
    body: RecruiterTalentPoolImportPreviewIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return preview_talent_pool_import(
            db,
            company_slug=slug,
            csv_text=body.csv_text,
            import_source=body.import_source,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/talent-pool/import/commit")
@limiter.limit("20/minute", key_func=recruiter_token_key)
def recruiter_talent_pool_import_commit(
    request: Request,
    body: RecruiterTalentPoolImportCommitIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    try:
        return commit_talent_pool_import(
            db,
            company_slug=slug,
            import_id=body.import_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
