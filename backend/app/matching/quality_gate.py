"""Dashboard matching quality thresholds and labels (no ML)."""

from __future__ import annotations

# Dashboard ranked feed (documented in docs/MATCHING_QUALITY_GATE.md)
DASHBOARD_MATCH_LIMIT = 200
DASHBOARD_MATCH_MIN_SCORE = 38.0
TOP_MATCHES_HIGHLIGHT_COUNT = 20
MAIN_RECOMMENDATION_MIN_SCORE = 38.0

EXCELLENT_MIN = 80.0
GOOD_MIN = 60.0
POSSIBLE_MIN = 40.0

APPLY_INTENT_SCORE_BOOST = 3.0
RELEVANT_SCORE_BOOST = 2.0
NOT_NOW_SCORE_PENALTY = -2.0

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
