"""Unified Career Lifecycle Command Center API — orchestration only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_lifecycle as life

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


def _err(exc: Exception) -> HTTPException:
    msg = str(exc) or type(exc).__name__
    code = status.HTTP_400_BAD_REQUEST
    if "not_found" in msg:
        code = status.HTTP_404_NOT_FOUND
    return HTTPException(code, detail=msg)


class PhaseIn(BaseModel):
    phase: str = Field(..., max_length=48)
    reason: str = Field(default="", max_length=300)


class ApprovalIn(BaseModel):
    approved: bool = True


class FocusIn(BaseModel):
    focus_type: str = Field(default="custom", max_length=64)
    focus_ref: str = Field(..., max_length=160)


class HandoffIn(BaseModel):
    from_module: str = Field(..., max_length=64)
    to_module: str = Field(..., max_length=64)
    from_object_id: str | None = Field(default=None, max_length=64)
    to_object_id: str | None = Field(default=None, max_length=64)
    snapshot_hash: str | None = Field(default=None, max_length=64)
    status: str = Field(default="ready", max_length=32)


class SearchIn(BaseModel):
    q: str = Field(..., min_length=2, max_length=120)


class DeepLinkIn(BaseModel):
    target: str = Field(default="home", max_length=64)


class PrivacyIn(BaseModel):
    orchestration_opt_in: bool | None = None
    search_opt_in: bool | None = None
    learning_opt_in: bool | None = None
    reminders_opt_in: bool | None = None
    export_include_module_notes: bool | None = None
    paused: bool | None = None


@router.get("/me/career-lifecycle")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return life.build_aggregate(
            db,
            candidate_id=cand.id,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-lifecycle/phase/propose")
def post_phase_propose(
    body: PhaseIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return life.propose_phase(
            db, candidate_id=cand.id, phase=body.phase, reason=body.reason
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-lifecycle/approvals/{approval_id}/resolve")
def post_approval_resolve(
    approval_id: int,
    body: ApprovalIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return life.resolve_approval(
            db, candidate_id=cand.id, approval_id=approval_id, approved=body.approved
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-lifecycle/focus")
def post_focus(
    body: FocusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return life.set_focus(
            db,
            candidate_id=cand.id,
            focus_type=body.focus_type,
            focus_ref=body.focus_ref,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-lifecycle/handoffs", status_code=status.HTTP_201_CREATED)
def post_handoff(
    body: HandoffIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "handoff": life.register_handoff(
                db,
                candidate_id=cand.id,
                from_module=body.from_module,
                to_module=body.to_module,
                from_object_id=body.from_object_id,
                to_object_id=body.to_object_id,
                snapshot_hash=body.snapshot_hash,
                status=body.status,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-lifecycle/consistency")
def post_consistency(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.run_consistency(db, candidate_id=cand.id)


@router.post("/me/career-lifecycle/search")
def post_search(
    body: SearchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return life.global_search(db, candidate_id=cand.id, q=body.q)
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/career-lifecycle/history")
def get_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    agg = life.build_aggregate(db, candidate_id=cand.id)
    return {
        "events": agg.get("events") or [],
        "context": agg.get("context"),
        "phases": agg.get("phases"),
    }


@router.post("/me/career-lifecycle/archive")
def post_archive(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.archive_context(db, candidate_id=cand.id, reopen=False)


@router.post("/me/career-lifecycle/reopen")
def post_reopen(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.archive_context(db, candidate_id=cand.id, reopen=True)


@router.post("/me/career-lifecycle/next-cycle")
def post_next_cycle(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.start_next_cycle(db, candidate_id=cand.id)


@router.get("/me/career-lifecycle/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.unified_export(db, candidate_id=cand.id)


@router.get("/me/career-lifecycle/deletion-graph")
def get_deletion_graph(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.deletion_dependency_graph(db, candidate_id=cand.id)


@router.post("/me/career-lifecycle/delete")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.delete_lifecycle(db, candidate_id=cand.id)


@router.get("/me/career-lifecycle/recovery")
def get_recovery(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.recovery_status(db, candidate_id=cand.id)


@router.post("/me/career-lifecycle/deep-link")
def post_deep_link(
    body: DeepLinkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return life.deep_link_resolve(db, candidate_id=cand.id, target=body.target)


@router.patch("/me/career-lifecycle/privacy")
def patch_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = life.update_privacy(
        db,
        candidate_id=cand.id,
        orchestration_opt_in=body.orchestration_opt_in,
        search_opt_in=body.search_opt_in,
        learning_opt_in=body.learning_opt_in,
        reminders_opt_in=body.reminders_opt_in,
        export_include_module_notes=body.export_include_module_notes,
        paused=body.paused,
    )
    return {
        "orchestration_opt_in": row.orchestration_opt_in,
        "search_opt_in": row.search_opt_in,
        "learning_opt_in": row.learning_opt_in,
        "reminders_opt_in": row.reminders_opt_in,
        "export_include_module_notes": row.export_include_module_notes,
        "paused": row.paused,
        "version": row.version,
        "propagated": True,
    }
