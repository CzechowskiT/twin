"""Epic 2.21 — Candidate workspace handoff API (non-mutating context only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_workspace_handoff as cwh

router = APIRouter()


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Referrer-Policy"] = "no-referrer"


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


class CreateIn(BaseModel):
    handoff_id: str = Field(min_length=3, max_length=64)
    object_ref: str = Field(min_length=1, max_length=128)
    object_revision: str | None = Field(default=None, max_length=128)
    parent_handle: str | None = Field(default=None, max_length=4096)
    ttl_seconds: int = Field(default=1800, ge=60, le=1800)


class ResolveIn(BaseModel):
    handle: str = Field(min_length=16, max_length=4096)
    expected_dest_route_key: str | None = Field(default=None, max_length=64)


@router.get("/me/workspace-handoffs/catalog")
def handoff_catalog(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return cwh.catalog()


@router.post("/me/workspace-handoffs")
def create_handoff(
    body: CreateIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cwh.create_handoff(
            db,
            user=user,
            candidate_id=cand.id,
            handoff_id=body.handoff_id.strip(),
            object_ref=body.object_ref.strip(),
            object_revision=(body.object_revision or None),
            parent_handle=body.parent_handle,
            ttl_seconds=body.ttl_seconds,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="object_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/workspace-handoffs/resolve")
def resolve_handoff(
    body: ResolveIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cwh.resolve_handoff(
            db,
            user=user,
            candidate_id=cand.id,
            handle=body.handle,
            expected_dest_route_key=body.expected_dest_route_key,
        )
    except LookupError as exc:
        detail = str(exc) if str(exc) in {"expired", "unavailable"} else "unavailable"
        code = status.HTTP_410_GONE if detail == "expired" else status.HTTP_404_NOT_FOUND
        raise HTTPException(code, detail=detail) from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None
