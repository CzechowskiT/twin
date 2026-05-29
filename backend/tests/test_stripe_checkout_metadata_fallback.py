from __future__ import annotations

import json
import time
from collections.abc import Iterator

import pytest
import stripe
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.database.models import Base, User
from app.database.session import get_db
from app.main import create_app

WEBHOOK_SECRET = "whsec_test_only_not_a_real_secret"  # noqa: S105
STRIPE_API_KEY_STUB = "sk_test_only_not_a_real_key"  # noqa: S105


def _configured_settings() -> Settings:
    return Settings(
        environment="test",
        secret_key="x" * 32,
        stripe_secret_key=STRIPE_API_KEY_STUB,
        stripe_webhook_secret=WEBHOOK_SECRET,
    )


def _sqlite_session_factory() -> sessionmaker:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _sign(payload: bytes, *, secret: str = WEBHOOK_SECRET) -> str:
    ts = str(int(time.time()))
    signed = f"{ts}.{payload.decode('utf-8')}"
    v1 = stripe.WebhookSignature._compute_signature(signed, secret)  # noqa: SLF001
    return f"t={ts},v1={v1}"


@pytest.fixture
def client() -> Iterator[tuple[TestClient, sessionmaker]]:
    session_local = _sqlite_session_factory()

    def override_db() -> Iterator:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_settings] = _configured_settings
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as c:
            yield c, session_local
    finally:
        app.dependency_overrides.clear()


def test_checkout_metadata_fallback_uses_customer_email(
    client: tuple[TestClient, sessionmaker],
) -> None:
    http, session_local = client
    db = session_local()
    try:
        user = User(email="stripe-fallback@example.com", hashed_password="x")
        db.add(user)
        db.commit()
    finally:
        db.close()

    payload = json.dumps(
        {
            "id": "evt_checkout_metadata_fallback_001",
            "type": "checkout.session.completed",
            "livemode": False,
            "data": {
                "object": {
                    "id": "cs_test_fallback",
                    "customer": "cus_checkout_fallback_001",
                    "customer_details": {"email": "stripe-fallback@example.com"},
                    "metadata": {},
                }
            },
        }
    ).encode("utf-8")
    response = http.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "stripe-signature": _sign(payload),
        },
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"received": "true"}

    db = session_local()
    try:
        refreshed = db.query(User).filter(User.email == "stripe-fallback@example.com").one()
        assert refreshed.stripe_customer_id == "cus_checkout_fallback_001"
    finally:
        db.close()
