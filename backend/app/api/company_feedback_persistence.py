"""Company feedback persistence API."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.company_feedback_persistence import (
    create_company_feedback,
    list_company_feedback,
    patch_company_feedback,
)

router = APIRouter()


class CompanyFeedbackCreateIn(BaseModel):
    candidate_ref: str
    role_ref: str
    company_slug: str | None = None
    status: str = "draft"
    rating_preview: str | None = None
    comment: str | None = Field(None, max_length=4000)


class CompanyFeedbackPatchIn(BaseModel):
    status: str | None = None
    rating_preview: str | None = None
    comment: str | None = Field(None, max_length=4000)


@router.get("")
def get_feedback(db: Session = Depends(get_db), user: User = Depends(get_current_user), limit: Annotated[int, Query(ge=1, le=100)] = 50) -> dict:
    return list_company_feedback(db, user_id=user.id, limit=limit)


@router.post("", status_code=201)
def post_feedback(body: CompanyFeedbackCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return create_company_feedback(
            db,
            candidate_ref=body.candidate_ref,
            role_ref=body.role_ref,
            user_id=user.id,
            company_slug=body.company_slug,
            status=body.status,
            rating_preview=body.rating_preview,
            comment=body.comment,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{item_id}")
def patch_feedback(item_id: int, body: CompanyFeedbackPatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        return patch_company_feedback(db, item_id=item_id, user_id=user.id, fields=fields)
    except ValueError as exc:
        code = 403 if "Not authorized" in str(exc) else 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=code, detail=str(exc)) from exc
