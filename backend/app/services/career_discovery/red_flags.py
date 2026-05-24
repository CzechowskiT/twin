"""Heuristic red-flag detection for job postings (career discovery MVP)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# Fluff / hype patterns (EN + PL samples) — aligned with frontend red-flag-service.
_FLUFF_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("rockstar", re.compile(r"\brock\s*star\b", re.I)),
    ("ninja", re.compile(r"\bninja\b", re.I)),
    ("guru", re.compile(r"\bguru\b", re.I)),
    ("superhero", re.compile(r"\bsuper\s*hero\b", re.I)),
    ("unpaid", re.compile(r"\bunpaid\b", re.I)),
    ("commission_only", re.compile(r"commission\s+only|prowizj", re.I)),
    ("wear_many_hats", re.compile(r"wear\s+many\s+hats|wiele\s+czapek", re.I)),
    ("fast_paced", re.compile(r"fast[- ]paced|dynamiczn", re.I)),
    ("rockstar_culture", re.compile(r"work\s+hard\s+play\s+hard", re.I)),
    ("competitive_salary_vague", re.compile(r"competitive\s+salary|atrakcyjne\s+wynagrodzenie", re.I)),
]

_SKILL_SPRAWL_THRESHOLD = 15


@dataclass(frozen=True)
class RedFlagHit:
    """Single detected red flag."""

    code: str
    message: str
    pattern: str | None = None


def detect_red_flags(
    *,
    title: str,
    description: str | None = None,
    requirements: str | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    skills: list[str] | None = None,
    existing: list[str] | None = None,
) -> list[RedFlagHit]:
    """Scan posting text and metadata for common warning signals."""
    hits: list[RedFlagHit] = []
    text = " ".join(p for p in [title, description or "", requirements or ""] if p).strip()

    for code, pattern in _FLUFF_PATTERNS:
        if pattern.search(text):
            hits.append(
                RedFlagHit(
                    code=code,
                    message=f"Suspicious phrase matched: {pattern.pattern}",
                    pattern=pattern.pattern,
                )
            )

    if salary_min is None and salary_max is None:
        hits.append(
            RedFlagHit(
                code="no_salary_disclosed",
                message="No salary range disclosed on the listing.",
            )
        )

    skill_list = [s.strip() for s in (skills or []) if s and str(s).strip()]
    if len(skill_list) > _SKILL_SPRAWL_THRESHOLD:
        hits.append(
            RedFlagHit(
                code="skill_sprawl",
                message=f"Unusually long skill list ({len(skill_list)} items).",
            )
        )

    for raw in existing or []:
        flag = str(raw).strip()
        if not flag:
            continue
        if any(h.code == flag or h.message == flag for h in hits):
            continue
        hits.append(RedFlagHit(code="listed", message=flag))

    return hits


def red_flag_summary(hits: list[RedFlagHit]) -> str:
    """Short human-readable summary for API/UI."""
    if not hits:
        return "No red flags detected."
    codes = [h.code for h in hits]
    unique = list(dict.fromkeys(codes))
    if len(unique) == 1:
        return f"1 red flag: {unique[0]}."
    return f"{len(unique)} red flags: {', '.join(unique[:5])}" + (
        "…" if len(unique) > 5 else ""
    )


def red_flags_from_job_dict(job: dict[str, Any]) -> list[RedFlagHit]:
    """Convenience wrapper for API payloads keyed like matcher job dicts."""
    skills = job.get("skills")
    if skills is None and job.get("tech_stack"):
        skills = job.get("tech_stack")
    skill_list = list(skills) if isinstance(skills, list) else None
    existing = job.get("red_flags") or job.get("redFlags")
    existing_list = list(existing) if isinstance(existing, list) else None
    return detect_red_flags(
        title=str(job.get("title") or ""),
        description=job.get("description"),
        requirements=job.get("requirements"),
        salary_min=job.get("salary_min"),
        salary_max=job.get("salary_max"),
        skills=skill_list,
        existing=existing_list,
    )
