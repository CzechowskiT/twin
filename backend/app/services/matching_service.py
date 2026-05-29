"""Compute job–candidate match scores."""

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate, Job, JobMatch
from app.matching.matcher import calculate_match_score
from app.services.job_matching_v2 import calculate_match_score_v2, calculate_match_score_v2_tfidf
from app.matching.quality_gate import match_quality_label
from app.matching.ranking import (
    compute_final_score,
    dedupe_ranked_jobs,
    feed_dedupe_key,
    job_display_badges,
    source_display_label,
)
from app.services.job_match_feedback import (
    apply_intent_job_ids,
    excluded_feed_dedupe_keys,
    excluded_job_ids,
    not_now_job_ids,
    relevant_job_ids,
)
from app.services.market_coverage import apply_active_feed_filter
from app.services.match_reason import build_match_reason


def _json_list_field(raw: str | None) -> list[Any]:
    if not raw or not str(raw).strip():
        return []
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def candidate_to_dict(candidate: Candidate) -> dict[str, Any]:
    skills = _json_list_field(candidate.skills)
    titles = _json_list_field(candidate.preferred_job_titles)
    return {
        "skills": skills,
        "preferred_job_titles": titles,
        "experience_years": candidate.experience_years,
        "desired_salary": candidate.desired_salary,
        "location": candidate.location,
        "cv_text": candidate.cv_text,
    }


def job_to_dict(job: Job) -> dict[str, Any]:
    return {
        "title": job.title,
        "requirements": job.requirements,
        "description": job.description,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "location": job.location,
    }


def find_top_matches(
    db: Session,
    candidate: Candidate,
    *,
    limit: int = 10,
    min_score: float = 40.0,
    persist: bool = True,
    locale: str = "en",
) -> list[dict[str, Any]]:
    """Return best matching jobs for a candidate, optionally saved to job_matches."""
    cand = candidate_to_dict(candidate)
    settings = get_settings()
    scan_limit = max(50, min(50_000, int(settings.match_jobs_scan_limit)))
    if settings.matching_v2_tfidf:
        vb = settings.match_scoring_v2

        def score_fn(c: dict[str, Any], j: dict[str, Any]) -> float:
            return calculate_match_score_v2_tfidf(c, j, include_v2_salary_bonus=vb)

    elif settings.match_scoring_v2:
        score_fn = calculate_match_score_v2
    else:
        score_fn = calculate_match_score
    jobs = (
        apply_active_feed_filter(db.query(Job))
        .order_by(Job.scraped_at.desc())
        .limit(scan_limit)
        .all()
    )
    skip_jobs = excluded_job_ids(db, candidate.id)
    skip_dedupe_keys = excluded_feed_dedupe_keys(db, candidate.id)
    apply_boost = apply_intent_job_ids(db, candidate.id)
    relevant_boost = relevant_job_ids(db, candidate.id)
    not_now_penalty = not_now_job_ids(db, candidate.id)
    now = datetime.utcnow()
    scored: list[tuple[float, Job]] = []

    for job in jobs:
        if job.id in skip_jobs:
            continue
        if skip_dedupe_keys and feed_dedupe_key(job) in skip_dedupe_keys:
            continue
        fit = score_fn(cand, job_to_dict(job))
        final = compute_final_score(
            fit,
            job,
            candidate_location=candidate.location,
            apply_intent_ids=apply_boost,
            relevant_ids=relevant_boost,
            not_now_ids=not_now_penalty,
            now=now,
        )
        if final >= min_score:
            scored.append((final, job))

    scored = dedupe_ranked_jobs(scored)
    top = scored[:limit]
    results: list[dict[str, Any]] = []

    for score, job in top:
        jdict = job_to_dict(job)
        reason = build_match_reason(cand, jdict, score=score, locale=locale)
        if persist:
            _upsert_match(db, candidate.id, job.id, score, match_reason=reason)
        results.append(
            {
                "job_id": job.id,
                "score": score,
                "quality_label": match_quality_label(score),
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "url": job.url,
                "job_board": job.job_board,
                "source_label": source_display_label(job.job_board),
                "badges": job_display_badges(job, score, now=now),
                "match_reason": reason,
            }
        )

    if persist:
        db.commit()
        from app.services.product_notifications import maybe_send_first_match_after_match

        maybe_send_first_match_after_match(
            db, candidate_id=candidate.id, user_id=candidate.user_id
        )
    return results


def _upsert_match(
    db: Session,
    candidate_id: int,
    job_id: int,
    score: float,
    *,
    match_reason: str | None = None,
) -> None:
    row = (
        db.query(JobMatch)
        .filter(JobMatch.candidate_id == candidate_id, JobMatch.job_id == job_id)
        .first()
    )
    if row:
        row.score = score
        if match_reason:
            row.match_reason = match_reason
    else:
        db.add(
            JobMatch(
                candidate_id=candidate_id,
                job_id=job_id,
                score=score,
                match_reason=match_reason,
            ),
        )
