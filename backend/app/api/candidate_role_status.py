"""Candidate role status API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.candidate_role_status import (
    create_candidate_role_status,
    list_candidate_role_statuses,
    patch_candidate_role_status,
)

router = APIRouter()


class CandidateRoleStatusCreateIn(BaseModel):
    candidate_ref: str = Field(..., min_length=1, max_length=64)
    role_ref: str = Field(..., min_length=1, max_length=64)
    status: str = Field(..., max_length=32)
    company_slug: str | None = Field(None, max_length=80)


class CandidateRoleStatusPatchIn(BaseModel):
    status: str = Field(..., max_length=32)


@router.get("")
def get_statuses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    candidate_ref: Annotated[str | None, Query()] = None,
    role_ref: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    return list_candidate_role_statuses(
        db,
        user_id=user.id,
        candidate_ref=candidate_ref,
        role_ref=role_ref,
        limit=limit,
    )


@router.post("", status_code=201)
def post_status(body: CandidateRoleStatusCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return create_candidate_role_status(
            db,
            candidate_ref=body.candidate_ref,
            role_ref=body.role_ref,
            status=body.status,
            user_id=user.id,
            company_slug=body.company_slug,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{row_id}")
def patch_status(row_id: int, body: CandidateRoleStatusPatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return patch_candidate_role_status(db, row_id=row_id, status=body.status, user_id=user.id)
    except ValueError as exc:
        code = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=code, detail=str(exc)) from exc
