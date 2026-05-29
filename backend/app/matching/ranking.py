"""Composite ranking for dashboard top-200 feed (rule-based, no ML)."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from app.database.models import Job
from app.matching.quality_gate import (
    APPLY_INTENT_SCORE_BOOST,
    NOT_NOW_SCORE_PENALTY,
    RELEVANT_SCORE_BOOST,
)

# Documented weights (see docs/MARKET_COVERAGE_AND_TOP_200_RANKING.md)
WEIGHT_CANDIDATE_FIT = 0.55
WEIGHT_SOURCE_QUALITY = 0.12
WEIGHT_FRESHNESS = 0.10
WEIGHT_COMPLETENESS = 0.10
WEIGHT_MARKET_PRIORITY = 0.13

DUPLICATE_PENALTY = 8.0

SOURCE_QUALITY: dict[str, float] = {
    "pracuj.pl": 92.0,
    "rocketjobs.pl": 90.0,
    "justjoin.it": 88.0,
    "praca.pl": 85.0,
    "linkedin.com": 82.0,
    "indeed.pl": 78.0,
    "indeed.com": 72.0,
    "glassdoor.com": 68.0,
    "greenhouse.io": 86.0,
}

PL_PRIORITY_BOARDS: frozenset[str] = frozenset(
    {
        "pracuj.pl",
        "rocketjobs.pl",
        "justjoin.it",
        "praca.pl",
        "linkedin.com",
        "indeed.pl",
    }
)

def _normalize_board_key(job_board: str) -> str:
    raw = (job_board or "").strip().lower()
    if raw.startswith("greenhouse:"):
        return "greenhouse.io"
    return raw


def source_quality_score(job_board: str) -> float:
    key = _normalize_board_key(job_board)
    if key in SOURCE_QUALITY:
        return SOURCE_QUALITY[key]
    if (job_board or "").lower().startswith("greenhouse:"):
        return SOURCE_QUALITY["greenhouse.io"]
    return 65.0


def _candidate_prefers_poland(location: str | None) -> bool:
    if not location:
        return True
    loc = location.strip().lower()
    if any(x in loc for x in ("polska", "poland", "warszawa", "warsaw", "kraków", "krakow", "wrocław", "gdańsk")):
        return True
    return "pl" in loc.split() or loc.endswith(" pl")


def market_priority_score(job_board: str, candidate_location: str | None) -> float:
    if not _candidate_prefers_poland(candidate_location):
        return 70.0
    key = _normalize_board_key(job_board)
    if key in PL_PRIORITY_BOARDS:
        return 95.0
    if (job_board or "").lower().startswith("greenhouse:"):
        return 80.0
    return 60.0


def freshness_score(scraped_at: datetime | None, *, now: datetime | None = None) -> float:
    if scraped_at is None:
        return 50.0
    ref = now or datetime.utcnow()
    age = ref - scraped_at
    if age <= timedelta(hours=24):
        return 100.0
    if age <= timedelta(days=7):
        return 85.0
    if age <= timedelta(days=30):
        return 70.0
    return 55.0


def completeness_score(job: Job | dict[str, Any]) -> float:
    def _get(name: str) -> Any:
        if isinstance(job, dict):
            return job.get(name)
        return getattr(job, name, None)

    pts = 0.0
    if (_get("description") or "").strip():
        pts += 35.0
    if (_get("requirements") or "").strip():
        pts += 25.0
    if (_get("location") or "").strip():
        pts += 20.0
    if _get("salary_min") or _get("salary_max"):
        pts += 20.0
    if (_get("url") or "").strip():
        pts += 10.0
    return min(100.0, pts)


def feed_dedupe_key(job: Job) -> str:
    """Collapse same role across boards in the ranked feed."""
    url = (job.url or "").strip().lower()
    parsed = urlparse(url)
    if parsed.path and len(parsed.path) > 12:
        return f"url:{parsed.netloc}{parsed.path[:120]}"
    title = re.sub(r"\s+", " ", (job.title or "").strip().lower())[:160]
    company = re.sub(r"\s+", " ", (job.company or "").strip().lower())[:120]
    loc = re.sub(r"\s+", " ", (job.location or "").strip().lower())[:80]
    return f"t:{title}|c:{company}|l:{loc}"


def feedback_adjustment(
    *,
    job_id: int,
    apply_intent_ids: set[int],
    relevant_ids: set[int],
    not_now_ids: set[int],
) -> float:
    if job_id in apply_intent_ids:
        return APPLY_INTENT_SCORE_BOOST
    if job_id in relevant_ids:
        return RELEVANT_SCORE_BOOST
    if job_id in not_now_ids:
        return NOT_NOW_SCORE_PENALTY
    return 0.0


def compute_final_score(
    candidate_fit: float,
    job: Job,
    *,
    candidate_location: str | None,
    apply_intent_ids: set[int],
    relevant_ids: set[int],
    not_now_ids: set[int],
    duplicate_in_batch: bool = False,
    now: datetime | None = None,
) -> float:
    """Blend fit + corpus signals + feedback (0–100)."""
    aux = (
        source_quality_score(job.job_board) * WEIGHT_SOURCE_QUALITY
        + freshness_score(job.scraped_at, now=now) * WEIGHT_FRESHNESS
        + completeness_score(job) * WEIGHT_COMPLETENESS
        + market_priority_score(job.job_board, candidate_location) * WEIGHT_MARKET_PRIORITY
    )
    raw = candidate_fit * WEIGHT_CANDIDATE_FIT + aux
    raw += feedback_adjustment(
        job_id=job.id,
        apply_intent_ids=apply_intent_ids,
        relevant_ids=relevant_ids,
        not_now_ids=not_now_ids,
    )
    if duplicate_in_batch:
        raw -= DUPLICATE_PENALTY
    return max(0.0, min(100.0, raw))


def dedupe_ranked_jobs(scored: list[tuple[float, Job]]) -> list[tuple[float, Job]]:
    """Keep highest final_score per dedupe key."""
    best: dict[str, tuple[float, Job]] = {}
    for score, job in sorted(scored, key=lambda x: x[0], reverse=True):
        key = feed_dedupe_key(job)
        prev = best.get(key)
        if prev is None or score > prev[0]:
            best[key] = (score, job)
    return sorted(best.values(), key=lambda x: x[0], reverse=True)


def job_display_badges(job: Job, final_score: float, *, now: datetime | None = None) -> list[str]:
    """UI badge ids — mapped in frontend i18n."""
    badges: list[str] = []
    if (job.job_board or "").lower().startswith("greenhouse:"):
        badges.append("direct_employer")
    ref = now or datetime.utcnow()
    if job.scraped_at and ref - job.scraped_at <= timedelta(days=2):
        badges.append("fresh")
    if final_score >= 80.0:
        badges.append("high_fit")
    loc = (job.location or "").lower()
    if job.remote_percentage is not None and job.remote_percentage >= 50:
        badges.append("remote")
    elif any(x in loc for x in ("remote", "zdaln", "hybrid", "hybryd")):
        badges.append("remote")
    if job.salary_min or job.salary_max:
        badges.append("salary_visible")
    return badges


def source_display_label(job_board: str) -> str:
    """Human label for job_board field in UI."""
    key = (job_board or "").strip()
    if key.lower().startswith("greenhouse:"):
        name = key.split(":", 1)[-1].replace("-", " ").title()
        return f"{name} (Greenhouse)"
    labels = {
        "pracuj.pl": "pracuj.pl",
        "rocketjobs.pl": "rocketjobs.pl",
        "justjoin.it": "justjoin.it",
        "praca.pl": "praca.pl",
        "linkedin.com": "LinkedIn",
        "indeed.pl": "Indeed PL",
        "indeed.com": "Indeed",
    }
    return labels.get(key.lower(), key)
