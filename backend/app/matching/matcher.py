"""Rule-based matching (Claude enhancement in later tasks)."""

import json
from typing import Any


def calculate_match_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Score 0–100 from skills, salary, location, experience."""
    score = 0.0
    score += _skills_score(candidate, job)
    score += _salary_score(candidate, job)
    score += _location_score(candidate, job)
    score += 15.0  # experience placeholder until JD parsing exists
    return round(min(score, 100.0), 2)


def _skills_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    raw = candidate.get("skills", "[]")
    skills_list = raw if isinstance(raw, list) else json.loads(raw)
    cand = {s.lower().strip() for s in skills_list if s}
    req_text = (job.get("requirements") or job.get("description") or "").lower()
    if not cand or not req_text:
        return 0.0
    overlap = sum(1 for s in cand if s in req_text)
    return (overlap / len(cand)) * 50.0


def _salary_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    desired = candidate.get("desired_salary")
    lo, hi = job.get("salary_min"), job.get("salary_max")
    if not desired or not lo or not hi:
        return 0.0
    if lo <= desired <= hi:
        return 20.0
    if desired < lo:
        return 10.0
    return 0.0


def _location_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    loc_c = (candidate.get("location") or "").lower()
    loc_j = (job.get("location") or "").lower()
    if loc_c and loc_c in loc_j:
        return 15.0
    return 0.0
