"""Candidate profile endpoints."""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Candidate, User
from app.database.session import get_db
from app.schemas.candidate import CandidateCreate, CandidateOut

router = APIRouter()


@router.post("/", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    if db.query(Candidate).filter(Candidate.user_id == user.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")
    candidate = Candidate(
        user_id=user.id,
        name=body.name,
        skills=json.dumps(body.skills),
        experience_years=body.experience_years,
        desired_salary=body.desired_salary,
        location=body.location,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


@router.get("/me", response_model=CandidateOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _to_out(candidate)


def _to_out(candidate: Candidate) -> CandidateOut:
    skills = json.loads(candidate.skills) if candidate.skills else []
    return CandidateOut(
        id=candidate.id,
        name=candidate.name,
        skills=skills,
        experience_years=candidate.experience_years,
        desired_salary=candidate.desired_salary,
        location=candidate.location,
    )
