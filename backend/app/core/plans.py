"""Product plan tiers and entitlements (Stripe maps paid users onto these tiers)."""

from __future__ import annotations

from enum import Enum

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, User


class PlanTier(str, Enum):
    FREE = "free"
    STANDBY = "standby"
    STANDARD = "standard"
    PREMIUM = "premium"
    PRO = "pro"


ACTIVE_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing", "past_due"})


def effective_plan_tier(user: User) -> PlanTier:
    """Paid tier only while Stripe subscription is active or trialing."""
    status = getattr(user, "subscription_status", None)
    if status in ACTIVE_SUBSCRIPTION_STATUSES:
        raw = (getattr(user, "plan_tier", None) or "premium").lower()
        try:
            return PlanTier(raw)
        except ValueError:
            return PlanTier.PREMIUM
    return PlanTier.FREE


def max_tracked_applications(plan: PlanTier) -> int | None:
    """None = unlimited. Rejected rows do not consume a slot."""
    if plan in (PlanTier.FREE, PlanTier.STANDBY):
        return 25
    return None


def count_tracked_applications(db: Session, candidate_id: int) -> int:
    return (
        db.query(Application)
        .filter(
            Application.candidate_id == candidate_id,
            Application.status != ApplicationStatus.REJECTED,
        )
        .count()
    )
