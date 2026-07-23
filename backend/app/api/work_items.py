"""Work items API — GET/POST/PATCH only."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.work_items import create_work_item, list_work_items, patch_work_item

router = APIRouter()


class WorkItemCreateIn(BaseModel):
    item_type: str = Field(..., min_length=2, max_length=32)
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=4000)
    persona_scope: str = Field(..., min_length=2, max_length=32)
    company_slug: str | None = Field(None, max_length=80)
    status: str = Field("open", max_length=32)
    due_date: str | None = Field(None, max_length=10)
    owner_label: str | None = Field(None, max_length=120)


class WorkItemPatchIn(BaseModel):
    status: str | None = Field(None, max_length=32)
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=4000)
    due_date: str | None = Field(None, max_length=10)
    owner_label: str | None = Field(None, max_length=120)


@router.get("")
def get_work_items(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    persona_scope: Annotated[str | None, Query()] = None,
    company_slug: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    return list_work_items(
        db,
        user_id=user.id,
        persona_scope=persona_scope,
        company_slug=company_slug,
        limit=limit,
    )


@router.post("", status_code=201)
def post_work_item(
    body: WorkItemCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return create_work_item(
            db,
            item_type=body.item_type,
            title=body.title,
            description=body.description,
            persona_scope=body.persona_scope,
            user_id=user.id,
            company_slug=body.company_slug,
            status=body.status,
            due_date=body.due_date,
            owner_label=body.owner_label,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{work_item_id}")
def patch_work_item_route(
    work_item_id: int,
    body: WorkItemPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")
    try:
        return patch_work_item(db, work_item_id=work_item_id, user_id=user.id, fields=fields)
    except ValueError as exc:
        msg = str(exc)
        code = status.HTTP_404_NOT_FOUND if "not found" in msg.lower() else status.HTTP_400_BAD_REQUEST
        if "Not authorized" in msg:
            code = status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=code, detail=msg) from exc
