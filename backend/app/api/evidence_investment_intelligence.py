"""Evidence Investment Intelligence API — candidate-controlled career experimentation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import evidence_investment_intelligence as eii

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


class QuestionIn(BaseModel):
    title: str = Field(default="Investment question", max_length=300)
    body: dict | None = None


class GapIn(BaseModel):
    question_id: int | None = None
    gaps: list | None = None


class ExperimentIn(BaseModel):
    question_id: int | None = None
    gap_snapshot_id: int | None = None
    hypothesis: dict | None = None
    alternatives: list | None = None


class ProposeExperimentIn(BaseModel):
    selected_alternative_id: str = Field(max_length=64)


class SimulateIn(BaseModel):
    effort_minutes: int = Field(default=120, ge=1, le=10080)


class ReviewIn(BaseModel):
    decision: str = Field(default="pause", max_length=32)


class ObservationIn(BaseModel):
    kind: str = Field(default="execution", max_length=64)
    body: dict | None = None


class ArtifactIn(BaseModel):
    experiment_id: int | None = None
    title: str = Field(default="Artifact draft", max_length=300)
    ref: dict | None = None


class UsefulnessIn(BaseModel):
    experiment_id: int | None = None
    draft_id: int | None = None
    body: dict | None = None


class PolicyIn(BaseModel):
    body: dict | None = None


@router.get("/me/evidence-investment")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/evidence-investment/questions", status_code=status.HTTP_201_CREATED)
def post_question(
    body: QuestionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.create_investment_question(
            db, candidate_id=cand.id, title=body.title, body=body.body
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/gaps", status_code=status.HTTP_201_CREATED)
def post_gap(
    body: GapIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.create_gap_snapshot(
        db, candidate_id=cand.id, question_id=body.question_id, gaps=body.gaps
    )


@router.post("/me/evidence-investment/experiments", status_code=status.HTTP_201_CREATED)
def post_experiment(
    body: ExperimentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.create_experiment(
        db,
        candidate_id=cand.id,
        question_id=body.question_id,
        gap_snapshot_id=body.gap_snapshot_id,
        hypothesis=body.hypothesis,
        alternatives=body.alternatives,
    )


@router.post("/me/evidence-investment/experiments/{experiment_id}/simulate", status_code=status.HTTP_201_CREATED)
def post_simulate(
    experiment_id: int,
    body: SimulateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.simulate_effort(
            db,
            candidate_id=cand.id,
            experiment_id=experiment_id,
            effort_minutes=body.effort_minutes,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/experiments/{experiment_id}/propose", status_code=status.HTTP_201_CREATED)
def post_propose_experiment(
    experiment_id: int,
    body: ProposeExperimentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.propose_experiment(
            db,
            candidate_id=cand.id,
            experiment_id=experiment_id,
            selected_alternative_id=body.selected_alternative_id,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/experiments/{experiment_id}/resolve")
def post_resolve_experiment(
    experiment_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.resolve_experiment(
            db, candidate_id=cand.id, experiment_id=experiment_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/experiments/{experiment_id}/review")
def post_review_experiment(
    experiment_id: int,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.review_experiment(
            db, candidate_id=cand.id, experiment_id=experiment_id, decision=body.decision
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/experiments/{experiment_id}/observations", status_code=status.HTTP_201_CREATED)
def post_observation(
    experiment_id: int,
    body: ObservationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.record_observation(
        db,
        candidate_id=cand.id,
        experiment_id=experiment_id,
        kind=body.kind,
        body=body.body,
    )


@router.post("/me/evidence-investment/artifacts", status_code=status.HTTP_201_CREATED)
def post_artifact(
    body: ArtifactIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.create_artifact_draft(
        db,
        candidate_id=cand.id,
        experiment_id=body.experiment_id,
        title=body.title,
        ref=body.ref,
    )


@router.post("/me/evidence-investment/artifacts/{draft_id}/promote", status_code=status.HTTP_201_CREATED)
def post_promote(
    draft_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.propose_promotion(db, candidate_id=cand.id, draft_id=draft_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/promotions/{promotion_id}/resolve")
def post_resolve_promotion(
    promotion_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.resolve_promotion(
            db, candidate_id=cand.id, promotion_id=promotion_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/usefulness", status_code=status.HTTP_201_CREATED)
def post_usefulness(
    body: UsefulnessIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.record_usefulness(
        db,
        candidate_id=cand.id,
        experiment_id=body.experiment_id,
        draft_id=body.draft_id,
        body=body.body,
    )


@router.post("/me/evidence-investment/allocation/calibrate", status_code=status.HTTP_201_CREATED)
def post_allocation_calibrate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.propose_allocation_calibration(db, candidate_id=cand.id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/allocation/calibrations/{calibration_id}/resolve")
def post_allocation_resolve(
    calibration_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.resolve_allocation_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/allocation/calibrations/{calibration_id}/revert")
def post_allocation_revert(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.revert_allocation_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/policies", status_code=status.HTTP_201_CREATED)
def post_policy(
    body: PolicyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.upsert_allocation_policy(db, candidate_id=cand.id, body=body.body)


@router.post("/me/evidence-investment/policies/{policy_id}/simulate", status_code=status.HTTP_201_CREATED)
def post_policy_simulate(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.simulate_allocation_policy(db, candidate_id=cand.id, policy_id=policy_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/evidence-investment/policies/{policy_id}/resolve")
def post_policy_resolve(
    policy_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return eii.resolve_allocation_policy(
            db, candidate_id=cand.id, policy_id=policy_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/evidence-investment/health")
def get_health(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.investment_health(db, candidate_id=cand.id)


@router.get("/me/evidence-investment/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.export_investment(db, candidate_id=cand.id)


@router.post("/me/evidence-investment/delete-history")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return eii.delete_investment_history(db, candidate_id=cand.id)
