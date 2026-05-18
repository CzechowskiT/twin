"""Compute job–candidate match scores."""

import json
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate, Job, JobMatch
from app.matching.matcher import calculate_match_score
from app.services.job_matching_v2 import calculate_match_score_v2


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
) -> list[dict[str, Any]]:
    """Return best matching jobs for a candidate, optionally saved to job_matches."""
    cand = candidate_to_dict(candidate)
    scan_limit = max(50, min(50_000, int(get_settings().match_jobs_scan_limit)))
    score_fn = calculate_match_score_v2 if get_settings().match_scoring_v2 else calculate_match_score
    jobs = (
        db.query(Job)
        .filter(Job.is_validated.is_(True))
        .order_by(Job.scraped_at.desc())
        .limit(scan_limit)
        .all()
    )
    scored: list[tuple[float, Job]] = []

    for job in jobs:
        score = score_fn(cand, job_to_dict(job))
        if score >= min_score:
            scored.append((score, job))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:limit]
    results: list[dict[str, Any]] = []

    for score, job in top:
        if persist:
            _upsert_match(db, candidate.id, job.id, score)
        results.append(
            {
                "job_id": job.id,
                "score": score,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "url": job.url,
                "job_board": job.job_board,
            }
        )

    if persist:
        db.commit()
    return results


def _upsert_match(db: Session, candidate_id: int, job_id: int, score: float) -> None:
    row = (
        db.query(JobMatch)
        .filter(JobMatch.candidate_id == candidate_id, JobMatch.job_id == job_id)
        .first()
    )
    if row:
        row.score = score
    else:
        db.add(JobMatch(candidate_id=candidate_id, job_id=job_id, score=score))
