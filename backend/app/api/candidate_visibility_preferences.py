"""Candidate visibility preferences API — GET/POST/PATCH only."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.candidate_visibility_preferences import (
    create_visibility_preference,
    list_visibility_preferences,
    patch_visibility_preference,
)

router = APIRouter()


class VisibilityPreferenceCreateIn(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=64)
    profile_visibility: str = "private"
    cv_visibility: str = "private"
    match_visibility: str = "private"
    company_visibility: str = "hidden"
    communication_preference: str = "no_outreach"


class VisibilityPreferencePatchIn(BaseModel):
    profile_visibility: str | None = None
    cv_visibility: str | None = None
    match_visibility: str | None = None
    company_visibility: str | None = None
    communication_preference: str | None = None


@router.get("")
def get_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    candidate_id: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    return list_visibility_preferences(
        db, candidate_id=candidate_id, user_id=user.id, limit=limit
    )


@router.post("", status_code=201)
def post_preference(
    body: VisibilityPreferenceCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return create_visibility_preference(
            db,
            candidate_id=body.candidate_id,
            user_id=user.id,
            profile_visibility=body.profile_visibility,
            cv_visibility=body.cv_visibility,
            match_visibility=body.match_visibility,
            company_visibility=body.company_visibility,
            communication_preference=body.communication_preference,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{preference_id}")
def patch_preference(
    preference_id: int,
    body: VisibilityPreferencePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        return patch_visibility_preference(db, preference_id=preference_id, user_id=user.id, fields=fields)
    except ValueError as exc:
        code = 403 if "Not authorized" in str(exc) else 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=code, detail=str(exc)) from exc
