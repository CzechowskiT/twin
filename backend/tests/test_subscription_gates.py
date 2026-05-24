"""Tests for subscription feature gates."""

from types import SimpleNamespace

from app.core.plans import PlanTier
from app.core.subscription_gates import (
    Feature,
    active_search_allowed,
    feature_allowed,
    forecast_limit_for_user,
    min_match_score_for_user,
)


def _user(**kwargs: object) -> SimpleNamespace:
    base: dict[str, object] = {"plan_tier": "free", "subscription_status": None}
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_free_user_limited_forecast() -> None:
    assert forecast_limit_for_user(_user()) == 5


def test_premium_forecast_full() -> None:
    u = _user(plan_tier="premium", subscription_status="active")
    assert forecast_limit_for_user(u) == 10
    assert feature_allowed(u, Feature.AI_INTERVIEW_COACH) is True


def test_free_interview_coach_blocked() -> None:
    assert feature_allowed(_user(), Feature.AI_INTERVIEW_COACH) is False


def test_standby_keeps_data_no_active_search() -> None:
    u = _user(plan_tier="standby", subscription_status="active")
    assert active_search_allowed(u) is False
    assert feature_allowed(u, Feature.AUTO_APPLY) is False
    assert feature_allowed(u, Feature.PROFILE_EDIT) is False
    assert forecast_limit_for_user(u) == 5


def test_standard_apply_and_high_match() -> None:
    u = _user(plan_tier="standard", subscription_status="active")
    assert feature_allowed(u, Feature.AUTO_APPLY) is True
    assert feature_allowed(u, Feature.PROFILE_EDIT) is True
    assert feature_allowed(u, Feature.HIGH_MATCH_FEED) is True
    assert min_match_score_for_user(u) == 80.0
    assert feature_allowed(u, Feature.AI_INTERVIEW_COACH) is False


def test_premium_maps_existing_stripe_subscribers() -> None:
    u = _user(plan_tier="premium", subscription_status="active")
    assert feature_allowed(u, Feature.GAMIFICATION_FULL) is True
    assert min_match_score_for_user(u) == 0.0


def test_pro_tier_at_least_premium() -> None:
    u = _user(plan_tier="pro", subscription_status="active")
    assert feature_allowed(u, Feature.LEARNING_PATH_AI) is True


def test_tier_order_standby_below_standard() -> None:
    standby = _user(plan_tier="standby", subscription_status="active")
    standard = _user(plan_tier="standard", subscription_status="active")
    assert feature_allowed(standby, Feature.JOB_DETAILS) is False
    assert feature_allowed(standard, Feature.JOB_DETAILS) is True
