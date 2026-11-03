"""Career Transition, First 90 Days & Outcome Learning API — candidate-owned; no workplace monitoring."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_transition as ct

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


class TransitionIn(BaseModel):
    decision_id: int
    title: str | None = Field(default=None, max_length=300)


class OutcomeIn(BaseModel):
    outcome_type: str = Field(..., max_length=64)
    decision_id: int | None = None
    offer_id: int | None = None
    process_id: int | None = None
    transition_id: int | None = None
    application_id: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    prediction: dict[str, Any] = Field(default_factory=dict)


class ApprovePlanIn(BaseModel):
    approved: bool = True


class CheckinIn(BaseModel):
    period: str = Field(default="week_1", max_length=32)
    facts: dict[str, Any] = Field(default_factory=dict)
    interpretation: dict[str, Any] = Field(default_factory=dict)


class CalibrateIn(BaseModel):
    outcome_ids: list[int] | None = None


class GraphApproveIn(BaseModel):
    approved: bool = True


class RetroIn(BaseModel):
    kind: str = Field(default="decision", max_length=32)
    body: dict[str, Any] = Field(default_factory=dict)


class EvidenceLinkIn(BaseModel):
    evidence_ids: list[int] = Field(default_factory=list)


class SectionPatchIn(BaseModel):
    section: str = Field(..., max_length=64)
    value: Any = None


class PrivacyIn(BaseModel):
    learning_opt_in: bool | None = None
    reminders_opt_in: bool | None = None
    export_include_employer_notes: bool | None = None
    paused: bool | None = None


@router.get("/me/career-transition")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ct.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/career-transition/workspaces", status_code=status.HTTP_201_CREATED)
def post_workspace(
    body: TransitionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ct.create_transition(
            db,
            candidate_id=cand.id,
            decision_id=body.decision_id,
            title=body.title,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise _err(exc) from exc
    return {"transition": ct._ser_transition(row)}


@router.get("/me/career-transition/workspaces/{transition_id}")
def get_workspace(
    transition_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from app.database.models import CandidateTransitionCheckin, CandidateTransitionMilestone

    cand = _candidate(db, user)
    try:
        row = ct._workspace(db, candidate_id=cand.id, transition_id=transition_id)
    except ValueError as exc:
        raise _err(exc) from exc
    checkins = (
        db.query(CandidateTransitionCheckin)
        .filter_by(candidate_id=cand.id, transition_id=transition_id)
        .filter(CandidateTransitionCheckin.deleted_at.is_(None))
        .all()
    )
    milestones = (
        db.query(CandidateTransitionMilestone)
        .filter_by(candidate_id=cand.id, transition_id=transition_id)
        .filter(CandidateTransitionMilestone.deleted_at.is_(None))
        .all()
    )
    return {
        "transition": ct._ser_transition(row),
        "checkins": [ct._ser_checkin(c) for c in checkins],
        "milestones": [ct._ser_milestone(m) for m in milestones],
        "snapshot_integrity": ct.assert_snapshots_immutable(
            db, candidate_id=cand.id, transition_id=transition_id
        ),
    }


@router.get("/me/career-transition/workspaces/{transition_id}/snapshot-integrity")
def get_snapshot_integrity(
    transition_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.assert_snapshots_immutable(db, candidate_id=cand.id, transition_id=transition_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.patch("/me/career-transition/workspaces/{transition_id}/section")
def patch_section(
    transition_id: int,
    body: SectionPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.patch_workspace_section(
            db,
            candidate_id=cand.id,
            transition_id=transition_id,
            section=body.section,
            value=body.value,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-transition/workspaces/{transition_id}/plan-90/approve")
def approve_plan(
    transition_id: int,
    body: ApprovePlanIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.approve_plan_90(
            db, candidate_id=cand.id, transition_id=transition_id, approved=body.approved
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post(
    "/me/career-transition/workspaces/{transition_id}/checkins",
    status_code=status.HTTP_201_CREATED,
)
def post_checkin(
    transition_id: int,
    body: CheckinIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ct.add_checkin(
            db,
            candidate_id=cand.id,
            transition_id=transition_id,
            period=body.period,
            facts=body.facts,
            interpretation=body.interpretation,
        )
    except ValueError as exc:
        raise _err(exc) from exc
    return {"checkin": ct._ser_checkin(row)}


@router.post("/me/career-transition/outcomes", status_code=status.HTTP_201_CREATED)
def post_outcome(
    body: OutcomeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ct.register_outcome(
            db,
            candidate_id=cand.id,
            outcome_type=body.outcome_type,
            decision_id=body.decision_id,
            offer_id=body.offer_id,
            process_id=body.process_id,
            transition_id=body.transition_id,
            application_id=body.application_id,
            payload=body.payload,
            prediction=body.prediction,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise _err(exc) from exc
    return {"outcome": ct._ser_outcome(row)}


@router.get("/me/career-transition/outcomes/{outcome_id}/prediction-vs-outcome")
def get_prediction_vs(
    outcome_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.compare_prediction_outcome(db, candidate_id=cand.id, outcome_id=outcome_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/career-transition/recommendation-learning")
def get_rec_learning(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ct.recommendation_learning_view(db, candidate_id=cand.id)


@router.post("/me/career-transition/calibrate", status_code=status.HTTP_201_CREATED)
def post_calibrate(
    body: CalibrateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ct.calibrate_from_outcomes(
            db, candidate_id=cand.id, outcome_ids=body.outcome_ids
        )
    except ValueError as exc:
        raise _err(exc) from exc
    return {"calibration": ct._ser_calibration(row)}


@router.post("/me/career-transition/calibrate/{calibration_id}/revert")
def post_revert(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ct.revert_calibration(db, candidate_id=cand.id, calibration_id=calibration_id)
    except ValueError as exc:
        raise _err(exc) from exc
    return {"calibration": ct._ser_calibration(row)}


@router.post("/me/career-transition/workspaces/{transition_id}/graph/approve")
def post_graph_approve(
    transition_id: int,
    body: GraphApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.approve_graph_update(
            db, candidate_id=cand.id, transition_id=transition_id, approved=body.approved
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-transition/workspaces/{transition_id}/retrospective")
def post_retro(
    transition_id: int,
    body: RetroIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.add_retrospective(
            db,
            candidate_id=cand.id,
            transition_id=transition_id,
            kind=body.kind,
            body=body.body,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post(
    "/me/career-transition/workspaces/{transition_id}/milestones/{milestone_id}/evidence"
)
def post_milestone_evidence(
    transition_id: int,
    milestone_id: int,
    body: EvidenceLinkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.capture_evidence_link(
            db,
            candidate_id=cand.id,
            transition_id=transition_id,
            milestone_id=milestone_id,
            evidence_ids=body.evidence_ids,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/career-transition/workspaces/{transition_id}/export")
def get_export(
    transition_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.export_transition(db, candidate_id=cand.id, transition_id=transition_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/career-transition/workspaces/{transition_id}/delete")
def post_delete(
    transition_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return ct.delete_transition(db, candidate_id=cand.id, transition_id=transition_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/career-transition/confidence-history")
def get_confidence(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ct.confidence_history(db, candidate_id=cand.id)


@router.patch("/me/career-transition/privacy")
def patch_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ct.update_privacy(
        db,
        candidate_id=cand.id,
        learning_opt_in=body.learning_opt_in,
        reminders_opt_in=body.reminders_opt_in,
        export_include_employer_notes=body.export_include_employer_notes,
        paused=body.paused,
    )
    return {
        "learning_opt_in": row.learning_opt_in,
        "reminders_opt_in": row.reminders_opt_in,
        "export_include_employer_notes": row.export_include_employer_notes,
        "paused": row.paused,
        "version": row.version,
    }
