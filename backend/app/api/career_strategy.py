"""Outcome-calibrated strategy + candidate-controlled internal execution API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_strategy as strat

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


class CalibrateIn(BaseModel):
    transition_cal_id: int | None = None


class ResolveIn(BaseModel):
    approved: bool = True


class PlanIn(BaseModel):
    title: str = Field(default="Internal strategy plan", max_length=300)
    idempotency_key: str | None = Field(default=None, max_length=160)


class DeleteIn(BaseModel):
    preview_only: bool = False


class PrivacyRevokeIn(BaseModel):
    scopes: list[str] | None = None


class AcalIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    deep_link: str = Field(default="/dashboard", max_length=300)


class PlanControlIn(BaseModel):
    action: str = Field(..., min_length=3, max_length=32)


class FeedbackIn(BaseModel):
    feedback: str = Field(..., min_length=2, max_length=64)
    ranking_snapshot_id: int | None = None
    item_id: str | None = None


@router.get("/me/career-strategy")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return strat.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/career-strategy/ranking/refresh", status_code=status.HTTP_201_CREATED)
def post_ranking(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    snap = strat.build_ranking(
        db,
        candidate_id=cand.id,
        is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
    )
    push = strat._push_ranking_to_daily_os(db, candidate_id=cand.id, snap=snap)
    return {"ranking": strat._ser_ranking(snap), "daily_os": push}


@router.post("/me/career-strategy/calibration/propose", status_code=status.HTTP_201_CREATED)
def post_cal_propose(
    body: CalibrateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "proposal": strat.propose_calibration_merge(
                db, candidate_id=cand.id, transition_cal_id=body.transition_cal_id
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/calibration/{proposal_id}/resolve")
def post_cal_resolve(
    proposal_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "proposal": strat.resolve_calibration_proposal(
                db, candidate_id=cand.id, proposal_id=proposal_id, approved=body.approved
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/plans", status_code=status.HTTP_201_CREATED)
def post_plan(
    body: PlanIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return strat.create_execution_plan(
        db,
        candidate_id=cand.id,
        title=body.title,
        idempotency_key=body.idempotency_key,
        is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
    )


@router.post("/me/career-strategy/plans/{plan_id}/run")
def post_plan_run(
    plan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return strat.run_execution_plan(db, candidate_id=cand.id, plan_id=plan_id, resume=False)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/plans/{plan_id}/control")
def post_plan_control(
    plan_id: int,
    body: PlanControlIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return strat.control_execution_plan(
            db, candidate_id=cand.id, plan_id=plan_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/calibration/{proposal_id}/revert")
def post_cal_revert(
    proposal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "proposal": strat.revert_calibration(
                db, candidate_id=cand.id, proposal_id=proposal_id
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/feedback")
def post_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return strat.record_recommendation_feedback(
            db,
            candidate_id=cand.id,
            ranking_snapshot_id=body.ranking_snapshot_id,
            feedback=body.feedback,
            item_id=body.item_id,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-strategy/invalidate-stale")
def post_invalidate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return strat.invalidate_stale(db, candidate_id=cand.id)


@router.post("/me/career-strategy/deletion/run")
def post_deletion(
    body: DeleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"job": strat.run_deletion_job(db, candidate_id=cand.id, preview_only=body.preview_only)}


@router.post("/me/career-strategy/privacy/revoke")
def post_privacy_revoke(
    body: PrivacyRevokeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"job": strat.run_privacy_revocation(db, candidate_id=cand.id, scopes=body.scopes)}


@router.post("/me/career-strategy/simulate")
def post_simulate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"simulation": strat.simulate_strategy(db, candidate_id=cand.id)}


@router.post("/me/career-strategy/acal/approved-commitment")
def post_acal(
    body: AcalIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return strat.push_approved_acal_commitment(
        db, candidate_id=cand.id, title=body.title, deep_link=body.deep_link
    )
