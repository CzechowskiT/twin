"""Append-only audit events API — GET/POST only."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services.audit_events import create_audit_event, list_audit_events

router = APIRouter()


class AuditEventCreateIn(BaseModel):
    event_type: str = Field(..., min_length=2, max_length=64)
    actor_persona: str = Field(..., min_length=2, max_length=32)
    target_type: str = Field(..., min_length=2, max_length=64)
    target_id: str = Field(..., min_length=1, max_length=128)
    metadata: dict[str, Any] | None = None


@router.get("")
def get_audit_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    target_type: Annotated[str | None, Query()] = None,
    target_id: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict:
    return list_audit_events(
        db,
        actor_id=str(user.id),
        target_type=target_type,
        target_id=target_id,
        limit=limit,
    )


@router.post("", status_code=201)
def post_audit_event(
    body: AuditEventCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return create_audit_event(
            db,
            event_type=body.event_type,
            actor_persona=body.actor_persona,
            actor_id=str(user.id),
            target_type=body.target_type,
            target_id=body.target_id,
            metadata=body.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
