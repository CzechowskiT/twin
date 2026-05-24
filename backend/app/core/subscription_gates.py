"""Feature gates by subscription tier (extends inline checks in applications.py)."""

from __future__ import annotations

from enum import Enum

from app.core.plans import PlanTier, effective_plan_tier
from app.database.models import User


class Feature(str, Enum):
    OPPORTUNITY_FORECAST_FULL = "opportunity_forecast_full"
    UNIFIED_FEED_FILTERS = "unified_feed_filters"
    AI_INTERVIEW_COACH = "ai_interview_coach"
    LINKEDIN_AI_SYNTHESIS = "linkedin_ai_synthesis"
    GAMIFICATION_FULL = "gamification_full"
    LEARNING_PATH_AI = "learning_path_ai"


_TIER_ORDER = [PlanTier.FREE, PlanTier.PREMIUM, PlanTier.PRO]

_FEATURE_MIN_TIER: dict[Feature, PlanTier] = {
    Feature.OPPORTUNITY_FORECAST_FULL: PlanTier.PREMIUM,
    Feature.UNIFIED_FEED_FILTERS: PlanTier.PREMIUM,
    Feature.AI_INTERVIEW_COACH: PlanTier.PREMIUM,
    Feature.LINKEDIN_AI_SYNTHESIS: PlanTier.FREE,
    Feature.GAMIFICATION_FULL: PlanTier.PREMIUM,
    Feature.LEARNING_PATH_AI: PlanTier.PREMIUM,
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


def forecast_limit_for_user(user: User) -> int:
    """Free users see top 5 per band; paid users see full forecast."""
    return 5 if not feature_allowed(user, Feature.OPPORTUNITY_FORECAST_FULL) else 10


def paywall_for_feature(feature: Feature) -> dict[str, str]:
    """Metadata for frontend paywall cards."""
    required = _FEATURE_MIN_TIER.get(feature, PlanTier.PREMIUM)
    return {
        "feature": feature.value,
        "required_tier": required.value,
        "upgrade_path": "/dashboard/billing",
    }
