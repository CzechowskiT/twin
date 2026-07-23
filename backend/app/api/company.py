"""Company workspace API — roles, pipeline quality, team readiness, Wave 3 Hard LIVE surfaces."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.recruiter import _resolved_company_slug
from app.config import Settings, get_settings
from app.database.session import get_db
from app.services import company_wave3 as wave3
from app.services.company_billing_readiness import build_company_plan_usage
from app.services.company_hiring_dashboard import build_company_hiring_dashboard
from app.services.company_pipeline_quality import build_company_pipeline_quality
from app.services.company_roles import (
    create_company_role,
    get_company_role,
    list_company_roles,
    update_company_role,
)
from app.services.company_team import build_company_team_readiness
from app.services.company_talent_pool import build_company_talent_pool
from app.services.request_locale import locale_from_request

router = APIRouter()


class CompanyRoleCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    status: str = "draft"
    location: str | None = None
    work_mode: str | None = None
    requirements: str | None = None
    description: str | None = None
    must_have_skills: list[str] | None = None
    nice_to_have_skills: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class CompanyRolePatchIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    status: str | None = None
    location: str | None = None
    work_mode: str | None = None
    requirements: str | None = None
    description: str | None = None
    must_have_skills: list[str] | None = None
    nice_to_have_skills: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class CompanyOrgSettingsIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=200)
    timezone: str | None = Field(default=None, max_length=64)
    locale: str | None = Field(default=None, max_length=16)
    hiring_policy: dict[str, Any] | None = None
    updated_by_role: str | None = Field(default=None, max_length=64)


class CompanyScorecardIn(BaseModel):
    subject_type: str = Field(default="candidate", max_length=32)
    subject_id: str = Field(..., min_length=1, max_length=64)
    decision_code: str = Field(..., min_length=1, max_length=64)
    summary: str = Field(..., min_length=2, max_length=500)
    rating: int | None = Field(default=None, ge=1, le=5)
    role_id: int | None = None


class CompanyInviteDryRunIn(BaseModel):
    invitee_email: str = Field(..., min_length=3, max_length=254)
    role_key: str = Field(default="hiring_manager", max_length=64)


class CompanyNotificationDraftIn(BaseModel):
    template_key: str = Field(default="company.notification", max_length=128)
    body_preview: str = Field(..., min_length=1, max_length=500)
    send: bool = False


@router.get("/hiring-dashboard")
def company_hiring_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """Executive hiring snapshot — roles, pipeline segments, team tokens (no PII)."""
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return build_company_hiring_dashboard(
            db,
            settings,
            company_slug=slug,
            raw_token=x_twin_recruiter_token or token,
            locale=locale_from_request(request),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/plan-usage")
def company_plan_usage(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return build_company_plan_usage(
            db,
            company_slug=slug,
            settings=settings,
            raw_token=x_twin_recruiter_token or token,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/pipeline-quality")
def company_pipeline_quality(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """Per-role pipeline segments and quality signals for one employer workspace."""
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return build_company_pipeline_quality(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/talent-pool")
def company_talent_pool(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """Company talent memory — summary, quality, source coverage (no PII)."""
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return build_company_talent_pool(
            db,
            company_slug=slug,
            locale=locale_from_request(request),
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/team")
def company_team_readiness(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    return build_company_team_readiness(
        db,
        settings,
        company_slug=slug,
        raw_token=x_twin_recruiter_token or token,
    )


@router.get("/roles")
def company_roles_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        items = list_company_roles(db, company_slug=slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"company_slug": slug, "items": items}


@router.post("/roles", status_code=status.HTTP_201_CREATED)
def company_roles_create(
    body: CompanyRoleCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        role = create_company_role(
            db,
            company_slug=slug,
            title=body.title,
            status=body.status,
            location=body.location,
            work_mode=body.work_mode,
            requirements=body.requirements,
            description=body.description,
            must_have_skills=body.must_have_skills,
            nice_to_have_skills=body.nice_to_have_skills,
            salary_min=body.salary_min,
            salary_max=body.salary_max,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"company_slug": slug, "role": role}


@router.get("/roles/{role_id}")
def company_roles_get(
    role_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        role = get_company_role(db, company_slug=slug, role_id=role_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not role:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role not found")
    return {"company_slug": slug, "role": role}


@router.patch("/roles/{role_id}")
def company_roles_patch(
    role_id: int,
    body: CompanyRolePatchIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    payload = body.model_dump(exclude_unset=True)
    try:
        role = update_company_role(db, company_slug=slug, role_id=role_id, **payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not role:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role not found")
    return {"company_slug": slug, "role": role}


@router.get("/org-settings")
def company_org_settings_get(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.get_org_settings(db, company_slug=slug)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/org-settings")
def company_org_settings_put(
    body: CompanyOrgSettingsIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.upsert_org_settings(
            db,
            company_slug=slug,
            display_name=body.display_name,
            timezone_name=body.timezone,
            locale=body.locale,
            hiring_policy=body.hiring_policy,
            updated_by_role=body.updated_by_role,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/permissions")
def company_permissions_matrix(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.list_permissions_matrix(db, company_slug=slug)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/team/invites/dry-run", status_code=status.HTTP_201_CREATED)
def company_team_invite_dry_run(
    body: CompanyInviteDryRunIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.dry_run_team_invite(
            db,
            company_slug=slug,
            invitee_email=body.invitee_email,
            role_key=body.role_key,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/scorecards")
def company_scorecards_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.list_scorecards(db, company_slug=slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/scorecards", status_code=status.HTTP_201_CREATED)
def company_scorecards_create(
    body: CompanyScorecardIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.create_scorecard(
            db,
            company_slug=slug,
            subject_type=body.subject_type,
            subject_id=body.subject_id,
            decision_code=body.decision_code,
            summary=body.summary,
            rating=body.rating,
            role_id=body.role_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/audit-log")
def company_audit_log(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.list_company_audit_log(db, company_slug=slug, limit=limit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/trust-summary")
def company_trust_summary(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    subject_id: str = Query(..., min_length=1, max_length=64),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.candidate_trust_summary(db, company_slug=slug, subject_id=subject_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/onboarding")
def company_onboarding_synthetic(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.synthetic_onboarding_status(db, company_slug=slug)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/notifications/draft", status_code=status.HTTP_201_CREATED)
def company_notifications_draft(
    body: CompanyNotificationDraftIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        return wave3.draft_company_notification(
            db,
            company_slug=slug,
            template_key=body.template_key,
            body_preview=body.body_preview,
            send=body.send,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/billing/honesty")
def company_billing_honesty(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    return wave3.billing_honesty(db, company_slug=slug)


@router.get("/integrations/honesty")
def company_integrations_honesty(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    return wave3.integrations_honesty(db, company_slug=slug)


@router.get("/calendar/status")
def company_calendar_status(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    from app.services import company_calendar_service as cal

    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    return cal.calendar_status(db, company_slug=slug)


@router.get("/calendar/holds")
def company_calendar_holds_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    from app.services import company_calendar_service as cal

    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    return cal.list_holds(db, company_slug=slug)


@router.post("/calendar/holds", status_code=status.HTTP_201_CREATED)
def company_calendar_holds_create(
    body: dict,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    from datetime import datetime

    from app.services import company_calendar_service as cal

    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    try:
        starts = datetime.fromisoformat(str(body.get("starts_at", "")).replace("Z", "+00:00")).replace(tzinfo=None)
        ends = datetime.fromisoformat(str(body.get("ends_at", "")).replace("Z", "+00:00")).replace(tzinfo=None)
        return cal.create_hold_draft(
            db,
            company_slug=slug,
            title=str(body.get("title") or "Interview hold"),
            starts_at=starts,
            ends_at=ends,
            provider=str(body.get("provider") or "local"),
        )
    except (ValueError, TypeError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/billing/checkout-session", status_code=status.HTTP_201_CREATED)
def company_billing_checkout_session(
    body: dict,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    """B2B Stripe sandbox checkout — test-mode Session when keys present; else honest stub.

    Never claims public launch. Live-mode Stripe keys are rejected.
    """
    from datetime import datetime, timezone

    from app.database.models import CompanyBillingAccount
    from app.services.company_stripe_sandbox import create_company_sandbox_checkout, stripe_key_mode
    from app.services.platform_foundations import record_domain_event

    slug = _resolved_company_slug(
        db,
        settings,
        authorization=authorization,
        x_twin_recruiter_token=x_twin_recruiter_token or token,
        company_slug_query=company_slug,
    )
    plan_sku = str(body.get("plan_sku") or "company_pilot")[:64]
    mode = stripe_key_mode(getattr(settings, "stripe_secret_key", "") or "")
    if mode == "live":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="live_stripe_forbidden_in_completion_batch")

    row = db.query(CompanyBillingAccount).filter(CompanyBillingAccount.company_slug == slug).one_or_none()
    if row is None:
        row = CompanyBillingAccount(
            company_slug=slug,
            stripe_customer_id=None,
            plan_sku=plan_sku,
            checkout_enabled=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    result = create_company_sandbox_checkout(
        settings,
        company_slug=slug,
        plan_sku=plan_sku,
        account_id=int(row.id),
    )
    row.checkout_enabled = bool(result.get("checkout_enabled"))
    row.plan_sku = plan_sku
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    record_domain_event(
        db,
        event_name="company.billing_checkout_sandbox",
        aggregate_type="company_billing_account",
        aggregate_id=str(row.id),
        payload={
            "stripe_mode": result.get("stripe_mode"),
            "sandbox": result.get("sandbox"),
            "livemode": result.get("livemode"),
            "company_slug": slug,
            "public_launch": False,
        },
    )
    return result
