"""Adaptive Execution Intelligence API — candidate-controlled estimation + capacity learning."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import adaptive_execution_intelligence as aei

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


class ResolveIn(BaseModel):
    action: str = Field(default="reject", max_length=32)


class PolicyIn(BaseModel):
    body: dict | None = None


class QualityIn(BaseModel):
    batch_id: int | None = None


class SnapshotBatchIn(BaseModel):
    batch_id: int


@router.get("/me/execution-intelligence")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/execution-intelligence/estimates/snapshot", status_code=status.HTTP_201_CREATED)
def post_snapshot(
    body: SnapshotBatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        snaps = aei.snapshot_estimates_for_batch(
            db, candidate_id=cand.id, batch_id=body.batch_id
        )
        return {"snapshots": snaps, "historic_batches_rewritten": False}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/estimates/calibrate", status_code=status.HTTP_201_CREATED)
def post_est_calibrate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.propose_estimate_calibration(db, candidate_id=cand.id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/estimates/calibrations/{calibration_id}/resolve")
def post_est_resolve(
    calibration_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.resolve_estimate_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/estimates/calibrations/{calibration_id}/revert")
def post_est_revert(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.revert_estimate_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/quality/analyze", status_code=status.HTTP_201_CREATED)
def post_quality(
    body: QualityIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.analyze_commitment_quality(db, candidate_id=cand.id, batch_id=body.batch_id)


@router.get("/me/execution-intelligence/postponements")
def get_postponements(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.analyze_postponements(db, candidate_id=cand.id)


@router.post("/me/execution-intelligence/capacity/calibrate", status_code=status.HTTP_201_CREATED)
def post_cap_calibrate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.propose_capacity_calibration(db, candidate_id=cand.id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/capacity/calibrations/{calibration_id}/resolve")
def post_cap_resolve(
    calibration_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.resolve_capacity_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/capacity/calibrations/{calibration_id}/revert")
def post_cap_revert(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.revert_capacity_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/execution-intelligence/policies", status_code=status.HTTP_201_CREATED)
def post_policy(
    body: PolicyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.upsert_execution_policy(db, candidate_id=cand.id, body=body.body)


@router.post("/me/execution-intelligence/policies/{policy_id}/simulate", status_code=status.HTTP_201_CREATED)
def post_simulate(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.simulate_execution_policy(db, candidate_id=cand.id, policy_id=policy_id)


@router.post("/me/execution-intelligence/policies/{policy_id}/resolve")
def post_policy_resolve(
    policy_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return aei.resolve_execution_policy(
            db, candidate_id=cand.id, policy_id=policy_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/execution-intelligence/health")
def get_health(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.health_overview(db, candidate_id=cand.id)


@router.get("/me/execution-intelligence/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.export_intelligence(db, candidate_id=cand.id)


@router.post("/me/execution-intelligence/delete-history")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return aei.delete_intelligence_history(db, candidate_id=cand.id)
