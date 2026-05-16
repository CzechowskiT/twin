"""Plan tier helpers."""

from types import SimpleNamespace

from app.core.plans import PlanTier, effective_plan_tier, max_tracked_applications


def _u(**kwargs: object) -> SimpleNamespace:
    base: dict[str, object] = {"plan_tier": "free", "subscription_status": None}
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_effective_plan_free_by_default() -> None:
    assert effective_plan_tier(_u()) is PlanTier.FREE


def test_effective_plan_premium_when_active() -> None:
    assert effective_plan_tier(_u(plan_tier="premium", subscription_status="active")) is PlanTier.PREMIUM


def test_effective_plan_premium_when_trialing() -> None:
    assert effective_plan_tier(_u(plan_tier="premium", subscription_status="trialing")) is PlanTier.PREMIUM


def test_max_tracked_free_cap() -> None:
    assert max_tracked_applications(PlanTier.FREE) == 25
    assert max_tracked_applications(PlanTier.PREMIUM) is None
