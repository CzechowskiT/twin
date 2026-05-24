"""Tests for subscription feature gates."""

from types import SimpleNamespace

from app.core.plans import PlanTier
from app.core.subscription_gates import Feature, feature_allowed, forecast_limit_for_user


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
