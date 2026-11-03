"""B2B company Stripe sandbox checkout — test-mode only; never public launch."""

from __future__ import annotations

import logging
from typing import Any

from app.config import Settings

logger = logging.getLogger(__name__)


def stripe_key_mode(secret_key: str) -> str:
    key = (secret_key or "").strip()
    if key.startswith("sk_live"):
        return "live"
    if key.startswith("sk_test"):
        return "test"
    if key:
        return "unknown"
    return "missing"


def create_company_sandbox_checkout(
    settings: Settings,
    *,
    company_slug: str,
    plan_sku: str,
    account_id: int,
) -> dict[str, Any]:
    """Create Stripe Checkout Session in test mode, or honest sandbox_stub.

    Never returns a fake cs_* that looks like a real Stripe session when keys
    are missing. Live-mode keys are rejected by the caller.
    """
    secret = (settings.stripe_secret_key or "").strip()
    mode = stripe_key_mode(secret)
    price_id = (getattr(settings, "stripe_price_id_company_pilot", None) or "").strip()
    frontend = (settings.frontend_url or "").rstrip("/")
    honesty = {
        "stripe_not_public_launch": bool(getattr(settings, "stripe_not_public_launch", True)),
        "stripe_sandbox_checkout_enabled": bool(
            getattr(settings, "stripe_sandbox_checkout_enabled", True)
        ),
        "public_launch": False,
    }
    # Uses STRIPE_PRICE_ID_COMPANY_PILOT when set; sandbox_ready only with test keys + price.
    sandbox_ready = mode == "test" and bool(price_id) and honesty["stripe_sandbox_checkout_enabled"]
    honesty["sandbox_ready"] = sandbox_ready

    if mode == "live":
        return {
            **honesty,
            "company_slug": company_slug,
            "checkout_enabled": False,
            "sandbox": False,
            "livemode": True,
            "stripe_mode": "live_forbidden",
            "session_id": None,
            "url": None,
            "reason": "live_stripe_forbidden_in_completion_batch",
        }

    if mode != "test":
        return {
            **honesty,
            "company_slug": company_slug,
            "checkout_enabled": False,
            "sandbox": True,
            "livemode": False,
            "stripe_mode": "sandbox_stub",
            "session_id": None,
            "url": None,
            "reason": "stripe_keys_missing",
            "note": "Honest stub — set STRIPE_SECRET_KEY (sk_test_…) for real test Checkout.",
            "price_env": "STRIPE_PRICE_ID_COMPANY_PILOT",
        }

    if not price_id:
        return {
            **honesty,
            "company_slug": company_slug,
            "checkout_enabled": False,
            "sandbox": True,
            "livemode": False,
            "stripe_mode": "sandbox_stub",
            "session_id": None,
            "url": None,
            "reason": "company_price_id_missing",
            "note": "Set STRIPE_PRICE_ID_COMPANY_PILOT for real test Checkout Session.",
            "price_env": "STRIPE_PRICE_ID_COMPANY_PILOT",
        }

    try:
        import stripe

        stripe.api_key = secret
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{frontend}/company/billing?checkout=success",
            cancel_url=f"{frontend}/company/billing?checkout=cancel",
            metadata={
                "company_slug": company_slug[:80],
                "plan_sku": plan_sku[:64],
                "company_billing_account_id": str(account_id),
                "twin_sandbox": "1",
            },
            payment_method_types=["card"],
        )
        return {
            **honesty,
            "company_slug": company_slug,
            "checkout_enabled": True,
            "sandbox": True,
            "livemode": False,
            "stripe_mode": "test",
            "session_id": session.id,
            "url": session.url,
            "note": "Stripe test-mode Checkout Session — not public launch.",
        }
    except Exception as exc:
        logger.warning("company sandbox checkout failed: %s", exc)
        return {
            **honesty,
            "company_slug": company_slug,
            "checkout_enabled": False,
            "sandbox": True,
            "livemode": False,
            "stripe_mode": "sandbox_stub",
            "session_id": None,
            "url": None,
            "reason": "stripe_checkout_create_failed",
            "note": "Honest stub after Stripe API error — check test Price id / key.",
        }
