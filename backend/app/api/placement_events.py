"""Append-only placement verification events API — GET/POST only."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.placement_events_foundation import create_placement_event, list_placement_events

router = APIRouter()


class PlacementEventCreateIn(BaseModel):
    placement_id: str = Field(..., min_length=2, max_length=128)
    event_type: str = Field(..., min_length=2, max_length=64)
    event_status: str = Field(..., min_length=2, max_length=32)
    actor_persona: str = Field(..., min_length=2, max_length=32)
    candidate_id: str | None = Field(None, max_length=64)
    role_context_id: str | None = Field(None, max_length=64)
    company_slug: str | None = Field(None, max_length=80)
    application_id: int | None = None
    metadata: dict[str, Any] | None = None
    source: str = Field("twin_internal", max_length=32)


@router.get("")
def get_placement_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    placement_id: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    _ = user
    return list_placement_events(db, placement_id=placement_id, limit=limit)


@router.post("", status_code=201)
def post_placement_event(
    body: PlacementEventCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return create_placement_event(
            db,
            placement_id=body.placement_id,
            event_type=body.event_type,
            event_status=body.event_status,
            actor_persona=body.actor_persona,
            user_id=user.id,
            candidate_id=body.candidate_id,
            role_context_id=body.role_context_id,
            company_slug=body.company_slug,
            application_id=body.application_id,
            metadata=body.metadata,
            source=body.source,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
