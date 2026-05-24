"""Opportunity forecast: Perfect / Near Miss / Stretch buckets."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, Job
from app.services.anthropic_client import is_anthropic_configured
from app.services.career_assistant_common import call_claude_json
from app.services.matching_service import candidate_to_dict, job_to_dict
from app.services.skill_matcher import compute_skill_match

_LEARNING_PATH_PROMPT = """Return ONLY a JSON array of 2-3 actionable learning steps:
[{{"area": "skills|cv|network", "suggestion": "...", "impact": "high|medium|low"}}]
Help the candidate close gaps for this role. Use locale language ({locale}). No invented credentials.

Role: {title} at {company}
Match band: {band}
Missing skills: {missing}
"""


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


def generate_ai_learning_path(
    *,
    title: str,
    company: str,
    band: str,
    missing_skills: list[str],
    locale: str,
) -> list[dict[str, str]] | None:
    """Claude-enhanced learning steps for Premium forecast (when API key is set)."""
    if not is_anthropic_configured() or band == "perfect":
        return None
    missing = ", ".join(missing_skills[:6]) or "general profile fit"
    prompt = _LEARNING_PATH_PROMPT.format(
        locale=locale[:2],
        title=title[:120],
        company=company[:80],
        band=band,
        missing=missing,
    )
    data = call_claude_json(prompt, max_tokens=800)
    if isinstance(data, list) and data:
        return [
            {
                "area": str(step.get("area") or "skills"),
                "suggestion": str(step.get("suggestion") or ""),
                "impact": str(step.get("impact") or "medium"),
            }
            for step in data[:3]
            if isinstance(step, dict) and step.get("suggestion")
        ]
    return None


def _apply_ai_learning_paths(
    buckets: dict[str, list[dict[str, Any]]],
    *,
    use_ai: bool,
    locale: str,
    max_per_band: int = 2,
) -> None:
    """Upgrade top near_miss / stretch entries with Claude paths when allowed."""
    if not use_ai:
        return
    for band in ("near_miss", "stretch"):
        for entry in buckets[band][:max_per_band]:
            ai_path = generate_ai_learning_path(
                title=str(entry.get("title") or ""),
                company=str(entry.get("company") or ""),
                band=band,
                missing_skills=list(entry.get("missing_skills") or []),
                locale=locale,
            )
            if ai_path:
                entry["learning_path"] = ai_path
                entry["learning_path_source"] = "claude"


def forecast_opportunities(
    db: Session,
    candidate: Candidate,
    *,
    limit_per_band: int = 10,
    scan_limit: int = 200,
    locale: str = "en",
    use_ai_learning_paths: bool = False,
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
            "learning_path_source": "deterministic",
        }
        buckets[band].append(entry)
    for key in buckets:
        buckets[key].sort(key=lambda x: x["score"], reverse=True)
        buckets[key] = buckets[key][:limit_per_band]
    _apply_ai_learning_paths(buckets, use_ai=use_ai_learning_paths, locale=locale)
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
