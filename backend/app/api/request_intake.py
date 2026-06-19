"""Request intake API — GET/POST/PATCH only."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.request_intake import create_request_intake, list_request_intake, patch_request_intake

router = APIRouter()


class RequestIntakeCreateIn(BaseModel):
    request_type: str
    subject_ref: str
    candidate_ref: str | None = None
    company_slug: str | None = None
    status: str = "open"


class RequestIntakePatchIn(BaseModel):
    status: str | None = None


@router.get("")
def get_intake(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    _ = user
    return list_request_intake(db, limit=limit)


@router.post("", status_code=201)
def post_intake(body: RequestIntakeCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return create_request_intake(
            db,
            request_type=body.request_type,
            subject_ref=body.subject_ref,
            user_id=user.id,
            candidate_ref=body.candidate_ref,
            company_slug=body.company_slug,
            status=body.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{item_id}")
def patch_intake(item_id: int, body: RequestIntakePatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        return patch_request_intake(db, item_id=item_id, user_id=user.id, fields=fields)
    except ValueError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
