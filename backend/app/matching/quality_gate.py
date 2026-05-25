"""Dashboard matching quality thresholds and labels (no ML)."""

from __future__ import annotations

# Dashboard shortlist (documented in docs/MATCHING_QUALITY_GATE.md)
DASHBOARD_MATCH_LIMIT = 50
DASHBOARD_MATCH_MIN_SCORE = 45.0
MAIN_RECOMMENDATION_MIN_SCORE = 40.0

EXCELLENT_MIN = 80.0
GOOD_MIN = 60.0
POSSIBLE_MIN = 40.0

APPLY_INTENT_SCORE_BOOST = 3.0

FEEDBACK_VALUES = frozenset({"apply_intent", "relevant", "not_relevant", "not_now"})


def match_quality_label(score: float) -> str:
    """Return excellent | good | possible | weak."""
    if score >= EXCELLENT_MIN:
        return "excellent"
    if score >= GOOD_MIN:
        return "good"
    if score >= POSSIBLE_MIN:
        return "possible"
    return "weak"
