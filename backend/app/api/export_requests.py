"""Export requests API — GET/POST only."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.export_requests import create_export_request, list_export_requests

router = APIRouter()


class ExportRequestCreateIn(BaseModel):
    request_type: str
    candidate_id: str = Field(..., min_length=1, max_length=64)
    role_context_id: str | None = Field(None, max_length=64)
    status: str = "draft"


@router.get("")
def get_export_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    candidate_id: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    _ = user
    return list_export_requests(db, candidate_id=candidate_id, limit=limit)


@router.post("", status_code=201)
def post_export_request(
    body: ExportRequestCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return create_export_request(
            db,
            request_type=body.request_type,
            candidate_id=body.candidate_id,
            user_id=user.id,
            role_context_id=body.role_context_id,
            status=body.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
