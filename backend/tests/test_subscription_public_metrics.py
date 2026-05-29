"""Tests for public subscription counters."""

from datetime import datetime, timezone

from app.database.models import User
from app.services.subscription_public_metrics import count_paid_subscribers, subscription_mrr_usd
from tests.test_auth_integration import _sqlite_session


def test_count_paid_subscribers_and_mrr() -> None:
    db = _sqlite_session()
    try:
        db.add(
            User(
                email="paid@example.com",
                hashed_password="x",
                gdpr_consent_at=datetime.now(timezone.utc),
                plan_tier="premium",
                subscription_status="active",
            )
        )
        db.add(
            User(
                email="pro@example.com",
                hashed_password="x",
                gdpr_consent_at=datetime.now(timezone.utc),
                plan_tier="pro",
                subscription_status="trialing",
            )
        )
        db.add(
            User(
                email="free@example.com",
                hashed_password="x",
                gdpr_consent_at=datetime.now(timezone.utc),
                plan_tier="free",
                subscription_status=None,
            )
        )
        db.commit()
        assert count_paid_subscribers(db) == 2
        assert subscription_mrr_usd(db, stripe_checkout_ready=False) is None
        assert subscription_mrr_usd(db, stripe_checkout_ready=True) == 14.98
    finally:
        db.close()
