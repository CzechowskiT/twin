"""Feature gates by subscription tier (extends inline checks in applications.py)."""

from __future__ import annotations

from enum import Enum

from app.core.plans import PlanTier, effective_plan_tier
from app.database.models import User

# Ordered lowest → highest for entitlement comparisons.
_TIER_ORDER = [
    PlanTier.FREE,
    PlanTier.STANDBY,
    PlanTier.STANDARD,
    PlanTier.PREMIUM,
    PlanTier.PRO,
]


class Feature(str, Enum):
    """Product capabilities mapped to minimum plan tier."""

    JOB_COUNT_PREVIEW = "job_count_preview"
    ACTIVE_SEARCH = "active_search"
    AUTO_APPLY = "auto_apply"
    JOB_DETAILS = "job_details"
    HIGH_MATCH_FEED = "high_match_feed"
    OPPORTUNITY_FORECAST_FULL = "opportunity_forecast_full"
    UNIFIED_FEED_FILTERS = "unified_feed_filters"
    AI_INTERVIEW_COACH = "ai_interview_coach"
    LINKEDIN_AI_SYNTHESIS = "linkedin_ai_synthesis"
    GAMIFICATION_FULL = "gamification_full"
    LEARNING_PATH_AI = "learning_path_ai"
    PROFILE_EDIT = "profile_edit"


_FEATURE_MIN_TIER: dict[Feature, PlanTier] = {
    # Freemium: feed preview / counts only — no apply, no active search.
    Feature.JOB_COUNT_PREVIEW: PlanTier.FREE,
    # Free can preview; Standby is frozen (see active_search_allowed).
    Feature.ACTIVE_SEARCH: PlanTier.FREE,
    Feature.AUTO_APPLY: PlanTier.STANDARD,
    Feature.JOB_DETAILS: PlanTier.STANDARD,
    Feature.HIGH_MATCH_FEED: PlanTier.STANDARD,
    Feature.OPPORTUNITY_FORECAST_FULL: PlanTier.PREMIUM,
    Feature.UNIFIED_FEED_FILTERS: PlanTier.PREMIUM,
    Feature.AI_INTERVIEW_COACH: PlanTier.PREMIUM,
    Feature.LINKEDIN_AI_SYNTHESIS: PlanTier.FREE,
    Feature.GAMIFICATION_FULL: PlanTier.PREMIUM,
    Feature.LEARNING_PATH_AI: PlanTier.PREMIUM,
    # Standby: data retained, profile frozen until Standard+.
    Feature.PROFILE_EDIT: PlanTier.STANDARD,
}

# Minimum match score (0–100) for ranked opportunity surfaces by tier.
_MIN_MATCH_SCORE_BY_TIER: dict[PlanTier, float] = {
    PlanTier.FREE: 0.0,
    PlanTier.STANDBY: 0.0,
    PlanTier.STANDARD: 80.0,
    PlanTier.PREMIUM: 0.0,
    PlanTier.PRO: 0.0,
}


def _tier_rank(tier: PlanTier) -> int:
    try:
        return _TIER_ORDER.index(tier)
    except ValueError:
        return 0


def user_plan_tier(user: User) -> PlanTier:
    return effective_plan_tier(user)


def feature_allowed(user: User, feature: Feature) -> bool:
    """True when user's effective tier meets feature minimum."""
    required = _FEATURE_MIN_TIER.get(feature, PlanTier.FREE)
    return _tier_rank(user_plan_tier(user)) >= _tier_rank(required)


def min_match_score_for_user(user: User) -> float:
    """Standard+ sees ~80%+ matches; Premium/Pro see full ranked feed."""
    tier = user_plan_tier(user)
    return _MIN_MATCH_SCORE_BY_TIER.get(tier, 0.0)


def forecast_limit_for_user(user: User) -> int:
    """Free/Standby: top 5 per band; paid Standard+: full forecast bands."""
    if feature_allowed(user, Feature.OPPORTUNITY_FORECAST_FULL):
        return 10
    return 5


def active_search_allowed(user: User) -> bool:
    """Standby keeps data but pauses discovery; Free+Standard+ can browse."""
    if user_plan_tier(user) == PlanTier.STANDBY:
        return False
    return feature_allowed(user, Feature.ACTIVE_SEARCH)


def paywall_for_feature(feature: Feature) -> dict[str, str]:
    """Metadata for frontend paywall cards."""
    required = _FEATURE_MIN_TIER.get(feature, PlanTier.PREMIUM)
    return {
        "feature": feature.value,
        "required_tier": required.value,
        "upgrade_path": "/dashboard/billing",
    }
