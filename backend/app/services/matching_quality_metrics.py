"""Founder / ops metrics for matching quality gate."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Candidate, Job, JobMatch, JobMatchFeedback
from app.matching.quality_gate import (
    DASHBOARD_MATCH_LIMIT,
    DASHBOARD_MATCH_MIN_SCORE,
    TOP_MATCHES_HIGHLIGHT_COUNT,
)
from app.matching.ranking import feed_dedupe_key
from app.services.matching_service import find_top_matches


def _median(values: list[float]) -> float | None:
    if not values:
        return None
    sorted_vals = sorted(values)
    mid = len(sorted_vals) // 2
    if len(sorted_vals) % 2:
        return round(sorted_vals[mid], 1)
    return round((sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0, 1)


def build_matching_quality_metrics(db: Session) -> dict:
    """Aggregate feedback, corpus, and top-200 ranking signals."""
    now = datetime.utcnow()
    fresh_24h = now - timedelta(hours=24)
    fresh_7d = now - timedelta(days=7)

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

    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    validated_jobs = (
        db.query(func.count(Job.id)).filter(Job.is_validated.is_(True)).scalar() or 0
    )
    fresh_24h_count = (
        db.query(func.count(Job.id))
        .filter(Job.is_validated.is_(True), Job.scraped_at >= fresh_24h)
        .scalar()
        or 0
    )
    fresh_7d_count = (
        db.query(func.count(Job.id))
        .filter(Job.is_validated.is_(True), Job.scraped_at >= fresh_7d)
        .scalar()
        or 0
    )

    by_source_rows = (
        db.query(Job.job_board, func.count(Job.id))
        .filter(Job.is_validated.is_(True))
        .group_by(Job.job_board)
        .all()
    )
    total_jobs_by_source = {str(board): int(cnt) for board, cnt in by_source_rows}

    candidates_with_profile = db.query(func.count(Candidate.id)).scalar() or 0
    empty_match_results_count = 0
    median_top_10_score = None
    top_scores: list[float] = []
    top_200_feed_sizes: list[float] = []
    per_candidate_top200_medians: list[float] = []
    apply_intent_top20 = 0
    apply_intent_top200 = 0
    feedback_by_candidate: dict[int, dict[int, str]] = {}

    for row in db.query(JobMatchFeedback).all():
        feedback_by_candidate.setdefault(row.candidate_id, {})[row.job_id] = row.feedback_value

    for candidate in db.query(Candidate).limit(500).all():
        rows = find_top_matches(
            db,
            candidate,
            limit=DASHBOARD_MATCH_LIMIT,
            min_score=DASHBOARD_MATCH_MIN_SCORE,
            persist=False,
        )
        scores = [float(r["score"]) for r in rows]
        top_200_feed_sizes.append(float(len(scores)))
        if not scores:
            empty_match_results_count += 1
        else:
            top_scores.extend(scores[:10])
            med = _median(scores)
            if med is not None:
                per_candidate_top200_medians.append(med)
        fb = feedback_by_candidate.get(candidate.id, {})
        for idx, r in enumerate(rows):
            if fb.get(r["job_id"]) == "apply_intent":
                apply_intent_top200 += 1
                if idx < TOP_MATCHES_HIGHLIGHT_COUNT:
                    apply_intent_top20 += 1

    if top_scores:
        median_top_10_score = _median(top_scores)

    median_top_200_score = _median(per_candidate_top200_medians)
    median_top_200_count = _median(top_200_feed_sizes)

    dup_keys: set[str] = set()
    duplicate_collisions = 0
    for job in db.query(Job).filter(Job.is_validated.is_(True)).limit(5000).all():
        key = feed_dedupe_key(job)
        if key in dup_keys:
            duplicate_collisions += 1
        dup_keys.add(key)
    duplicate_rate_pct = (
        round(100.0 * duplicate_collisions / max(1, validated_jobs), 2) if validated_jobs else None
    )

    strong_matches = (
        db.query(func.count(JobMatch.id))
        .filter(JobMatch.score >= DASHBOARD_MATCH_MIN_SCORE)
        .scalar()
        or 0
    )

    return {
        "top_10_jobs_shown": TOP_MATCHES_HIGHLIGHT_COUNT,
        "top_200_limit": DASHBOARD_MATCH_LIMIT,
        "apply_intent_count": apply_intent_count,
        "relevant_count": relevant_count,
        "not_relevant_count": not_relevant_count,
        "not_now_count": not_now_count,
        "feedback_total": feedback_total,
        "relevant_rate_pct": relevant_rate,
        "apply_intent_rate_pct": apply_intent_rate,
        "apply_intent_in_top_20": apply_intent_top20,
        "apply_intent_in_top_200": apply_intent_top200,
        "median_top_10_score": median_top_10_score,
        "median_top_200_count": median_top_200_count,
        "median_top_200_score": median_top_200_score,
        "empty_match_results_count": empty_match_results_count,
        "candidates_with_profile": candidates_with_profile,
        "strong_matches_persisted": strong_matches,
        "dashboard_min_score": DASHBOARD_MATCH_MIN_SCORE,
        "total_jobs": total_jobs,
        "validated_jobs": validated_jobs,
        "total_jobs_by_source": total_jobs_by_source,
        "fresh_jobs_24h": fresh_24h_count,
        "fresh_jobs_7d": fresh_7d_count,
        "duplicate_rate_pct": duplicate_rate_pct,
        "generated_at": now.isoformat() + "Z",
    }
