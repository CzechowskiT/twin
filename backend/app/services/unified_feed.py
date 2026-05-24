"""Unified job + freelance opportunity feed."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, Job
from app.services.matching_service import candidate_to_dict, job_to_dict
from app.services.skill_matcher import compute_skill_match


def unified_opportunity_feed(
    db: Session,
    candidate: Candidate | None,
    *,
    opportunity_type: str | None = None,
    limit: int = 50,
    min_score: float = 0.0,
) -> list[dict[str, Any]]:
    """Return jobs with type metadata and optional match score."""
    q = db.query(Job).filter(Job.is_validated.is_(True))
    if opportunity_type and opportunity_type != "all":
        q = q.filter(Job.opportunity_type == opportunity_type)
    jobs = q.order_by(Job.scraped_at.desc()).limit(max(limit, 1) * 3).all()
    cand = candidate_to_dict(candidate) if candidate else None
    out: list[dict[str, Any]] = []
    for job in jobs:
        jdict = job_to_dict(job)
        score = None
        if cand:
            score = float(compute_skill_match(cand, jdict)["score"])
            if score < min_score:
                continue
        out.append(_job_feed_item(job, score))
        if len(out) >= limit:
            break
    if cand and out:
        out.sort(key=lambda x: x.get("match_score") or 0, reverse=True)
    return out


def _job_feed_item(job: Job, score: float | None) -> dict[str, Any]:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "job_board": job.job_board,
        "url": job.url,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "opportunity_type": getattr(job, "opportunity_type", "full_time") or "full_time",
        "project_duration_months": getattr(job, "project_duration_months", None),
        "hourly_rate_min": getattr(job, "hourly_rate_min", None),
        "hourly_rate_max": getattr(job, "hourly_rate_max", None),
        "match_score": score,
        "scraped_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }
