"""ATS completion API — vacancy preview/import + sync dry-run/write gates."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services import ats_sync_service as ats

router = APIRouter(prefix="/integrations/ats", tags=["ats-completion"])


class VacancyImportIn(BaseModel):
    company_slug: str = Field(..., min_length=1, max_length=80)
    provider: str = Field(default="greenhouse", max_length=32)
    job_post_ids: list[str] = Field(default_factory=list)
    dry_run: bool = True
    user_id: int | None = Field(default=None, description="Ops/smoke override; prefer JWT user")


class SyncIn(BaseModel):
    company_slug: str = Field(..., min_length=1, max_length=80)
    application_id: int
    provider: str = Field(default="greenhouse", max_length=32)


@router.get("/status")
def ats_status(
    db: Session = Depends(get_db),
    x_twin_user_id: Annotated[int | None, Header(alias="X-Twin-User-Id")] = None,
) -> dict[str, Any]:
    return ats.ats_connection_status(db, user_id=x_twin_user_id)


@router.get("/vacancies/preview")
def vacancies_preview(
    db: Session = Depends(get_db),
    provider: str = Query("greenhouse", max_length=32),
    x_twin_user_id: Annotated[int | None, Header(alias="X-Twin-User-Id")] = None,
) -> dict[str, Any]:
    """Honest empty preview without OAuth; Harvest/Lever when token present."""
    uid = x_twin_user_id or 0
    if uid <= 0:
        return ats.honest_empty_preview(db, provider=provider, reason="NEEDS_AUTH")
    try:
        return ats.list_vacancy_import_preview(db, user_id=uid, provider=provider)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/vacancies/import")
def vacancies_import(
    body: VacancyImportIn,
    db: Session = Depends(get_db),
    x_twin_user_id: Annotated[int | None, Header(alias="X-Twin-User-Id")] = None,
) -> dict[str, Any]:
    uid = x_twin_user_id or body.user_id or 0
    if uid <= 0:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user_required")
    try:
        return ats.import_vacancies(
            db,
            user_id=uid,
            company_slug=body.company_slug,
            provider=body.provider,
            job_post_ids=body.job_post_ids,
            dry_run=body.dry_run,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/sync/attempts")
def sync_attempts(
    db: Session = Depends(get_db),
    company_slug: str | None = Query(None, max_length=80),
    limit: int = Query(25, ge=1, le=100),
) -> dict[str, Any]:
    """Investor SOR proof ATS — list ``ats_sync_attempts`` evidence (dry-run by default)."""
    return ats.list_sync_attempts(db, company_slug=company_slug, limit=limit)


@router.post("/sync/dry-run", status_code=status.HTTP_201_CREATED)
def sync_dry_run(
    body: SyncIn,
    db: Session = Depends(get_db),
    x_twin_user_id: Annotated[int | None, Header(alias="X-Twin-User-Id")] = None,
) -> dict[str, Any]:
    try:
        return ats.enqueue_ats_write_dry_run(
            db,
            company_slug=body.company_slug,
            application_id=body.application_id,
            provider=body.provider,
            user_id=x_twin_user_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/sync/proposals/{attempt_id}")
def sync_proposal_export(
    attempt_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """CORE_PILOT ATS proposal export — dry-run evidence for approval; live write is OPTIONAL."""
    try:
        return ats.export_sync_proposal(db, attempt_id=attempt_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sync/write", status_code=status.HTTP_201_CREATED)
def sync_write(body: SyncIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        return ats.enqueue_ats_write(
            db,
            company_slug=body.company_slug,
            application_id=body.application_id,
            provider=body.provider,
            live=True,
        )
    except ValueError as exc:
        code = status.HTTP_403_FORBIDDEN if "blocked" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
