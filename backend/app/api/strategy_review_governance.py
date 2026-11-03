"""Strategy Review + Decision Governance API — candidate-controlled."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import strategy_review_governance as srg

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


class ReviewIn(BaseModel):
    cadence: str = Field(default="weekly", max_length=32)
    strategy_id: int | None = None
    title: str | None = Field(default=None, max_length=300)


class AssumptionIn(BaseModel):
    statement: str = Field(..., min_length=1, max_length=500)


class AssumptionEvalIn(BaseModel):
    result: str = Field(default="inconclusive", max_length=32)


class DecisionIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    review_id: int | None = None
    supporting: list[dict] | None = None
    contradicting: list[dict] | None = None
    unknowns: list[dict] | None = None
    alternatives: list[dict] | None = None
    counterfactuals: list[dict] | None = None
    rationale: str | None = Field(default=None, max_length=500)


class ProposeIn(BaseModel):
    chosen_alternative_id: str = Field(..., min_length=1, max_length=64)


class ResolveIn(BaseModel):
    action: str = Field(default="reject", max_length=32)


class FollowupIn(BaseModel):
    kind: str = Field(default="observe", max_length=64)
    body: dict | None = None


class ReviseIn(BaseModel):
    rationale: str | None = Field(default=None, max_length=500)


class CompareIn(BaseModel):
    left_id: int
    right_id: int


@router.get("/me/strategy-reviews")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/strategy-reviews/sessions", status_code=status.HTTP_201_CREATED)
def post_session(
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "review": srg.create_review_session(
                db,
                candidate_id=cand.id,
                cadence=body.cadence,
                strategy_id=body.strategy_id,
                title=body.title,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/sessions/{review_id}/finalize")
def post_finalize(
    review_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"review": srg.finalize_review(db, candidate_id=cand.id, review_id=review_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/sessions/{review_id}/archive")
def post_archive(
    review_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"review": srg.archive_review(db, candidate_id=cand.id, review_id=review_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/compare")
def post_compare(
    body: CompareIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return srg.compare_reviews(
            db, candidate_id=cand.id, left_id=body.left_id, right_id=body.right_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/clusters/refresh")
def post_clusters(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.compute_cluster_outcomes(db, candidate_id=cand.id)


@router.get("/me/strategy-reviews/clusters/compare")
def get_cluster_compare(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.compare_clusters(db, candidate_id=cand.id)


@router.get("/me/strategy-reviews/components")
def get_components(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.component_reviews(db, candidate_id=cand.id)


@router.post("/me/strategy-reviews/assumptions", status_code=status.HTTP_201_CREATED)
def post_assumption(
    body: AssumptionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"assumption": srg.upsert_assumption(db, candidate_id=cand.id, statement=body.statement)}


@router.post("/me/strategy-reviews/assumptions/{assumption_id}/evaluate")
def post_assumption_eval(
    assumption_id: int,
    body: AssumptionEvalIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "assumption": srg.evaluate_assumption(
                db, candidate_id=cand.id, assumption_id=assumption_id, result=body.result
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions", status_code=status.HTTP_201_CREATED)
def post_decision(
    body: DecisionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "decision": srg.create_decision(
                db,
                candidate_id=cand.id,
                question=body.question,
                review_id=body.review_id,
                supporting=body.supporting,
                contradicting=body.contradicting,
                unknowns=body.unknowns,
                alternatives=body.alternatives,
                counterfactuals=body.counterfactuals,
                rationale=body.rationale,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/propose")
def post_propose(
    decision_id: int,
    body: ProposeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return srg.propose_decision_approval(
            db,
            candidate_id=cand.id,
            decision_id=decision_id,
            chosen_alternative_id=body.chosen_alternative_id,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/resolve")
def post_resolve(
    decision_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return srg.resolve_decision(
            db, candidate_id=cand.id, decision_id=decision_id, action=body.action
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/followups", status_code=status.HTTP_201_CREATED)
def post_followup(
    decision_id: int,
    body: FollowupIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "followup": srg.add_followup(
                db,
                candidate_id=cand.id,
                decision_id=decision_id,
                kind=body.kind,
                body=body.body,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/reconfirm")
def post_reconfirm(
    decision_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"decision": srg.reconfirm_decision(db, candidate_id=cand.id, decision_id=decision_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/revise")
def post_revise(
    decision_id: int,
    body: ReviseIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "decision": srg.revise_decision(
                db, candidate_id=cand.id, decision_id=decision_id, rationale=body.rationale
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/decisions/{decision_id}/revert")
def post_revert(
    decision_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return srg.revert_decision(db, candidate_id=cand.id, decision_id=decision_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/strategy-reviews/invalidate-evidence")
def post_invalidate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.invalidate_on_evidence_delete(db, candidate_id=cand.id)


@router.post("/me/strategy-reviews/delete-history")
def post_delete_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.delete_review_decision_history(db, candidate_id=cand.id)


@router.get("/me/strategy-reviews/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return srg.export_review_decisions(db, candidate_id=cand.id)
