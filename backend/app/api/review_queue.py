"""Review queue API."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.review_queue import create_review_queue_item, list_review_queue, patch_review_queue_item

router = APIRouter()


class ReviewQueueCreateIn(BaseModel):
    item_kind: str
    subject_ref: str
    company_slug: str | None = None
    status: str = "open"
    priority: str | None = None
    owner_label: str | None = None


class ReviewQueuePatchIn(BaseModel):
    status: str | None = None
    priority: str | None = None
    owner_label: str | None = None


@router.get("")
def get_queue(db: Session = Depends(get_db), user: User = Depends(get_current_user), limit: Annotated[int, Query(ge=1, le=100)] = 50) -> dict:
    _ = user
    return list_review_queue(db, limit=limit)


@router.post("", status_code=201)
def post_queue(body: ReviewQueueCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return create_review_queue_item(
            db,
            item_kind=body.item_kind,
            subject_ref=body.subject_ref,
            user_id=user.id,
            company_slug=body.company_slug,
            status=body.status,
            priority=body.priority,
            owner_label=body.owner_label,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{item_id}")
def patch_queue(item_id: int, body: ReviewQueuePatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        return patch_review_queue_item(db, item_id=item_id, user_id=user.id, fields=fields)
    except ValueError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
