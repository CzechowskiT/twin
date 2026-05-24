"""Opportunity forecast: Perfect / Near Miss / Stretch buckets."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, Job
from app.services.matching_service import candidate_to_dict, job_to_dict
from app.services.skill_matcher import compute_skill_match


def _forecast_band(score: float) -> str:
    if score >= 80:
        return "perfect"
    if score >= 60:
        return "near_miss"
    return "stretch"


def _learning_path(band: str, missing: list[str], locale: str) -> list[dict[str, str]]:
    pl = locale.startswith("pl")
    if band == "perfect":
        msg = "Profil jest mocno dopasowany — aplikuj od razu." if pl else "Strong fit — apply now."
        return [{"area": "action", "suggestion": msg, "impact": "high"}]
    if not missing:
        msg = "Uzupełnij CV o mierzalne wyniki." if pl else "Add quantified outcomes to your CV."
        return [{"area": "cv", "suggestion": msg, "impact": "medium"}]
    top = missing[:3]
    label = ", ".join(top)
    if pl:
        return [{"area": "skills", "suggestion": f"Brakuje sygnału dla: {label}", "impact": "high"}]
    return [{"area": "skills", "suggestion": f"Add evidence for: {label}", "impact": "high"}]


def forecast_opportunities(
    db: Session,
    candidate: Candidate,
    *,
    limit_per_band: int = 10,
    scan_limit: int = 200,
    locale: str = "en",
) -> dict[str, Any]:
    """Score validated jobs and bucket into perfect / near_miss / stretch."""
    cand = candidate_to_dict(candidate)
    jobs = (
        db.query(Job)
        .filter(Job.is_validated.is_(True))
        .order_by(Job.scraped_at.desc())
        .limit(scan_limit)
        .all()
    )
    buckets: dict[str, list[dict[str, Any]]] = {
        "perfect": [],
        "near_miss": [],
        "stretch": [],
    }
    for job in jobs:
        jdict = job_to_dict(job)
        match = compute_skill_match(cand, jdict)
        score = float(match["score"])
        band = _forecast_band(score)
        entry = {
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "score": score,
            "band": band,
            "skill_match_percent": match["skill_match_percent"],
            "matched_skills": match["matched_skills"][:8],
            "missing_skills": match["missing_skills"][:8],
            "opportunity_type": getattr(job, "opportunity_type", "full_time") or "full_time",
            "learning_path": _learning_path(band, match["missing_skills"], locale),
        }
        buckets[band].append(entry)
    for key in buckets:
        buckets[key].sort(key=lambda x: x["score"], reverse=True)
        buckets[key] = buckets[key][:limit_per_band]
    total = sum(len(v) for v in buckets.values())
    return {
        "perfect": buckets["perfect"],
        "near_miss": buckets["near_miss"],
        "stretch": buckets["stretch"],
        "totals": {k: len(v) for k, v in buckets.items()},
        "scanned_jobs": len(jobs),
        "summary": {
            "perfect_count": len(buckets["perfect"]),
            "near_miss_count": len(buckets["near_miss"]),
            "stretch_count": len(buckets["stretch"]),
            "total_returned": total,
        },
    }
