"""Stripe invoice.payment_failed webhook handler."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, User
from app.services.stripe_billing import process_invoice_payment_failed


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    s = Session()
    try:
        yield s
    finally:
        s.close()


def test_invoice_payment_failed_refreshes_subscription(db_session):
    u = User(
        email="stripe-fail@example.com",
        hashed_password="x",
        stripe_customer_id="cus_test1",
        plan_tier="premium",
        subscription_status="active",
    )
    db_session.add(u)
    db_session.commit()

    settings = SimpleNamespace(
        stripe_secret_key="sk_test_123",
        stripe_price_id_premium="price_prem",
        stripe_price_id_pro="",
    )
    fake_sub = {
        "id": "sub_test1",
        "customer": "cus_test1",
        "status": "past_due",
        "items": {"data": [{"price": {"id": "price_prem"}}]},
        "current_period_end": 2_000_000_000,
    }
    with patch("app.services.stripe_billing.stripe.Subscription.retrieve", return_value=fake_sub):
        process_invoice_payment_failed(
            db_session,
            {"customer": "cus_test1", "subscription": "sub_test1"},
            settings,
        )
    db_session.refresh(u)
    assert u.subscription_status == "past_due"
    assert u.plan_tier == "premium"
