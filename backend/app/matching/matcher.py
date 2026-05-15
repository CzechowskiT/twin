"""Rule-based matching tuned for sales, business, and tech profiles."""

import json
import re
from typing import Any

from app.matching.synonyms import SALES_TITLE_SIGNALS, SKILL_ALIASES, SKILL_SYNONYMS

_SALARY_RE = re.compile(r"(\d[\d\s]{2,})\s*(?:–|-)?\s*(\d[\d\s]{2,})?\s*PLN", re.I)


_PL_STOP = frozenset(
    {
        "oraz",
        "przez",
        "jest",
        "być",
        "jako",
        "oraz",
        "praca",
        "pracy",
        "oferta",
        "the",
        "and",
        "for",
        "with",
        "your",
        "that",
        "this",
        "from",
    }
)


def calculate_match_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Score 0–100 from skills, salary, location, experience, and optional CV context."""
    score = 0.0
    score += _skills_score(candidate, job)
    score += _sales_role_score(candidate, job)
    score += _cv_context_score(candidate, job)
    score += _salary_score(candidate, job)
    score += _location_score(candidate, job)
    score += _experience_score(candidate, job)
    return round(min(score, 100.0), 2)


def _normalize_skills(raw: Any) -> list[str]:
    if isinstance(raw, list):
        items = raw
    else:
        items = json.loads(raw) if raw else []
    normalized: list[str] = []
    for item in items:
        key = str(item).lower().strip()
        if not key:
            continue
        normalized.append(SKILL_ALIASES.get(key, key))
    return normalized


def _job_text(job: dict[str, Any]) -> tuple[str, str]:
    title = (job.get("title") or "").lower()
    body = " ".join(
        p for p in [job.get("requirements"), job.get("description")] if p
    ).lower()
    return title, body


def _skills_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    skills = _normalize_skills(candidate.get("skills", []))
    if not skills:
        return 0.0

    title, body = _job_text(job)
    full = f"{title} {body}"
    hits = 0.0
    for skill in skills:
        terms = SKILL_SYNONYMS.get(skill, [skill])
        if _any_term_in_text(terms, title):
            hits += 1.0
        elif _any_term_in_text(terms, full):
            hits += 0.65

    return min(55.0, (hits / len(skills)) * 55.0)


def _any_term_in_text(terms: list[str], text: str) -> bool:
    return any(term in text for term in terms)


def _tokenize(text: str) -> set[str]:
    tokens: set[str] = set()
    for word in re.findall(r"[a-ząćęłńóśźż0-9]{4,}", text.lower()):
        if word not in _PL_STOP:
            tokens.add(word)
    return tokens


def _sales_role_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Extra points when profile looks sales-oriented and job title matches."""
    skills = _normalize_skills(candidate.get("skills", []))
    sales_profile = bool(
        skills
        and any(s in skills for s in ("sales", "b2b", "key account", "business", "crm"))
    )
    if not sales_profile:
        return 0.0
    title, _ = _job_text(job)
    if any(sig in title for sig in SALES_TITLE_SIGNALS):
        return 10.0
    return 0.0


def _cv_context_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Overlap between full CV text and job posting (contextual fit)."""
    cv_text = (candidate.get("cv_text") or "").strip()
    if not cv_text:
        return 0.0

    title, body = _job_text(job)
    job_tokens = _tokenize(f"{title} {body}")
    cv_tokens = _tokenize(cv_text[:8000])
    if not job_tokens or not cv_tokens:
        return 0.0

    overlap = len(job_tokens & cv_tokens)
    ratio = overlap / max(len(job_tokens), 1)
    # Up to 20 pts for strong contextual overlap
    return min(20.0, ratio * 35.0)


def _salary_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    desired = candidate.get("desired_salary")
    if not desired:
        return 5.0

    lo, hi = job.get("salary_min"), job.get("salary_max")
    if not lo or not hi:
        lo, hi = _salary_from_text(job.get("requirements") or "")

    if not lo:
        return 5.0
    if not hi:
        hi = lo
    if lo <= desired <= hi:
        return 15.0
    if desired < lo:
        return 8.0
    if desired <= hi * 1.2:
        return 5.0
    return 0.0


def _salary_from_text(text: str) -> tuple[int | None, int | None]:
    match = _SALARY_RE.search(text.replace("\xa0", " "))
    if not match:
        return None, None
    lo = int(re.sub(r"\s", "", match.group(1)))
    hi = int(re.sub(r"\s", "", match.group(2))) if match.group(2) else lo
    return lo, hi


def _location_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    city = (candidate.get("location") or "").lower().strip()
    if not city:
        return 0.0

    title, body = _job_text(job)
    loc = (job.get("location") or "").lower()
    combined = f"{title} {loc} {body}"
    if city in combined:
        return 15.0
    if "cała polska" in combined or "zdalna" in combined or "remote" in combined:
        return 8.0
    return 0.0


def _experience_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    years = candidate.get("experience_years") or 0
    title, _ = _job_text(job)
    if years >= 10 and any(w in title for w in ("senior", "lead", "head", "dyrektor")):
        return 15.0
    if years >= 5 and any(w in title for w in ("senior", "manager", "owner", "kierownik")):
        return 12.0
    if years >= 3 and "junior" not in title:
        return 10.0
    if years < 3 and "junior" in title:
        return 12.0
    return 8.0
