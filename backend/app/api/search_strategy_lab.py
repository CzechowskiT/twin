"""Search Strategy Lab / Career Market Radar API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import search_strategy_lab as lab

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


class StrategyIn(BaseModel):
    title: str = Field(default="Search strategy", max_length=300)
    target_role: str | None = Field(default=None, max_length=200)


class ResolveIn(BaseModel):
    approved: bool = True


class ThesisIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    body: dict | None = None


class ExperimentIn(BaseModel):
    hypothesis: str = Field(..., min_length=1, max_length=500)


class ObservationIn(BaseModel):
    observation: str | None = Field(default=None, max_length=500)


class ReviewIn(BaseModel):
    cadence: str = Field(default="weekly", max_length=32)


class ReviewApproveIn(BaseModel):
    changes: list[dict] | None = None


class ThesisStatusIn(BaseModel):
    status: str = Field(..., min_length=1, max_length=32)


class AllocationIn(BaseModel):
    allocations: list[dict] = Field(default_factory=list)
    candidate_approved_concentration: bool = False


class GapInvestmentIn(BaseModel):
    gap_key: str | None = Field(default=None, max_length=160)


@router.get("/me/search-strategy")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return lab.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/search-strategy", status_code=status.HTTP_201_CREATED)
def post_strategy(
    body: StrategyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {
        "strategy": lab.create_strategy(
            db,
            candidate_id=cand.id,
            title=body.title,
            target_role=body.target_role,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    }


@router.post("/me/search-strategy/{strategy_id}/propose-activate")
def post_propose_activate(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.propose_activate_strategy(
            db, candidate_id=cand.id, strategy_id=strategy_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/resolve-activate")
def post_resolve_activate(
    strategy_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.resolve_strategy_activation(
            db, candidate_id=cand.id, strategy_id=strategy_id, approved=body.approved
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/thesis", status_code=status.HTTP_201_CREATED)
def post_thesis(
    strategy_id: int,
    body: ThesisIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "thesis": lab.upsert_role_thesis(
                db,
                candidate_id=cand.id,
                strategy_id=strategy_id,
                title=body.title,
                body=body.body,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/coverage")
def post_coverage(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    lab._strategy(db, candidate_id=cand.id, strategy_id=strategy_id)
    return {"coverage": lab.build_source_coverage(db, candidate_id=cand.id)}


@router.post("/me/search-strategy/{strategy_id}/gaps")
def post_gaps(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.observe_gaps(db, candidate_id=cand.id, strategy_id=strategy_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/gap-investment")
def post_gap_investment(
    strategy_id: int,
    body: GapInvestmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.decide_gap_investment(
            db, candidate_id=cand.id, strategy_id=strategy_id, gap_key=body.gap_key
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/theses/{thesis_id}/status")
def post_thesis_status(
    thesis_id: int,
    body: ThesisStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "thesis": lab.set_thesis_status(
                db, candidate_id=cand.id, thesis_id=thesis_id, status=body.status
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/allocation")
def post_allocation(
    strategy_id: int,
    body: AllocationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.update_allocation(
            db,
            candidate_id=cand.id,
            strategy_id=strategy_id,
            allocations=body.allocations,
            candidate_approved_concentration=body.candidate_approved_concentration,
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/search-strategy/{strategy_id}/conflicts")
def get_conflicts(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.detect_strategy_conflicts(
            db, candidate_id=cand.id, strategy_id=strategy_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/portfolio/refresh")
def post_portfolio_refresh(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return lab.refresh_portfolio(db, candidate_id=cand.id, strategy_id=strategy_id)
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/simulate")
def post_simulate(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"simulation": lab.simulate_strategy(db, candidate_id=cand.id, strategy_id=strategy_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/experiments", status_code=status.HTTP_201_CREATED)
def post_experiment(
    strategy_id: int,
    body: ExperimentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "experiment": lab.create_experiment(
                db, candidate_id=cand.id, strategy_id=strategy_id, hypothesis=body.hypothesis
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/experiments/{experiment_id}/complete")
def post_experiment_complete(
    experiment_id: int,
    body: ObservationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "experiment": lab.complete_experiment(
                db,
                candidate_id=cand.id,
                experiment_id=experiment_id,
                observation=body.observation,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/experiments/{experiment_id}/pause")
def post_experiment_pause(
    experiment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "experiment": lab.pause_experiment(
                db, candidate_id=cand.id, experiment_id=experiment_id
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/experiments/{experiment_id}/resume")
def post_experiment_resume(
    experiment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "experiment": lab.resume_experiment(
                db, candidate_id=cand.id, experiment_id=experiment_id
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/reviews", status_code=status.HTTP_201_CREATED)
def post_review(
    strategy_id: int,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "review": lab.create_review(
                db, candidate_id=cand.id, strategy_id=strategy_id, cadence=body.cadence
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/reviews/{review_id}/approve")
def post_review_approve(
    review_id: int,
    body: ReviewApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "review": lab.approve_review_changes(
                db, candidate_id=cand.id, review_id=review_id, changes=body.changes
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/cycles/{cycle_id}/archive")
def post_archive_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"cycle": lab.archive_cycle(db, candidate_id=cand.id, cycle_id=cycle_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/cycles/{cycle_id}/pause")
def post_pause_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"cycle": lab.pause_cycle(db, candidate_id=cand.id, cycle_id=cycle_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/cycles/{cycle_id}/resume")
def post_resume_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"cycle": lab.resume_cycle(db, candidate_id=cand.id, cycle_id=cycle_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/{strategy_id}/cycles/restart")
def post_restart_cycle(
    strategy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {"cycle": lab.restart_cycle(db, candidate_id=cand.id, strategy_id=strategy_id)}
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-strategy/invalidate-theses")
def post_invalidate_theses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return lab.invalidate_theses_on_evidence_delete(db, candidate_id=cand.id)


@router.get("/me/search-strategy/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return lab.export_search_strategy(db, candidate_id=cand.id)


@router.post("/me/search-strategy/history/delete")
def post_delete_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return lab.delete_search_strategy_history(db, candidate_id=cand.id)
