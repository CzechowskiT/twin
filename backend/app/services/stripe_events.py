"""Stripe webhook idempotency helpers.

Backs the dedup story sketched in
`docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`. The helpers are
written first so the wire-up commit can ship as a single 6-line
patch to `app/api/billing.py` once the Alembic migration lands.

Production safety today:

- The `stripe_webhook_events` ORM model is registered with
  SQLAlchemy `Base` so it appears in test fixtures (which run
  `Base.metadata.create_all(engine)`), but the production schema
  is migrated via Alembic only, so the table does **not yet
  exist** on Railway. Until the migration ships, **no caller in
  the prod codepath imports this module** — see
  `app/api/billing.py`.
- Every helper here either short-circuits when the table is
  missing (`OperationalError` / `ProgrammingError`) or commits
  atomically with the caller's transaction. This means even an
  accidental import in production never raises into the webhook
  request path; the helpers degrade to a no-op and the existing
  webhook still returns 200 to Stripe.

This module is **side-effect-free at import**; the safety guard
runs per-call.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Final

from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.database.models import StripeWebhookEvent

logger = logging.getLogger(__name__)

STATUS_PENDING: Final = "pending"
STATUS_SUCCESS: Final = "success"
STATUS_FAILED: Final = "failed"
STATUS_IGNORED: Final = "ignored"

# What `record_received` returns to callers in the prod-fallback path.
# Callers must treat `None` as "ledger unavailable, just run the handler".
LedgerRow = StripeWebhookEvent | None


def _ledger_unavailable(exc: Exception) -> bool:
    """Detect 'table not yet migrated' so callers can degrade to no-op.

    Distinct from a logic bug — we want a row-missing exception to be
    fatal so it's caught in CI, but a *table*-missing exception to be
    a silent fallback in production.
    """
    msg = str(exc).lower()
    return "no such table" in msg or "does not exist" in msg or "undefined table" in msg


def already_processed(db: Session, event_id: str) -> bool:
    """Return True if `event_id` has been processed successfully before.

    Used as a fast-path check at the top of the webhook handler. A
    "processed" row in any state other than `pending` short-circuits
    the dispatch; `pending` rows are usually mid-flight (another pod)
    and re-entering the handler is harmless because every dispatched
    handler is idempotent-by-design (see the audit doc).
    """
    if not event_id:
        return False
    try:
        existing: StripeWebhookEvent | None = (
            db.query(StripeWebhookEvent).filter(StripeWebhookEvent.event_id == event_id).first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if _ledger_unavailable(exc):
            logger.info("stripe_events ledger unavailable; degrading to no-op dedup")
            return False
        raise
    return existing is not None and existing.handler_status in (
        STATUS_SUCCESS,
        STATUS_IGNORED,
    )


def record_received(
    db: Session,
    *,
    event_id: str,
    event_type: str,
    livemode: bool = False,
) -> LedgerRow:
    """Insert a `pending` row for `event_id`, or return the existing row.

    Caller must commit the surrounding transaction. We do **not**
    commit here so the row is rolled back if the handler raises
    before we can `mark_success` / `mark_failed`.

    Returns:
        - the freshly-inserted row on first delivery;
        - the existing row on replay (handler should consult its
          `handler_status` to decide whether to re-run);
        - `None` when the ledger table is not yet migrated — the
          caller should run the handler unconditionally.
    """
    if not event_id:
        return None
    try:
        existing: StripeWebhookEvent | None = (
            db.query(StripeWebhookEvent).filter(StripeWebhookEvent.event_id == event_id).first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if _ledger_unavailable(exc):
            return None
        raise
    if existing is not None:
        return existing
    row = StripeWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        livemode=bool(livemode),
        handler_status=STATUS_PENDING,
    )
    db.add(row)
    try:
        db.flush()
    except (OperationalError, ProgrammingError) as exc:
        if _ledger_unavailable(exc):
            db.rollback()
            return None
        raise
    return row


def mark_success(db: Session, row: LedgerRow) -> None:
    """Promote a `pending` row to `success` with a processed timestamp."""
    if row is None:
        return
    row.handler_status = STATUS_SUCCESS
    row.processed_at = datetime.now(timezone.utc).replace(tzinfo=None)


def mark_failed(db: Session, row: LedgerRow, error_message: str) -> None:
    """Promote a `pending` row to `failed` and record the error message.

    Stripe's own retry policy (3 days, exponential backoff) re-delivers
    failed events, which causes the handler to re-run via `already_processed`
    returning False on `failed` status. We do **not** schedule our own
    retries here.
    """
    if row is None:
        return
    row.handler_status = STATUS_FAILED
    row.error_message = error_message[:1000] if error_message else None


def mark_ignored(db: Session, row: LedgerRow) -> None:
    """For event types we accept but don't handle (e.g. `payment_method.attached`).

    Recording these as `ignored` (rather than `success`) lets ops
    quickly diff "events we handle" vs "events we acknowledge" in
    the ledger without grepping the source.
    """
    if row is None:
        return
    row.handler_status = STATUS_IGNORED
    row.processed_at = datetime.now(timezone.utc).replace(tzinfo=None)
