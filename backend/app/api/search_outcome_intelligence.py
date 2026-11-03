"""Search Outcome Intelligence API — candidate-specific funnel + calibration."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import search_outcome_intelligence as soi

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


class LinkageIn(BaseModel):
    stage: str = Field(default="UNKNOWN", max_length=64)
    provenance: str = Field(default="CANDIDATE_DECLARED", max_length=64)
    strategy_id: int | None = None
    thesis_id: int | None = None
    opportunity_ref_id: int | None = None
    saved_search_ref_id: int | None = None
    watchlist_ref_id: int | None = None
    source_key: str | None = Field(default=None, max_length=64)
    experiment_id: int | None = None
    cycle_id: int | None = None
    studio_ref_id: int | None = None
    interview_ref_id: int | None = None
    outcome_ref_id: int | None = None
    refs: dict | None = None


class EventIn(BaseModel):
    linkage_id: int | None = None
    to_stage: str = Field(..., min_length=1, max_length=64)
    provenance: str = Field(default="CANDIDATE_DECLARED", max_length=64)
    payload: dict | None = None


class ResolveIn(BaseModel):
    approved: bool = True


class CalibrationIn(BaseModel):
    strategy_id: int | None = None
    rationale: str | None = Field(default=None, max_length=500)


class FeedbackIn(BaseModel):
    kind: str = Field(default="usefulness", max_length=64)
    body: dict | None = None
    linkage_id: int | None = None


class ReviewIn(BaseModel):
    cadence: str = Field(default="weekly", max_length=32)


@router.get("/me/search-outcomes")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.build_aggregate(db, candidate_id=cand.id)


@router.get("/me/search-outcomes/taxonomy")
def get_taxonomy(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _candidate(db, user)
    return soi.stage_taxonomy()


@router.post("/me/search-outcomes/linkages", status_code=status.HTTP_201_CREATED)
def post_linkage(
    body: LinkageIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {
        "linkage": soi.upsert_linkage(
            db,
            candidate_id=cand.id,
            stage=body.stage,
            provenance=body.provenance,
            strategy_id=body.strategy_id,
            thesis_id=body.thesis_id,
            opportunity_ref_id=body.opportunity_ref_id,
            saved_search_ref_id=body.saved_search_ref_id,
            watchlist_ref_id=body.watchlist_ref_id,
            source_key=body.source_key,
            experiment_id=body.experiment_id,
            cycle_id=body.cycle_id,
            studio_ref_id=body.studio_ref_id,
            interview_ref_id=body.interview_ref_id,
            outcome_ref_id=body.outcome_ref_id,
            refs=body.refs,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    }


@router.post("/me/search-outcomes/events", status_code=status.HTTP_201_CREATED)
def post_event(
    body: EventIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "event": soi.normalize_event(
                db,
                candidate_id=cand.id,
                linkage_id=body.linkage_id,
                to_stage=body.to_stage,
                provenance=body.provenance,
                payload=body.payload,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-outcomes/funnel/refresh")
def post_funnel(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"funnel": soi.compute_funnel(db, candidate_id=cand.id)}


@router.get("/me/search-outcomes/components")
def get_components(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.component_outcomes(db, candidate_id=cand.id)


@router.post("/me/search-outcomes/attribution")
def post_attribution(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.build_attribution(db, candidate_id=cand.id)


@router.get("/me/search-outcomes/conflicts")
def get_conflicts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.detect_attribution_conflicts(db, candidate_id=cand.id)


@router.get("/me/search-outcomes/evidence-gaps")
def get_evidence_gaps(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.evidence_gap_outcomes(db, candidate_id=cand.id)


@router.get("/me/search-outcomes/effort")
def get_effort(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.preparation_effort(db, candidate_id=cand.id)


@router.post("/me/search-outcomes/calibrations", status_code=status.HTTP_201_CREATED)
def post_calibration(
    body: CalibrationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "calibration": soi.propose_calibration(
                db,
                candidate_id=cand.id,
                strategy_id=body.strategy_id,
                rationale=body.rationale,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.get("/me/search-outcomes/calibrations/{calibration_id}/preview")
def get_preview(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return soi.preview_calibration(
            db, candidate_id=cand.id, calibration_id=calibration_id
        )
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-outcomes/calibrations/{calibration_id}/resolve")
def post_resolve(
    calibration_id: int,
    body: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "calibration": soi.resolve_calibration(
                db,
                candidate_id=cand.id,
                calibration_id=calibration_id,
                approved=body.approved,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-outcomes/calibrations/{calibration_id}/revert")
def post_revert(
    calibration_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "calibration": soi.revert_calibration(
                db, candidate_id=cand.id, calibration_id=calibration_id
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-outcomes/feedback", status_code=status.HTTP_201_CREATED)
def post_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return {
            "feedback": soi.add_feedback(
                db,
                candidate_id=cand.id,
                kind=body.kind,
                body=body.body,
                linkage_id=body.linkage_id,
            )
        }
    except ValueError as exc:
        raise _err(exc) from exc


@router.post("/me/search-outcomes/reviews", status_code=status.HTTP_201_CREATED)
def post_review(
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"review": soi.create_review(db, candidate_id=cand.id, cadence=body.cadence)}


@router.post("/me/search-outcomes/unknowns/resolve")
def post_unknowns(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.resolve_unknowns(db, candidate_id=cand.id)


@router.post("/me/search-outcomes/invalidate-evidence")
def post_invalidate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.invalidate_on_evidence_delete(db, candidate_id=cand.id)


@router.get("/me/search-outcomes/export")
def get_export(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.export_outcomes(db, candidate_id=cand.id)


@router.post("/me/search-outcomes/history/delete")
def post_delete(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return soi.delete_outcome_history(db, candidate_id=cand.id)
