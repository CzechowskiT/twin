"""Epic 2.26 — adaptive interview practice API.

Candidate-owned. Mounted under /api/v1/candidates/me/interview-practice.
No scoring, no hiring probability, no employer ranking.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_interview_practice as prac

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


def _handle(fn: Any, *args: Any, **kwargs: Any) -> Any:
    try:
        return fn(*args, **kwargs)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ── Request schemas ────────────────────────────────────────────────────────────


class SessionCreateIn(BaseModel):
    exercise_id: str | None = Field(default=None, max_length=64)
    process_id: int | None = None
    locale: str = Field(default="en", max_length=8)
    ai_prep_opt_in: bool = False  # kept for compat; server reads canonical privacy row


class DraftPatchIn(BaseModel):
    answer_draft: str = Field(default="", max_length=8000)


class TurnSubmitIn(BaseModel):
    answer_text: str = Field(..., max_length=8000)
    ai_prep_opt_in: bool = False  # IGNORED by server; consent read from privacy row


class NextTurnIn(BaseModel):
    ai_prep_opt_in: bool = False  # IGNORED; server reads privacy row


class PromoteEvidenceIn(BaseModel):
    turn_ids: list[int] | None = Field(
        default=None,
        description="Explicit turn IDs to promote. If omitted, all submitted turns are promoted.",
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("/me/interview-practice/sessions")
def list_sessions(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """List practice sessions (paginated, excluding deleted)."""
    cand = _candidate(db, user)
    return _handle(prac.list_sessions, db, candidate_id=cand.id, limit=limit, offset=offset)


@router.get("/me/interview-practice/catalog")
def get_catalog(
    locale: str = "en",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Return exercise catalog (locale-aware EN/PL)."""
    _candidate(db, user)
    return prac.catalog(locale[:8])


@router.post("/me/interview-practice/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    body: SessionCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Create a new practice session."""
    cand = _candidate(db, user)
    return _handle(
        prac.create_session,
        db,
        candidate_id=cand.id,
        exercise_id=body.exercise_id,
        process_id=body.process_id,
        locale=body.locale,
        ai_prep_opt_in=body.ai_prep_opt_in,
    )


@router.get("/me/interview-practice/sessions/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Get session with turns and evaluations."""
    cand = _candidate(db, user)
    return _handle(prac.get_session, db, candidate_id=cand.id, session_id=session_id)


@router.patch("/me/interview-practice/sessions/{session_id}/turns/{turn_id}/draft")
def patch_draft(
    session_id: int,
    turn_id: int,
    body: DraftPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Save answer draft without submitting."""
    cand = _candidate(db, user)
    return _handle(
        prac.patch_turn_draft,
        db,
        candidate_id=cand.id,
        session_id=session_id,
        turn_id=turn_id,
        answer_draft=body.answer_draft,
    )


@router.post("/me/interview-practice/sessions/{session_id}/turns/{turn_id}/submit")
def submit_turn(
    session_id: int,
    turn_id: int,
    body: TurnSubmitIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Submit an answer and get criterion-level evaluation (no numeric score)."""
    cand = _candidate(db, user)
    return _handle(
        prac.submit_turn,
        db,
        candidate_id=cand.id,
        session_id=session_id,
        turn_id=turn_id,
        answer_text=body.answer_text,
        ai_prep_opt_in=body.ai_prep_opt_in,
    )


@router.post("/me/interview-practice/sessions/{session_id}/next-turn")
def next_turn(
    session_id: int,
    body: NextTurnIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Create adaptive follow-up turn from deterministic library."""
    cand = _candidate(db, user)
    return _handle(
        prac.next_turn,
        db,
        candidate_id=cand.id,
        session_id=session_id,
        ai_prep_opt_in=body.ai_prep_opt_in,
    )


@router.post("/me/interview-practice/sessions/{session_id}/complete")
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Mark session completed."""
    cand = _candidate(db, user)
    return _handle(prac.complete_session, db, candidate_id=cand.id, session_id=session_id)


@router.post("/me/interview-practice/sessions/{session_id}/abandon")
def abandon_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Abandon a session."""
    cand = _candidate(db, user)
    return _handle(prac.abandon_session, db, candidate_id=cand.id, session_id=session_id)


@router.delete("/me/interview-practice/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Soft-delete a session."""
    cand = _candidate(db, user)
    return _handle(prac.delete_session, db, candidate_id=cand.id, session_id=session_id)


@router.post("/me/interview-practice/sessions/{session_id}/promote-to-evidence")
def promote_to_evidence(
    session_id: int,
    body: PromoteEvidenceIn = PromoteEvidenceIn(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Promote practice turns as PRACTICE_WORK_SAMPLE career evidence.

    Pass turn_ids to promote specific turns; omit to promote all submitted turns.
    """
    cand = _candidate(db, user)
    return _handle(
        prac.promote_to_evidence,
        db,
        candidate_id=cand.id,
        session_id=session_id,
        turn_ids=body.turn_ids,
    )
