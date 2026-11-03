"""Decision-to-Calendar Execution + Capacity Planning API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import decision_calendar_capacity as dcc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


def _err(exc: Exception) -> HTTPException:
    msg = str(exc) or type(exc).__name__
    code = status.HTTP_404_NOT_FOUND if "not_found" in msg else status.HTTP_400_BAD_REQUEST
    return HTTPException(code, detail=msg)


class CapacityIn(BaseModel):
    weekly_budget_minutes: int | None = None
    timezone_name: str = Field(default="UTC", max_length=64)
    windows: list[dict] | None = None
    protected_focus: dict | None = None


class SnapshotIn(BaseModel):
    use_microsoft_busy: bool = False
    synthetic_busy: list[dict] | None = None


class BatchProposeIn(BaseModel):
    snapshot_id: int | None = None


class ResolveBatchIn(BaseModel):
    action: str = Field(default="reject", max_length=32)
    selected_item_ids: list[int] | None = None


class ProgressIn(BaseModel):
    percent: int | None = None
    actual_effort_minutes: int | None = None
    completed: bool = False


class RescheduleIn(BaseModel):
    starts_at: str = Field(..., min_length=1, max_length=64)
    ends_at: str = Field(..., min_length=1, max_length=64)


class ConfirmIn(BaseModel):
    confirmed: bool = True


class GenerateIn(BaseModel):
    decision_id: int


@router.get("/me/execution-calendar")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return dcc.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/execution-calendar/requirements/from-decision", status_code=status.HTTP_201_CREATED)
def post_generate(
    body: GenerateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.generate_requirements_from_decision(
            db, candidate_id=cand.id, decision_id=body.decision_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/capacity")
def post_capacity(
    body: CapacityIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "capacity_profile": dcc.upsert_capacity_profile(
                db,
                candidate_id=cand.id,
                weekly_budget_minutes=body.weekly_budget_minutes,
                timezone_name=body.timezone_name,
                windows=body.windows,
                protected_focus=body.protected_focus,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/execution-calendar/capacity/compute")
def get_capacity_compute(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return dcc.compute_capacity(db, candidate_id=cand.id)


@router.post("/me/execution-calendar/availability/snapshots", status_code=status.HTTP_201_CREATED)
def post_snapshot(
    body: SnapshotIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "snapshot": dcc.create_availability_snapshot(
                db,
                candidate_id=cand.id,
                use_microsoft_busy=body.use_microsoft_busy,
                synthetic_busy=body.synthetic_busy,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/batches", status_code=status.HTTP_201_CREATED)
def post_batch(
    body: BatchProposeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.propose_commitment_batch(
            db, candidate_id=cand.id, snapshot_id=body.snapshot_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/batches/{batch_id}/propose")
def post_batch_propose(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.propose_batch_approval(db, candidate_id=cand.id, batch_id=batch_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/batches/{batch_id}/resolve")
def post_batch_resolve(
    batch_id: int,
    body: ResolveBatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.resolve_batch(
            db,
            candidate_id=cand.id,
            batch_id=batch_id,
            action=body.action,
            selected_item_ids=body.selected_item_ids,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/execution-calendar/batches/{batch_id}/ics")
def get_batch_ics(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.export_batch_ics(db, candidate_id=cand.id, batch_id=batch_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/items/{item_id}/progress")
def post_progress(
    item_id: int,
    body: ProgressIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "item": dcc.update_item_progress(
                db,
                candidate_id=cand.id,
                item_id=item_id,
                percent=body.percent,
                actual_effort_minutes=body.actual_effort_minutes,
                completed=body.completed,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/items/{item_id}/reschedule")
def post_reschedule(
    item_id: int,
    body: RescheduleIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.reschedule_item_internal(
            db,
            candidate_id=cand.id,
            item_id=item_id,
            starts_at=body.starts_at,
            ends_at=body.ends_at,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/items/{item_id}/confirm-external")
def post_confirm(
    item_id: int,
    body: ConfirmIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return dcc.confirm_external(
            db, candidate_id=cand.id, item_id=item_id, confirmed=body.confirmed
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-calendar/invalidate-evidence")
def post_invalidate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return dcc.invalidate_on_evidence_delete(db, candidate_id=cand.id)


@router.post("/me/execution-calendar/delete-history")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return dcc.delete_execution_history(db, candidate_id=cand.id)


@router.get("/me/execution-calendar/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return dcc.export_execution(db, candidate_id=cand.id)
