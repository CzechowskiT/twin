"""Stripe price id → plan tier mapping."""

from types import SimpleNamespace

from app.services.stripe_billing import price_id_for_plan, tier_for_price_id


def _settings() -> SimpleNamespace:
    return SimpleNamespace(
        stripe_price_id_standby="price_standby",
        stripe_price_id_standard="price_standard",
        stripe_price_id_premium="price_premium",
        stripe_price_id_pro="price_pro",
        stripe_price_id_premium_annual="",
        stripe_price_id_pro_annual="",
    )


def test_tier_for_price_id_maps_micro_tiers() -> None:
    s = _settings()
    assert tier_for_price_id(s, "price_standby") == "standby"
    assert tier_for_price_id(s, "price_standard") == "standard"
    assert tier_for_price_id(s, "price_premium") == "premium"
    assert tier_for_price_id(s, "price_pro") == "pro"


def test_price_id_for_plan_returns_configured_ids() -> None:
    s = _settings()
    assert price_id_for_plan(s, "standby") == "price_standby"
    assert price_id_for_plan(s, "standard") == "price_standard"
    assert price_id_for_plan(s, "premium") == "price_premium"
