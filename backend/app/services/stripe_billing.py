"""Stripe Checkout, Customer Portal, and webhook-driven subscription state."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import stripe
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import User
from app.services import referral_program as referral_prog

logger = logging.getLogger(__name__)

# Stripe Checkout `payment_method_types` for subscription mode — unknown env entries are dropped (logged).
# Apple Pay / Google Pay are not separate ids: they appear on `card` when the account + browser support wallets.
_CHECKOUT_SUBSCRIPTION_TYPES: frozenset[str] = frozenset(
    {
        "card",
        "link",
        "amazon_pay",
        "paypal",
        "us_bank_account",
        "sepa_debit",
        "bacs_debit",
        "acss_debit",
        "bancontact",
        "eps",
        "giropay",
        "ideal",
        "p24",
        "blik",
        "cashapp",
        "customer_balance",
        "konbini",
        "paynow",
        "promptpay",
        "grabpay",
        "oxxo",
        "boleto",
        "fpx",
        "afterpay_clearpay",
        "klarna",
        "affirm",
    }
)


def checkout_payment_method_types(settings: Settings) -> list[str]:
    """Parse STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES; default card + Link."""
    raw = (settings.stripe_checkout_payment_method_types or "").strip()
    if not raw:
        return ["card", "link"]
    seen: set[str] = set()
    out: list[str] = []
    for part in raw.split(","):
        p = part.strip().lower()
        if not p or p in seen:
            continue
        if p not in _CHECKOUT_SUBSCRIPTION_TYPES:
            logger.warning("Ignoring unknown Stripe checkout payment_method_type: %s", p)
            continue
        seen.add(p)
        out.append(p)
    return out if out else ["card", "link"]


def checkout_payment_methods_note(types: list[str]) -> str:
    """Short English sentence for API consumers (dashboard shows typed chips too)."""
    if not types:
        return "Checkout uses Stripe-hosted payment methods from server configuration."
    if types == ["card"]:
        return (
            "Checkout: cards — Apple Pay and Google Pay show automatically when the browser "
            "and Stripe account support them."
        )
    if set(types) == {"card", "link"}:
        return (
            "Checkout: cards (with Apple Pay / Google Pay when supported) and Stripe Link — "
            "hosted by Stripe."
        )
    joined = ", ".join(types)
    return f"Checkout payment method types (Stripe): {joined}."


def _subscription_as_dict(sub: Any) -> dict[str, Any]:
    if isinstance(sub, dict):
        return sub
    to_dict = getattr(sub, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    return dict(sub)


def configure_stripe(settings: Settings) -> None:
    if settings.stripe_secret_key:
        stripe.api_key = settings.stripe_secret_key


def price_id_for_plan(settings: Settings, plan: str) -> str:
    if plan == "premium":
        if not settings.stripe_price_id_premium:
            raise ValueError("billing_not_configured")
        return settings.stripe_price_id_premium
    if plan == "pro":
        if not settings.stripe_price_id_pro:
            raise ValueError("pro_not_configured")
        return settings.stripe_price_id_pro
    raise ValueError("unknown_plan")


def tier_for_price_id(settings: Settings, price_id: str | None) -> str:
    if not price_id:
        return "premium"
    if price_id == settings.stripe_price_id_premium:
        return "premium"
    if settings.stripe_price_id_pro and price_id == settings.stripe_price_id_pro:
        return "pro"
    return "premium"


def _period_end(sub: dict[str, Any]) -> datetime | None:
    ts = sub.get("current_period_end")
    if not ts:
        return None
    return datetime.utcfromtimestamp(int(ts))


def apply_subscription_dict(user: User, sub: dict[str, Any], settings: Settings) -> None:
    status = sub.get("status") or ""
    items = (sub.get("items") or {}).get("data") or []
    price_id = (items[0].get("price") or {}).get("id") if items else None
    user.stripe_subscription_id = sub.get("id") or user.stripe_subscription_id
    user.subscription_status = status
    user.subscription_current_period_end = _period_end(sub)
    if status in ("canceled", "incomplete_expired"):
        user.plan_tier = "free"
        user.stripe_subscription_id = None
        user.subscription_status = None
        user.subscription_current_period_end = None
        return
    user.plan_tier = tier_for_price_id(settings, price_id)


def clear_paid_subscription(user: User) -> None:
    user.plan_tier = "free"
    user.stripe_subscription_id = None
    user.subscription_status = None
    user.subscription_current_period_end = None


def user_by_stripe_customer(db: Session, customer_id: str | dict | None) -> User | None:
    if not customer_id:
        return None
    if isinstance(customer_id, dict):
        customer_id = customer_id.get("id")
    if not isinstance(customer_id, str):
        return None
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def process_checkout_completed(db: Session, session: dict[str, Any], settings: Settings) -> None:
    meta = session.get("metadata") or {}
    uid = meta.get("user_id")
    if not uid:
        logger.warning("checkout.session.completed missing user_id metadata")
        return
    user = db.query(User).filter(User.id == int(uid)).first()
    if not user:
        logger.warning("checkout user id not found: %s", uid)
        return
    cust = session.get("customer")
    if isinstance(cust, dict):
        cust = cust.get("id")
    if isinstance(cust, str) and cust:
        user.stripe_customer_id = cust
    sub_id = session.get("subscription")
    if isinstance(sub_id, dict):
        sub_id = sub_id.get("id")
    if sub_id:
        configure_stripe(settings)
        sub = stripe.Subscription.retrieve(sub_id)
        apply_subscription_dict(user, _subscription_as_dict(sub), settings)
    db.commit()


def process_subscription_updated(db: Session, sub: dict[str, Any], settings: Settings) -> None:
    user = user_by_stripe_customer(db, sub.get("customer"))
    if not user:
        return
    apply_subscription_dict(user, sub, settings)
    db.commit()


def process_subscription_deleted(db: Session, sub: dict[str, Any]) -> None:
    user = user_by_stripe_customer(db, sub.get("customer"))
    if not user:
        return
    clear_paid_subscription(user)
    db.commit()


def process_invoice_payment_succeeded(db: Session, invoice: dict[str, Any], settings: Settings) -> None:
    """Count paid subscription invoices for referral retention bonuses (idempotent per payout row)."""
    cust = invoice.get("customer")
    if isinstance(cust, dict):
        cust = cust.get("id")
    sub_id = invoice.get("subscription")
    if isinstance(sub_id, dict):
        sub_id = sub_id.get("id")
    if not sub_id:
        return
    try:
        if int(invoice.get("amount_paid") or 0) <= 0:
            return
    except (TypeError, ValueError):
        return
    reason = str(invoice.get("billing_reason") or "")
    if reason not in ("subscription_create", "subscription_cycle", "subscription_update"):
        return
    user = user_by_stripe_customer(db, cust)
    if not user:
        return
    referral_prog.on_subscription_invoice_paid(db, user, settings)
    db.commit()
