"""AI Interview Coach API — practice questions + answer evaluation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.subscription_gates import Feature, feature_allowed, paywall_for_feature
from app.database.models import Job, User
from app.database.session import get_db
from app.schemas.interview_coach import (
    EvaluateAnswerIn,
    EvaluateAnswerOut,
    InterviewQuestionsIn,
    InterviewQuestionsOut,
)
from app.services.ai_interview_coach import evaluate_answer, generate_practice_questions
from app.services.career_assistant_common import get_candidate_for_user
from app.services.gamification import record_activity

router = APIRouter()


def _require_coach_access(user: User) -> None:
    if not feature_allowed(user, Feature.AI_INTERVIEW_COACH):
        meta = paywall_for_feature(Feature.AI_INTERVIEW_COACH)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "Premium required for AI Interview Coach", "paywall": meta},
        )


def _load_job(db: Session, job_id: int) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.post("/generate-questions", response_model=InterviewQuestionsOut)
def post_generate_questions(
    body: InterviewQuestionsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewQuestionsOut:
    """Generate role-specific practice questions."""
    _require_coach_access(current_user)
    candidate = get_candidate_for_user(db, current_user.id)
    job = _load_job(db, body.job_id)
    data = generate_practice_questions(job, candidate.cv_text or "")
    record_activity(db, candidate, event="interview_prep")
    return InterviewQuestionsOut(
        questions=data.get("questions") or [],
        tips=data.get("tips") or [],
        source=str(data.get("source") or "fallback"),
    )


@router.post("/evaluate-answer", response_model=EvaluateAnswerOut)
def post_evaluate_answer(
    body: EvaluateAnswerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluateAnswerOut:
    """Evaluate a practice answer with AI or deterministic fallback."""
    _require_coach_access(current_user)
    job = _load_job(db, body.job_id)
    data = evaluate_answer(job, body.question, body.answer)
    return EvaluateAnswerOut(
        score=int(data.get("score") or 0),
        strengths=list(data.get("strengths") or []),
        improvements=list(data.get("improvements") or []),
        sample_better_answer=data.get("sample_better_answer"),
        source=str(data.get("source") or "fallback"),
    )
