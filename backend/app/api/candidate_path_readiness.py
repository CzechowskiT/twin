"""Epic 2.16 API — path readiness + guided resolution routing (auth required)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_path_readiness as cpr

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


class SelectIn(BaseModel):
    path_kind: str = Field(min_length=8, max_length=64)
    object_ref: str | None = Field(default=None, max_length=64)


class ClickIn(BaseModel):
    deep_link: str = Field(min_length=1, max_length=200)


@router.get("/me/path-readiness/catalog")
def path_catalog(
    response: Response,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    _no_store(response)
    return cpr.catalog()


@router.get("/me/path-readiness/options")
def path_options(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return cpr.list_path_options(db, candidate_id=cand.id)


@router.get("/me/path-readiness/current")
def path_current(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return cpr.current_session(db, candidate_id=cand.id)


@router.post("/me/path-readiness/select")
def path_select(
    body: SelectIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cpr.select_path(
            db,
            candidate_id=cand.id,
            path_kind=body.path_kind.strip().upper(),
            object_ref=(body.object_ref or None),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.get("/me/path-readiness/sessions/{session_key}")
def path_evaluate(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cpr.evaluate_session(
            db, candidate_id=cand.id, session_key=session_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None


@router.post("/me/path-readiness/sessions/{session_key}/recalculate")
def path_recalc(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Data Trust handoff return — recalculate only, no auto-continue."""
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cpr.recalculate_after_data_trust(
            db, candidate_id=cand.id, session_key=session_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None


@router.post("/me/path-readiness/sessions/{session_key}/route-click")
def path_route_click(
    session_key: str,
    body: ClickIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cpr.record_route_click(
            db,
            candidate_id=cand.id,
            session_key=session_key,
            deep_link=body.deep_link.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/path-readiness/sessions/{session_key}/clear")
def path_clear(
    session_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cpr.clear_session(
            db, candidate_id=cand.id, session_key=session_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from None
