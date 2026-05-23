"""Short human-readable match explanations for dashboard UI."""

from __future__ import annotations

from typing import Any


def _norm_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [str(x).strip().lower() for x in raw if str(x).strip()]


def build_match_reason(
    candidate: dict[str, Any],
    job: dict[str, Any],
    *,
    score: float,
    locale: str = "en",
) -> str:
    """One line explaining why the role ranks (no PII)."""
    pl = locale.lower().startswith("pl")
    parts: list[str] = []

    titles = _norm_list(candidate.get("preferred_job_titles"))
    job_title = (job.get("title") or "").lower()
    if titles and any(t in job_title or job_title in t for t in titles):
        parts.append("tytuł roli" if pl else "role title fit")

    skills = _norm_list(candidate.get("skills"))
    req_blob = f"{job.get('requirements') or ''} {job.get('description') or ''}".lower()
    if skills and any(s in req_blob for s in skills[:12]):
        parts.append("umiejętności z CV" if pl else "skills from your profile")

    cand_loc = (candidate.get("location") or "").strip().lower()
    job_loc = (job.get("location") or "").strip().lower()
    if cand_loc and job_loc and (cand_loc in job_loc or job_loc in cand_loc):
        parts.append("lokalizacja" if pl else "location")

    desired = candidate.get("desired_salary")
    sal_max = job.get("salary_max")
    if desired and sal_max and int(desired) <= int(sal_max):
        parts.append("widełki pensji" if pl else "salary band")

    if not parts:
        if score >= 90:
            parts.append("wysokie dopasowanie profilu" if pl else "strong profile overlap")
        elif score >= 75:
            parts.append("dobre dopasowanie ogólne" if pl else "solid overall fit")
        else:
            parts.append("dopasowanie powyżej progu" if pl else "above your match threshold")

    joined = ", ".join(parts[:3])
    prefix = "Pasuje, bo: " if pl else "Fits because: "
    return f"{prefix}{joined}."
