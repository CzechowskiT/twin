"""Epic 2.18 API — Journey Continuity / Safe Resume (auth required)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_journey_continuity as cjc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


class CheckpointIn(BaseModel):
    flow_kind: str = Field(min_length=8, max_length=64)
    owner_ref: str | None = Field(default=None, max_length=128)
    step_key: str | None = Field(default=None, max_length=64)
    route_key: str | None = Field(default=None, max_length=64)
    path_kind: str | None = Field(default=None, max_length=64)
    explicit: bool = True


class ResumeIn(BaseModel):
    client_revision: int | None = None


class PinIn(BaseModel):
    pinned: bool = True


class PauseIn(BaseModel):
    paused: bool = True


@router.get("/me/journey-continuity/catalog")
def catalog(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return cjc.catalog()


@router.get("/me/journey-continuity/adapter-matrix")
def matrix(response: Response, user: User = Depends(get_current_user)) -> dict:
    _ = user
    _no_store(response)
    return cjc.adapter_matrix()


@router.get("/me/journey-continuity/continue")
def continue_list(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return cjc.list_continue(db, candidate_id=cand.id)


@router.post("/me/journey-continuity/checkpoint")
def checkpoint(
    body: CheckpointIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.checkpoint(
            db,
            candidate_id=cand.id,
            flow_kind=body.flow_kind.strip().upper(),
            owner_ref=body.owner_ref,
            step_key=body.step_key,
            route_key=body.route_key,
            path_kind=body.path_kind,
            explicit=body.explicit,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/journey-continuity/sessions/{session_key}/resume")
def resume(
    session_key: str,
    body: ResumeIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.resume(
            db,
            candidate_id=cand.id,
            session_key=session_key,
            client_revision=body.client_revision,
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/journey-continuity/sessions/{session_key}/bump")
def bump(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.bump_revision(db, candidate_id=cand.id, session_key=session_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/journey-continuity/sessions/{session_key}/pin")
def pin_session(
    session_key: str,
    body: PinIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.pin(db, candidate_id=cand.id, session_key=session_key, pinned=body.pinned)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None


@router.post("/me/journey-continuity/sessions/{session_key}/pause")
def pause_session(
    session_key: str,
    body: PauseIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.pause(db, candidate_id=cand.id, session_key=session_key, paused=body.paused)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None


@router.post("/me/journey-continuity/sessions/{session_key}/clear")
def clear_session(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.clear(db, candidate_id=cand.id, session_key=session_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None


@router.post("/me/journey-continuity/sessions/{session_key}/invalidate")
def invalidate_session(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cjc.invalidate(db, candidate_id=cand.id, session_key=session_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None
