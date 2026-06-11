"""Company workspace API — internal roles and pipeline quality aggregates."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.recruiter import _resolved_company_slug
from app.config import Settings, get_settings
from app.database.session import get_db
from app.services.company_pipeline_quality import build_company_pipeline_quality
from app.services.company_roles import (
    create_company_role,
    get_company_role,
    list_company_roles,
    update_company_role,
)
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


@router.get("/roles")
def company_roles_list(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
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
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
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
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
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
    x_twin_recruiter_token: Annotated[str | None, Header(alias="X-Twin-Recruiter-Token")] = None,
    token: Annotated[str | None, Query()] = None,
    company_slug: str | None = Query(None, max_length=80),
) -> dict:
    slug = _resolved_company_slug(db, settings, x_twin_recruiter_token or token, company_slug)
    payload = body.model_dump(exclude_unset=True)
    try:
        role = update_company_role(db, company_slug=slug, role_id=role_id, **payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not role:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Role not found")
    return {"company_slug": slug, "role": role}
