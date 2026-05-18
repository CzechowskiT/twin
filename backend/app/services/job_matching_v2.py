"""Match scoring v2: reuses v1 engine with a small salary-overlap bonus (no new ML deps)."""

from __future__ import annotations

from typing import Any

from app.matching.matcher import calculate_match_score


def _salary_overlap_bonus(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Up to +5 points when stated expectations overlap the job band (PLN heuristic)."""
    want = candidate.get("desired_salary")
    jmin, jmax = job.get("salary_min"), job.get("salary_max")
    if want is None or jmin is None or jmax is None:
        return 0.0
    try:
        w = float(want)
        lo = float(jmin)
        hi = float(jmax)
    except (TypeError, ValueError):
        return 0.0
    if hi < lo:
        lo, hi = hi, lo
    if w >= lo * 0.85 and w <= hi * 1.15:
        return 5.0
    return 0.0


def calculate_match_score_v2(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """v1 score plus bounded salary overlap bonus (still capped at 100)."""
    base = calculate_match_score(candidate, job)
    return round(min(100.0, base + _salary_overlap_bonus(candidate, job)), 2)
