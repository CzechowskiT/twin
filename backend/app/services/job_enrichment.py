"""Lazy enrichment for competitive job board fields."""

from __future__ import annotations

import json
import re
from typing import Any

from app.services.requirements_split import split_requirements

_KNOWN_TECH = (
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "node",
    "fastapi",
    "django",
    "flask",
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "terraform",
    "git",
    "linux",
    "go",
    "rust",
    "kotlin",
    "swift",
    "sql",
    "spark",
    "kafka",
    "graphql",
    "nextjs",
    "next.js",
)

_SENIORITY_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\b(intern|staż|staz)\b", "intern"),
    (r"\bjunior\b", "junior"),
    (r"\b(mid|regular|mid[\-\s]level)\b", "mid"),
    (r"\b(senior|sr\.?)\b", "senior"),
    (r"\b(lead|principal|staff)\b", "lead"),
    (r"\b(head|director|dyrektor)\b", "director"),
)


def json_list_field(raw: str | None) -> list[str]:
    if not raw or not str(raw).strip():
        return []
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError, ValueError):
        return []
    if not isinstance(parsed, list):
        return []
    return [str(x).strip() for x in parsed if str(x).strip()]


def infer_tech_stack(requirements: str | None, description: str | None) -> list[str]:
    text = f"{requirements or ''} {description or ''}".lower()
    found: list[str] = []
    for tech in _KNOWN_TECH:
        if tech in text and tech not in found:
            found.append(tech)
    return found[:12]


def infer_seniority(title: str | None) -> str | None:
    if not title:
        return None
    lower = title.lower()
    for pattern, level in _SENIORITY_PATTERNS:
        if re.search(pattern, lower):
            return level
    return "mid"


def infer_remote_percentage(location: str | None, description: str | None) -> int | None:
    blob = f"{location or ''} {description or ''}".lower()
    if any(x in blob for x in ("100% remote", "fully remote", "w pełni zdaln", "całkowicie zdaln")):
        return 100
    if any(x in blob for x in ("hybrid", "hybryd", "częściowo zdaln")):
        return 50
    if any(x in blob for x in ("remote", "zdaln", "home office")):
        return 80
    if any(x in blob for x in ("on-site", "onsite", "stacjonarn", "office only")):
        return 0
    return None


def default_interview_process() -> list[dict[str, str]]:
    return [
        {"stage": "screen", "label": "Recruiter screen", "duration": "30 min"},
        {"stage": "tech", "label": "Technical interview", "duration": "60 min"},
        {"stage": "final", "label": "Final / culture fit", "duration": "45 min"},
    ]


def _interview_process(raw: str | None) -> list[dict[str, str]]:
    if not raw or not str(raw).strip():
        return default_interview_process()
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError, ValueError):
        return default_interview_process()
    if not isinstance(parsed, list) or not parsed:
        return default_interview_process()
    out: list[dict[str, str]] = []
    for item in parsed:
        if isinstance(item, dict) and item.get("label"):
            out.append(
                {
                    "stage": str(item.get("stage") or "step"),
                    "label": str(item["label"]),
                    "duration": str(item.get("duration") or ""),
                }
            )
    return out or default_interview_process()


def job_competitive_view(job: Any) -> dict[str, Any]:
    """Build API-ready competitive fields with lazy inference when DB columns are empty."""
    tech = json_list_field(getattr(job, "tech_stack", None))
    if not tech:
        tech = infer_tech_stack(job.requirements, job.description)

    must_raw = getattr(job, "requirements_must_have", None)
    nice_raw = getattr(job, "requirements_nice_to_have", None)
    if must_raw or nice_raw:
        must = json_list_field(must_raw)
        nice = json_list_field(nice_raw)
    else:
        must, nice = split_requirements(job.requirements)

    process = _interview_process(getattr(job, "interview_process_json", None))

    seniority = getattr(job, "seniority_level", None) or infer_seniority(job.title)
    remote_pct = getattr(job, "remote_percentage", None)
    if remote_pct is None:
        remote_pct = infer_remote_percentage(job.location, job.description)

    culture = json_list_field(getattr(job, "culture_tags", None))

    return {
        "tech_stack": tech,
        "requirements_must_have": must,
        "requirements_nice_to_have": nice,
        "interview_process": process,
        "remote_percentage": remote_pct,
        "seniority_level": seniority,
        "culture_tags": culture,
    }
