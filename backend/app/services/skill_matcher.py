"""Skill-focused match scoring for a single job vs candidate profile."""

from __future__ import annotations

import json
from typing import Any

from app.matching.matcher import calculate_match_score
from app.matching.synonyms import SKILL_ALIASES, SKILL_SYNONYMS


def _normalize_skills(raw: Any) -> list[str]:
    if isinstance(raw, list):
        items = raw
    elif raw:
        try:
            items = json.loads(raw)
        except (json.JSONDecodeError, TypeError, ValueError):
            items = []
    else:
        items = []
    out: list[str] = []
    for item in items:
        key = str(item).lower().strip()
        if key:
            out.append(SKILL_ALIASES.get(key, key))
    return out


def _job_text(job: dict[str, Any]) -> str:
    parts = [job.get("title"), job.get("requirements"), job.get("description")]
    return " ".join(p for p in parts if p).lower()


def _skill_hits(skill: str, text: str) -> bool:
    terms = SKILL_SYNONYMS.get(skill, [skill])
    return any(term in text for term in terms)


def compute_skill_match(candidate: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    """Return overall score plus skill-level breakdown for UI badges."""
    skills = _normalize_skills(candidate.get("skills", []))
    text = _job_text(job)
    matched = [s for s in skills if _skill_hits(s, text)]
    missing = [s for s in skills if s not in matched]
    skill_pct = round((len(matched) / len(skills)) * 100, 1) if skills else 0.0
    overall = float(calculate_match_score(candidate, job))
    return {
        "score": overall,
        "skill_match_percent": skill_pct,
        "matched_skills": matched,
        "missing_skills": missing,
        "total_skills": len(skills),
        "band": _band(overall),
    }


def _band(score: float) -> str:
    if score >= 80:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "weak"
