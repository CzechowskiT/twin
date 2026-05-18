"""Billing plans payload and Stripe wiring parity."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api.billing import _checkout_configured
from app.config import Settings, get_settings
from app.main import app


def test_checkout_configured_requires_premium_price() -> None:
    only_pro = Settings(
        stripe_secret_key="sk_test_x",
        stripe_price_id_premium="",
        stripe_price_id_pro="price_pro123",
    )
    assert _checkout_configured(only_pro) is False
    prem_ok = Settings(
        stripe_secret_key="sk_test_x",
        stripe_price_id_premium="price_pre",
        stripe_price_id_pro="",
    )
    assert _checkout_configured(prem_ok) is True


@patch("app.api.billing.stripe_svc.stripe_monthly_list_from_price", return_value=(49.0, "pln"))
def test_list_plans_includes_live_stripe_list_price(_mock_live: object) -> None:
    def _settings() -> Settings:
        return Settings(
            stripe_secret_key="sk_test_123",
            stripe_price_id_premium="price_prem",
            stripe_price_id_pro="",
            frontend_url="http://localhost:3000",
        )

    app.dependency_overrides[get_settings] = _settings
    try:
        client = TestClient(app)
        res = client.get("/api/v1/billing/plans")
        assert res.status_code == 200
        body = res.json()
        assert body["checkout_configured"] is True
        prem = next(p for p in body["plans"] if p["id"] == "premium")
        assert prem["list_price_monthly"] == 49.0
        assert prem["list_price_currency"] == "PLN"
        assert prem["monthly_list_price_usd"] == 12.1  # 49 / 4.05 rounded
    finally:
        app.dependency_overrides.pop(get_settings, None)


def test_list_plans_no_live_price_without_secret() -> None:
    def _settings() -> Settings:
        return Settings(
            stripe_secret_key="",
            stripe_price_id_premium="price_prem",
            stripe_price_id_pro="",
            frontend_url="http://localhost:3000",
        )

    app.dependency_overrides[get_settings] = _settings
    try:
        client = TestClient(app)
        res = client.get("/api/v1/billing/plans")
        body = res.json()
        assert body["checkout_configured"] is False
        prem = next(p for p in body["plans"] if p["id"] == "premium")
        assert prem["list_price_monthly"] is None
        assert prem["list_price_currency"] is None
        assert prem["monthly_list_price_usd"] == 4.99
    finally:
        app.dependency_overrides.pop(get_settings, None)
