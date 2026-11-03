"""AI Interview Coach API — practice questions + answer evaluation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.subscription_gates import Feature, feature_allowed, paywall_for_feature
from app.database.models import Job, User
from app.database.session import get_db
from app.limiter import limiter, user_or_ip_key
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
@limiter.limit("60/minute", key_func=user_or_ip_key)
def post_generate_questions(
    request: Request,
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
        source_label=data.get("source_label"),
    )


@router.post("/evaluate-answer", response_model=EvaluateAnswerOut)
@limiter.limit("60/minute", key_func=user_or_ip_key)
def post_evaluate_answer(
    request: Request,
    body: EvaluateAnswerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluateAnswerOut:
    """Evaluate a practice answer — never invent a 0–100 score when AI is unavailable."""
    _require_coach_access(current_user)
    job = _load_job(db, body.job_id)
    data = evaluate_answer(
        job,
        body.question,
        body.answer,
        allow_deterministic_heuristics=body.allow_deterministic_heuristics,
    )
    raw_score = data.get("score")
    score: int | None
    if raw_score is None:
        score = None
    else:
        try:
            score = int(raw_score)
        except (TypeError, ValueError):
            score = None
    return EvaluateAnswerOut(
        evaluation_status=str(data.get("evaluation_status") or "EVALUATION_UNAVAILABLE"),
        score=score,
        score_available=bool(data.get("score_available")) and score is not None,
        criteria=list(data.get("criteria") or []),
        strengths=list(data.get("strengths") or []),
        improvements=list(data.get("improvements") or []),
        sample_better_answer=data.get("sample_better_answer"),
        source=str(data.get("source") or "fallback"),
        source_label=data.get("source_label"),
        degraded=bool(data.get("degraded")),
        legacy_score_ignored=data.get("legacy_score_ignored"),
    )
