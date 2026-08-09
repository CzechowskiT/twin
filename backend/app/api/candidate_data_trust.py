"""Epic 2.15 API — candidate data trust / reconciliation (auth required)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import candidate_data_trust as cdt

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


class ResolveQuestionIn(BaseModel):
    resolution_action: str = Field(min_length=3, max_length=32)


class ResolveReviewIn(BaseModel):
    action: str = Field(min_length=3, max_length=16)


@router.get("/me/data-trust/catalog")
def data_trust_catalog(
    response: Response,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    _no_store(response)
    return cdt.catalog()


@router.get("/me/data-trust/coverage")
def data_trust_coverage(
    response: Response,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    _no_store(response)
    return cdt.coverage_matrix()


@router.get("/me/data-trust/reviews")
def list_reviews(
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    return cdt.list_reviews(db, candidate_id=cand.id)


@router.get("/me/data-trust/reviews/{review_key}")
def get_review(
    review_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.get_review(db, candidate_id=cand.id, review_key=review_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="review_not_found") from None


@router.post("/me/data-trust/reviews/{review_key}/questions/{question_key}/resolve")
def resolve_question(
    review_key: str,
    question_key: str,
    body: ResolveQuestionIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.resolve_question(
            db,
            candidate_id=cand.id,
            review_key=review_key,
            question_key=question_key,
            resolution_action=body.resolution_action.strip().upper(),
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="question_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/data-trust/reviews/{review_key}/impact-preview")
def impact_preview(
    review_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.build_impact_preview(db, candidate_id=cand.id, review_key=review_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="review_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/data-trust/reviews/{review_key}/propose")
def propose(
    review_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.propose_change_set(db, candidate_id=cand.id, review_key=review_key)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="review_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/data-trust/reviews/{review_key}/resolve")
def resolve_review(
    review_key: str,
    body: ResolveReviewIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.resolve_review(
            db,
            candidate_id=cand.id,
            review_key=review_key,
            action=body.action.strip().lower(),
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="review_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None


@router.post("/me/data-trust/change-sets/{change_set_key}/undo")
def undo_change_set(
    change_set_key: str,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _no_store(response)
    cand = _candidate(db, user)
    try:
        return cdt.undo_change_set(
            db, candidate_id=cand.id, change_set_key=change_set_key
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="change_set_not_found") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from None
