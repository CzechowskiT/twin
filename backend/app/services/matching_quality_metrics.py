"""Founder / ops metrics for matching quality gate."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Candidate, JobMatch, JobMatchFeedback
from app.matching.quality_gate import DASHBOARD_MATCH_MIN_SCORE, MAIN_RECOMMENDATION_MIN_SCORE


def build_matching_quality_metrics(db: Session) -> dict:
    """Aggregate feedback and match-score signals for founding cohort review."""
    now = datetime.utcnow()
    feedback_total = db.query(func.count(JobMatchFeedback.id)).scalar() or 0
    apply_intent_count = (
        db.query(func.count(JobMatchFeedback.id))
        .filter(JobMatchFeedback.feedback_value == "apply_intent")
        .scalar()
        or 0
    )
    relevant_count = (
        db.query(func.count(JobMatchFeedback.id))
        .filter(JobMatchFeedback.feedback_value == "relevant")
        .scalar()
        or 0
    )
    not_relevant_count = (
        db.query(func.count(JobMatchFeedback.id))
        .filter(JobMatchFeedback.feedback_value == "not_relevant")
        .scalar()
        or 0
    )
    not_now_count = (
        db.query(func.count(JobMatchFeedback.id))
        .filter(JobMatchFeedback.feedback_value == "not_now")
        .scalar()
        or 0
    )
    positive = apply_intent_count + relevant_count
    negative = not_relevant_count
    denom = positive + negative
    relevant_rate = round(100.0 * positive / denom, 1) if denom else None
    apply_intent_rate = (
        round(100.0 * apply_intent_count / feedback_total, 1) if feedback_total else None
    )

    candidates_with_profile = db.query(func.count(Candidate.id)).scalar() or 0
    empty_match_results_count = 0
    median_top_10_score = None
    top_scores: list[float] = []
    for candidate in db.query(Candidate).limit(500).all():
        rows = (
            db.query(JobMatch.score)
            .filter(
                JobMatch.candidate_id == candidate.id,
                JobMatch.score >= MAIN_RECOMMENDATION_MIN_SCORE,
            )
            .order_by(JobMatch.score.desc())
            .limit(10)
            .all()
        )
        scores = [float(r[0]) for r in rows]
        if not scores:
            empty_match_results_count += 1
        else:
            top_scores.extend(scores[:10])
    if top_scores:
        sorted_scores = sorted(top_scores)
        mid = len(sorted_scores) // 2
        median_top_10_score = (
            sorted_scores[mid]
            if len(sorted_scores) % 2
            else (sorted_scores[mid - 1] + sorted_scores[mid]) / 2.0
        )
        median_top_10_score = round(median_top_10_score, 1)

    strong_matches = (
        db.query(func.count(JobMatch.id))
        .filter(JobMatch.score >= DASHBOARD_MATCH_MIN_SCORE)
        .scalar()
        or 0
    )

    return {
        "top_10_jobs_shown": min(10, strong_matches),
        "apply_intent_count": apply_intent_count,
        "relevant_count": relevant_count,
        "not_relevant_count": not_relevant_count,
        "not_now_count": not_now_count,
        "feedback_total": feedback_total,
        "relevant_rate_pct": relevant_rate,
        "apply_intent_rate_pct": apply_intent_rate,
        "median_top_10_score": median_top_10_score,
        "empty_match_results_count": empty_match_results_count,
        "candidates_with_profile": candidates_with_profile,
        "strong_matches_persisted": strong_matches,
        "dashboard_min_score": DASHBOARD_MATCH_MIN_SCORE,
        "generated_at": now.isoformat() + "Z",
    }
