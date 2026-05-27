"""Unit tests for `app.services.stripe_events` (dedup helpers).

These cover the **algorithm** of the dedup ledger; the wire-up into
`app/api/billing.py` ships in a follow-up commit alongside the
Alembic migration. The migration is the one piece these tests do
not exercise (we just rely on `Base.metadata.create_all(engine)` to
mint the table in the SQLite fixture).

Pairs with `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, StripeWebhookEvent
from app.services import stripe_events


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_record_received_inserts_new_pending_row(db_session: Session) -> None:
    """First delivery → fresh row in `pending`."""
    row = stripe_events.record_received(
        db_session,
        event_id="evt_test_001",
        event_type="invoice.payment_succeeded",
        livemode=False,
    )
    db_session.commit()
    assert row is not None
    assert row.event_id == "evt_test_001"
    assert row.event_type == "invoice.payment_succeeded"
    assert row.handler_status == stripe_events.STATUS_PENDING
    assert row.processed_at is None
    assert row.error_message is None
    assert row.livemode is False

    persisted = (
        db_session.query(StripeWebhookEvent)
        .filter(StripeWebhookEvent.event_id == "evt_test_001")
        .one()
    )
    assert persisted.id == row.id


def test_record_received_returns_existing_row_on_replay(db_session: Session) -> None:
    """Second call with the same `event_id` returns the existing row."""
    first = stripe_events.record_received(
        db_session,
        event_id="evt_test_002",
        event_type="invoice.payment_succeeded",
    )
    db_session.commit()
    assert first is not None
    stripe_events.mark_success(db_session, first)
    db_session.commit()

    second = stripe_events.record_received(
        db_session,
        event_id="evt_test_002",
        event_type="invoice.payment_succeeded",
    )
    assert second is not None
    assert second.id == first.id
    assert second.handler_status == stripe_events.STATUS_SUCCESS


def test_already_processed_is_true_only_for_finished_handlers(db_session: Session) -> None:
    """`already_processed` returns True for `success`/`ignored` only, False otherwise."""
    row = stripe_events.record_received(
        db_session,
        event_id="evt_test_003",
        event_type="invoice.payment_succeeded",
    )
    db_session.commit()
    # `pending` → not yet processed.
    assert stripe_events.already_processed(db_session, "evt_test_003") is False

    stripe_events.mark_success(db_session, row)
    db_session.commit()
    assert stripe_events.already_processed(db_session, "evt_test_003") is True

    # Another event ends in `failed`.
    row_fail = stripe_events.record_received(
        db_session,
        event_id="evt_test_004",
        event_type="invoice.payment_succeeded",
    )
    db_session.commit()
    stripe_events.mark_failed(db_session, row_fail, "Boom")
    db_session.commit()
    # `failed` is **not** considered processed — Stripe should retry.
    assert stripe_events.already_processed(db_session, "evt_test_004") is False


def test_already_processed_returns_false_for_unknown_event(db_session: Session) -> None:
    """Never-seen event_id → False, never raises."""
    assert stripe_events.already_processed(db_session, "evt_never_seen") is False
    # Empty / falsy event ids → False.
    assert stripe_events.already_processed(db_session, "") is False


def test_mark_failed_truncates_long_error_messages(db_session: Session) -> None:
    """Long error messages don't blow up the column width.

    The schema reserves a `Text` column so SQLite never truncates,
    but a 50 KB stack trace in a log line is a noise problem on its
    own. Cap at 1000 chars (still useful for triage).
    """
    row = stripe_events.record_received(
        db_session,
        event_id="evt_test_005",
        event_type="invoice.payment_succeeded",
    )
    db_session.commit()
    big_msg = "x" * 5000
    stripe_events.mark_failed(db_session, row, big_msg)
    db_session.commit()
    persisted = db_session.query(StripeWebhookEvent).filter_by(event_id="evt_test_005").one()
    assert persisted.handler_status == stripe_events.STATUS_FAILED
    assert persisted.error_message is not None
    assert len(persisted.error_message) == 1000


def test_helpers_noop_when_ledger_table_missing(db_session: Session) -> None:
    """Production fallback: drop the table and confirm the helpers degrade.

    This mirrors the prod state today — the model is registered but
    the migration has not yet shipped, so the table doesn't exist.
    All five helpers must behave as `None` / `False` rather than
    raise — that's the whole point of the safety guard.
    """
    db_session.execute(text("DROP TABLE stripe_webhook_events"))
    db_session.commit()

    assert stripe_events.already_processed(db_session, "evt_anything") is False
    row = stripe_events.record_received(
        db_session,
        event_id="evt_test_006",
        event_type="invoice.payment_succeeded",
    )
    assert row is None
    # Mark_* on None must be a no-op (idempotent across schema flips).
    stripe_events.mark_success(db_session, None)
    stripe_events.mark_failed(db_session, None, "anything")
    stripe_events.mark_ignored(db_session, None)


def test_mark_ignored_is_treated_as_processed(db_session: Session) -> None:
    """Acknowledged-but-unhandled events stay out of the dispatch path on replay."""
    row = stripe_events.record_received(
        db_session,
        event_id="evt_test_007",
        event_type="payment_method.attached",
    )
    db_session.commit()
    stripe_events.mark_ignored(db_session, row)
    db_session.commit()
    assert stripe_events.already_processed(db_session, "evt_test_007") is True
    persisted = db_session.query(StripeWebhookEvent).filter_by(event_id="evt_test_007").one()
    assert persisted.handler_status == stripe_events.STATUS_IGNORED
    assert persisted.processed_at is not None
