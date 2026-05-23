"""Job match scoring for career discovery (wraps core matcher)."""

from __future__ import annotations

from typing import Any

from app.matching.matcher import calculate_match_score


def _band(score: float) -> str:
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "weak"


def score_job_match(candidate: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    """Score candidate vs job using TWIN matcher; returns score and band."""
    raw = float(calculate_match_score(candidate, job))
    return {"score": round(raw, 2), "band": _band(raw)}
