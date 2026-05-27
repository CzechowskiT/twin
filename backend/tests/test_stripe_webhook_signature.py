"""Stripe webhook signature handling — minimal contract test.

Belongs with the audit in
`docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`. The tests below freeze
the current behaviour of `POST /api/v1/billing/webhook` so a future
refactor cannot silently weaken it:

* request with no `stripe-signature` header is rejected (no body parsing,
  no DB writes, no handler dispatch);
* request with a malformed signature is rejected;
* a correctly signed event with no registered handler (`customer.created`)
  returns 200 — i.e. the signature path is the only ingestion gate;
* when the webhook secret is not configured on this deployment, the
  endpoint refuses to accept *any* event (503, not silently accepting
  unsigned traffic).

We do NOT exercise a real `checkout.session.completed` flow here —
that path mutates DB state and is outside the scope of a security
audit test.
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
from app.database.models import Base
from app.database.session import get_db
from app.main import create_app


WEBHOOK_SECRET = "whsec_test_only_not_a_real_secret"  # noqa: S105 — local test fixture
STRIPE_API_KEY_STUB = "sk_test_only_not_a_real_key"  # noqa: S105 — local test fixture


def _configured_settings() -> Settings:
    """Settings with billing+webhook *configured* so we reach the signature check."""
    return Settings(
        environment="test",
        secret_key="x" * 32,
        stripe_secret_key=STRIPE_API_KEY_STUB,
        stripe_webhook_secret=WEBHOOK_SECRET,
    )


def _unconfigured_settings() -> Settings:
    """Settings without webhook secret — endpoint must refuse traffic."""
    return Settings(
        environment="test",
        secret_key="x" * 32,
        stripe_secret_key="",
        stripe_webhook_secret="",
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
    """Build the `stripe-signature` header for `payload`.

    Mirrors what Stripe does on the wire so `stripe.Webhook.construct_event`
    accepts the signature.
    """
    ts = str(int(time.time()))
    signed = f"{ts}.{payload.decode('utf-8')}"
    v1 = stripe.WebhookSignature._compute_signature(signed, secret)  # noqa: SLF001
    return f"t={ts},v1={v1}"


def _client_with(settings_provider) -> Iterator[TestClient]:
    SessionLocal = _sqlite_session_factory()

    def override_db() -> Iterator:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_settings] = settings_provider
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def client() -> Iterator[TestClient]:
    yield from _client_with(_configured_settings)


@pytest.fixture
def unconfigured_client() -> Iterator[TestClient]:
    yield from _client_with(_unconfigured_settings)


def test_webhook_rejects_request_without_signature_header(client: TestClient) -> None:
    """Missing `stripe-signature` is a hard reject (no body parsing)."""
    r = client.post(
        "/api/v1/billing/webhook",
        content=b'{"id":"evt_unsigned","type":"customer.created","data":{"object":{}}}',
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail", "")
    assert "stripe-signature" in detail.lower() or "missing" in detail.lower()


def test_webhook_rejects_invalid_signature(client: TestClient) -> None:
    """A `stripe-signature` header that fails HMAC check is rejected."""
    r = client.post(
        "/api/v1/billing/webhook",
        content=b'{"id":"evt_bad_sig","type":"customer.created","data":{"object":{}}}',
        headers={
            "Content-Type": "application/json",
            "stripe-signature": "t=1,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        },
    )
    assert r.status_code == 400, r.text


def test_webhook_rejects_signature_signed_with_wrong_secret(client: TestClient) -> None:
    """Defence in depth — a syntactically valid header signed with a different secret fails."""
    payload = b'{"id":"evt_wrong_secret","type":"customer.created","data":{"object":{}}}'
    bad_sig = _sign(payload, secret="whsec_some_other_secret")
    r = client.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"Content-Type": "application/json", "stripe-signature": bad_sig},
    )
    assert r.status_code == 400, r.text


def test_webhook_accepts_valid_signature_for_unhandled_event(client: TestClient) -> None:
    """Correctly signed event with no registered handler returns 200, no side effect.

    Uses `customer.created` because the route only dispatches a handful of
    event types (`checkout.session.completed`,
    `customer.subscription.updated`, `customer.subscription.deleted`,
    `invoice.payment_succeeded`). Anything else is a no-op, which keeps
    this signature test free of DB writes.
    """
    payload = json.dumps(
        {"id": "evt_test_signed_ok", "type": "customer.created", "data": {"object": {}}}
    ).encode("utf-8")
    sig = _sign(payload)
    r = client.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"Content-Type": "application/json", "stripe-signature": sig},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"received": "true"}


def test_webhook_rejects_event_without_id(client: TestClient) -> None:
    """Signed payload missing `id` is rejected before handler dispatch."""
    payload = json.dumps({"type": "customer.created", "data": {"object": {}}}).encode("utf-8")
    sig = _sign(payload)
    r = client.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"Content-Type": "application/json", "stripe-signature": sig},
    )
    assert r.status_code == 400, r.text


def test_webhook_refuses_traffic_when_unconfigured(unconfigured_client: TestClient) -> None:
    """If `stripe_webhook_secret` is not set, endpoint returns 503 (does not silently accept)."""
    r = unconfigured_client.post(
        "/api/v1/billing/webhook",
        content=b'{"id":"evt_x","type":"customer.created","data":{"object":{}}}',
        headers={
            "Content-Type": "application/json",
            "stripe-signature": "t=1,v1=anything",
        },
    )
    assert r.status_code == 503, r.text
