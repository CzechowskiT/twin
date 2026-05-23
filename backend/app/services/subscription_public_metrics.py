"""Public subscription counters for investor surfaces (no Stripe API calls on hot path)."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import User

_PAID_STATUSES = frozenset({"active", "trialing", "past_due"})
_PREMIUM_MRR_USD = 4.99
_PRO_MRR_USD = 9.99


def count_paid_subscribers(db: Session) -> int:
    return int(
        db.query(func.count())
        .select_from(User)
        .filter(User.subscription_status.in_(_PAID_STATUSES))
        .scalar()
        or 0,
    )


def subscription_mrr_usd(db: Session, *, stripe_checkout_ready: bool) -> float | None:
    """Sum list-price MRR from entitled users; None when Stripe is not wired (investor stub)."""
    if not stripe_checkout_ready:
        return None
    premium = int(
        db.query(func.count())
        .select_from(User)
        .filter(
            User.subscription_status.in_(_PAID_STATUSES),
            User.plan_tier == "premium",
        )
        .scalar()
        or 0,
    )
    pro = int(
        db.query(func.count())
        .select_from(User)
        .filter(
            User.subscription_status.in_(_PAID_STATUSES),
            User.plan_tier == "pro",
        )
        .scalar()
        or 0,
    )
    other = int(
        db.query(func.count())
        .select_from(User)
        .filter(
            User.subscription_status.in_(_PAID_STATUSES),
            ~User.plan_tier.in_(("premium", "pro", "free")),
        )
        .scalar()
        or 0,
    )
    return round(premium * _PREMIUM_MRR_USD + pro * _PRO_MRR_USD + other * _PREMIUM_MRR_USD, 2)
