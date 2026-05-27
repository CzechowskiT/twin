"""Stripe webhook dedup wire-up in `app/api/billing.py`.

Exercises the ledger when `stripe_webhook_events` exists (SQLite
`create_all` in tests). Production without migration still degrades
via `stripe_events` helpers — see `test_stripe_event_dedup_helpers.py`.
"""

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
from app.database.models import Base, StripeWebhookEvent
from app.database.session import get_db
from app.main import create_app
from app.services import stripe_events

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


def _invoice_payload(event_id: str) -> bytes:
    return json.dumps(
        {
            "id": event_id,
            "type": "invoice.payment_succeeded",
            "livemode": False,
            "data": {
                "object": {
                    "customer": "cus_test",
                    "subscription": "sub_test",
                    "amount_paid": 1000,
                    "billing_reason": "subscription_cycle",
                }
            },
        }
    ).encode("utf-8")


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[TestClient, sessionmaker]]:
    session_local = _sqlite_session_factory()
    calls: list[str] = []

    def override_db() -> Iterator:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    def _track_invoice(db, invoice, settings):  # noqa: ANN001
        calls.append("invoice")
        return None

    monkeypatch.setattr(
        "app.api.billing.stripe_svc.process_invoice_payment_succeeded",
        _track_invoice,
    )

    app = create_app()
    app.dependency_overrides[get_settings] = _configured_settings
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as c:
            c._stripe_invoice_calls = calls  # type: ignore[attr-defined]
            yield c, session_local
    finally:
        app.dependency_overrides.clear()


def test_duplicate_invoice_event_dispatches_handler_once(
    client: tuple[TestClient, sessionmaker],
) -> None:
    http, session_local = client
    """Replay of the same `event.id` must not re-enter the handler."""
    event_id = "evt_idempotency_invoice_001"
    payload = _invoice_payload(event_id)
    sig = _sign(payload)
    headers = {"Content-Type": "application/json", "stripe-signature": sig}

    r1 = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert r1.status_code == 200, r1.text
    assert r1.json().get("replayed") is None

    r2 = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert r2.status_code == 200, r2.text
    assert r2.json().get("replayed") == "true"

    assert http._stripe_invoice_calls == ["invoice"]  # type: ignore[attr-defined]

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_SUCCESS
    finally:
        db.close()


def test_unhandled_event_is_marked_ignored(client: tuple[TestClient, sessionmaker]) -> None:
    http, session_local = client
    """Unhandled types still land in the ledger as `ignored` when the table exists."""
    payload = json.dumps(
        {"id": "evt_idempotency_ignored_001", "type": "customer.created", "data": {"object": {}}}
    ).encode("utf-8")
    sig = _sign(payload)
    r = http.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"Content-Type": "application/json", "stripe-signature": sig},
    )
    assert r.status_code == 200, r.text

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id="evt_idempotency_ignored_001").one()
        assert row.handler_status == stripe_events.STATUS_IGNORED
    finally:
        db.close()
