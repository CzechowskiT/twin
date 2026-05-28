"""Stripe webhook dedup wire-up in `app/api/billing.py`.

Exercises the ledger when `stripe_webhook_events` exists (SQLite
`create_all` in tests). Production without migration still degrades
via `stripe_events` helpers — see `test_stripe_event_dedup_helpers.py`.

Replay fixture matrix for continuation slices:

- duplicate event id, same payload body (`invoice.payment_succeeded`,
  `checkout.session.completed`);
- duplicate event id, changed payload body hash (same id, different object);
- signed unsupported event replay (`customer.created`) is covered in
  `test_stripe_webhook_signature.py`;
- malformed signed payload coverage is in
  `test_stripe_webhook_signature.py`.
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


def _checkout_payload(event_id: str) -> bytes:
    return json.dumps(
        {
            "id": event_id,
            "type": "checkout.session.completed",
            "livemode": False,
            "data": {
                "object": {
                    "id": "cs_test_123",
                    "customer": "cus_test",
                    "subscription": "sub_test",
                    "metadata": {"user_id": "1"},
                }
            },
        }
    ).encode("utf-8")


@pytest.fixture
def invoice_replay_payloads() -> tuple[str, bytes, bytes]:
    """Canonical replay fixture: same Stripe `event.id`, different payload bodies."""
    event_id = "evt_idempotency_invoice_payload_drift_001"
    first_payload = _invoice_payload(event_id)
    replay_payload = json.dumps(
        {
            "id": event_id,
            "type": "invoice.payment_succeeded",
            "livemode": False,
            "data": {
                "object": {
                    "customer": "cus_test_changed",
                    "subscription": "sub_test_changed",
                    "amount_paid": 9999,
                    "billing_reason": "subscription_cycle",
                }
            },
        }
    ).encode("utf-8")
    return event_id, first_payload, replay_payload


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

    def _track_checkout(db, session_data, settings):  # noqa: ANN001
        calls.append("checkout")
        return None

    monkeypatch.setattr(
        "app.api.billing.stripe_svc.process_invoice_payment_succeeded",
        _track_invoice,
    )
    monkeypatch.setattr(
        "app.api.billing.stripe_svc.process_checkout_completed",
        _track_checkout,
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


def test_replay_with_same_event_id_but_changed_payload_is_deduped(
    client: tuple[TestClient, sessionmaker],
    invoice_replay_payloads: tuple[str, bytes, bytes],
) -> None:
    """Dedup is keyed by Stripe `event.id` even if payload body drifts on replay."""
    http, session_local = client
    event_id, first_payload, second_payload = invoice_replay_payloads

    first = http.post(
        "/api/v1/billing/webhook",
        content=first_payload,
        headers={"Content-Type": "application/json", "stripe-signature": _sign(first_payload)},
    )
    assert first.status_code == 200, first.text

    second = http.post(
        "/api/v1/billing/webhook",
        content=second_payload,
        headers={"Content-Type": "application/json", "stripe-signature": _sign(second_payload)},
    )
    assert second.status_code == 200, second.text
    assert second.json().get("replayed") == "true"
    assert http._stripe_invoice_calls == ["invoice"]  # type: ignore[attr-defined]

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_SUCCESS
        assert row.event_type == "invoice.payment_succeeded"
    finally:
        db.close()


def test_invoice_replay_fixture_keeps_same_event_id(
    invoice_replay_payloads: tuple[str, bytes, bytes],
) -> None:
    """Fixture safety: replay payloads must keep `event.id` stable across deliveries."""
    event_id, first_payload, second_payload = invoice_replay_payloads
    first = json.loads(first_payload.decode("utf-8"))
    second = json.loads(second_payload.decode("utf-8"))
    assert first["id"] == event_id
    assert second["id"] == event_id
    assert first != second


def test_duplicate_checkout_event_dispatches_handler_once(
    client: tuple[TestClient, sessionmaker],
) -> None:
    """Replay of `checkout.session.completed` must not re-enter the handler."""
    http, session_local = client
    event_id = "evt_idempotency_checkout_001"
    payload = _checkout_payload(event_id)
    sig = _sign(payload)
    headers = {"Content-Type": "application/json", "stripe-signature": sig}

    first = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert first.status_code == 200, first.text
    assert first.json().get("replayed") is None

    second = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert second.status_code == 200, second.text
    assert second.json().get("replayed") == "true"

    assert http._stripe_invoice_calls == ["checkout"]  # type: ignore[attr-defined]

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_SUCCESS
        assert row.event_type == "checkout.session.completed"
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


def test_unhandled_event_replay_short_circuits_dispatch(
    client: tuple[TestClient, sessionmaker],
) -> None:
    """Replayed unhandled event should return `replayed=true` and not re-run dispatch."""
    http, session_local = client
    event_id = "evt_idempotency_ignored_002"
    payload = json.dumps({"id": event_id, "type": "customer.created", "data": {"object": {}}}).encode(
        "utf-8"
    )
    sig = _sign(payload)
    headers = {"Content-Type": "application/json", "stripe-signature": sig}

    first = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert first.status_code == 200, first.text
    assert first.json().get("replayed") is None

    second = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert second.status_code == 200, second.text
    assert second.json().get("replayed") == "true"

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_IGNORED
    finally:
        db.close()


def test_handler_failure_marks_ledger_failed(
    client: tuple[TestClient, sessionmaker],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When dispatch raises, ledger row is `failed` and Stripe gets 500."""
    http, session_local = client
    event_id = "evt_idempotency_fail_001"
    payload = _invoice_payload(event_id)
    sig = _sign(payload)
    headers = {"Content-Type": "application/json", "stripe-signature": sig}

    def _boom(db, invoice, settings):  # noqa: ANN001
        raise RuntimeError("simulated handler failure")

    monkeypatch.setattr(
        "app.api.billing.stripe_svc.process_invoice_payment_succeeded",
        _boom,
    )

    r = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert r.status_code == 500, r.text

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_FAILED
        assert row.error_message is not None
    finally:
        db.close()


def test_failed_event_is_retried_and_can_transition_to_success(
    client: tuple[TestClient, sessionmaker],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`failed` rows are retried; next successful delivery flips status to `success`."""
    http, session_local = client
    event_id = "evt_idempotency_retry_001"
    payload = _invoice_payload(event_id)
    sig = _sign(payload)
    headers = {"Content-Type": "application/json", "stripe-signature": sig}
    attempts: list[str] = []

    def _fail_once_then_pass(db, invoice, settings):  # noqa: ANN001
        attempts.append("invoice")
        if len(attempts) == 1:
            raise RuntimeError("simulated first failure")
        return None

    monkeypatch.setattr(
        "app.api.billing.stripe_svc.process_invoice_payment_succeeded",
        _fail_once_then_pass,
    )

    first = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert first.status_code == 500, first.text

    second = http.post("/api/v1/billing/webhook", content=payload, headers=headers)
    assert second.status_code == 200, second.text
    assert second.json().get("replayed") is None
    assert attempts == ["invoice", "invoice"]

    db = session_local()
    try:
        row = db.query(StripeWebhookEvent).filter_by(event_id=event_id).one()
        assert row.handler_status == stripe_events.STATUS_SUCCESS
        assert row.processed_at is not None
    finally:
        db.close()
