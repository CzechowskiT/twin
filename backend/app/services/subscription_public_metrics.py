"""Public subscription counters for investor surfaces (no Stripe API calls on hot path)."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import User

_PAID_STATUSES = frozenset({"active", "trialing", "past_due"})
_STANDBY_MRR_USD = 0.99
_STANDARD_MRR_USD = 1.99
_PREMIUM_MRR_USD = 4.99
_PRO_MRR_USD = 9.99

_TIER_MRR_USD: dict[str, float] = {
    "standby": _STANDBY_MRR_USD,
    "standard": _STANDARD_MRR_USD,
    "premium": _PREMIUM_MRR_USD,
    "pro": _PRO_MRR_USD,
}


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
    total = 0.0
    for tier, mrr in _TIER_MRR_USD.items():
        count = int(
            db.query(func.count())
            .select_from(User)
            .filter(
                User.subscription_status.in_(_PAID_STATUSES),
                User.plan_tier == tier,
            )
            .scalar()
            or 0,
        )
        total += count * mrr
    known = frozenset(_TIER_MRR_USD.keys())
    other = int(
        db.query(func.count())
        .select_from(User)
        .filter(
            User.subscription_status.in_(_PAID_STATUSES),
            ~User.plan_tier.in_(known | {"free"}),
        )
        .scalar()
        or 0,
    )
    return round(total + other * _PREMIUM_MRR_USD, 2)
