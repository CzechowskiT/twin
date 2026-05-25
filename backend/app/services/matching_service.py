"""Compute job–candidate match scores."""

import json
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate, Job, JobMatch
from app.matching.matcher import calculate_match_score
from app.services.job_matching_v2 import calculate_match_score_v2, calculate_match_score_v2_tfidf
from app.matching.quality_gate import (
    APPLY_INTENT_SCORE_BOOST,
    match_quality_label,
)
from app.services.job_match_feedback import apply_intent_job_ids, excluded_job_ids
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
        db.query(Job)
        .filter(Job.is_validated.is_(True))
        .order_by(Job.scraped_at.desc())
        .limit(scan_limit)
        .all()
    )
    skip_jobs = excluded_job_ids(db, candidate.id)
    boost_jobs = apply_intent_job_ids(db, candidate.id)
    scored: list[tuple[float, Job]] = []

    for job in jobs:
        if job.id in skip_jobs:
            continue
        score = score_fn(cand, job_to_dict(job))
        if job.id in boost_jobs:
            score = min(100.0, score + APPLY_INTENT_SCORE_BOOST)
        if score >= min_score:
            scored.append((score, job))

    scored.sort(key=lambda x: x[0], reverse=True)
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
