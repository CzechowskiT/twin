# Stripe webhook dedup migration skeleton (docs only) — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 18 of the long autonomous security session.
A docs-only **paste-ready** Alembic migration skeleton + wire-up
patch for the `stripe_webhook_events` ledger introduced in
`f341e1f`. This is **not** a migration file. It lives in `docs/`
so the next session can copy it into `backend/alembic/versions/`
in a single deliberate move, with explicit approval, when the
migration freeze lifts.

## Why "docs only"

The session HARD BAN forbids "DB migrations without explicit
task + approval". This file is the maximum we can safely ship
today: the SQL diff, the Alembic skeleton, the wire-up patch,
the rollback plan, and the production verification checklist —
all reviewable as docs.

## Context

- The `StripeWebhookEvent` ORM model already lives at
  `backend/app/database/models.py` (commit `f341e1f`).
- The helpers (`already_processed`, `record_received`,
  `mark_success`, `mark_failed`, `mark_ignored`) already live at
  `backend/app/services/stripe_events.py`, and they **gracefully
  no-op** when the table doesn't exist (production safe today).
- The webhook handler at `backend/app/api/billing.py` is **not
  yet** wired to call these helpers — wire-up ships with the
  migration in one PR.

## Next migration index

Latest migration in `backend/alembic/versions/` is `049_*`. The
next one is `050_stripe_webhook_events.py`.

## Paste-ready Alembic skeleton

```python
"""Stripe webhook event ledger for at-least-once delivery dedup.

Pairs with:
- ORM model: app/database/models.py::StripeWebhookEvent (shipped in
  commit f341e1f, idle until this migration runs).
- Service helpers: app/services/stripe_events.py (shipped in
  commit f341e1f, idle until this migration runs).
- Wire-up patch: app/api/billing.py (PR alongside this migration).

Design: docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "050_stripe_webhook_events"
down_revision: Union[str, None] = "049_job_match_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        # Stripe-issued globally unique event id (max 255 today; 64 is
        # comfortably above observed values 'evt_*' ~30 chars).
        sa.Column("event_id", sa.String(length=64), nullable=False),
        # `customer.subscription.created`, `invoice.payment_succeeded`, …
        sa.Column("event_type", sa.String(length=80), nullable=False),
        # Distinguishes live from test webhooks; lets us safely run staging
        # webhooks against prod DB without polluting the dedup ledger.
        sa.Column("livemode", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "received_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        # "pending" → "ok" / "error" / "ignored".
        sa.Column(
            "handler_status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        # The actual dedup primitive — same `event_id` ⇒ unique violation,
        # caught by app/services/stripe_events.py::record_received().
        sa.UniqueConstraint("event_id", name="uq_stripe_webhook_events_event_id"),
    )
    op.create_index(
        "ix_stripe_webhook_events_event_type",
        "stripe_webhook_events",
        ["event_type"],
    )
    op.create_index(
        "ix_stripe_webhook_events_received_at",
        "stripe_webhook_events",
        ["received_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_stripe_webhook_events_received_at",
        table_name="stripe_webhook_events",
    )
    op.drop_index(
        "ix_stripe_webhook_events_event_type",
        table_name="stripe_webhook_events",
    )
    op.drop_table("stripe_webhook_events")
```

## Paste-ready wire-up patch (`app/api/billing.py`)

Pseudo-diff (the real billing handler has more event-type
branches; the relevant insertion points are at the very top of
the handler and immediately after the success / failure branches):

```python
# at top of stripe_webhook_handler:
from app.services import stripe_events as _evt

event = stripe.Webhook.construct_event(payload, sig, webhook_secret)

if _evt.already_processed(db, event.id):
    return {"received": True, "replayed": True}

_evt.record_received(
    db,
    event_id=event.id,
    event_type=event.type,
    livemode=bool(event.livemode),
)

try:
    # existing handler body … each branch calls _evt.mark_success(db, event.id)
    # on its return path, and the outer except clause calls
    # _evt.mark_failed(db, event.id, str(exc)).
    ...
except Exception as exc:
    _evt.mark_failed(db, event.id, str(exc))
    raise
```

## Rollback plan

If the migration is applied and produces unexpected behaviour:

1. **Disable Stripe webhooks at the source** (Stripe Dashboard
   → Webhooks → pause endpoint). This buys time without DB
   work.
2. **Re-deploy the previous commit** (the helpers are no-ops
   when the table is missing; they're also no-ops when the
   wire-up is reverted).
3. **Run `alembic downgrade -1`**: drops the table cleanly.
4. **Resume the webhook** at the Stripe Dashboard.

The dedup table contents are themselves recoverable — they're a
derived projection of Stripe's event log. Even an
"oops-dropped-the-table" scenario only re-opens the dedup
window for one webhook delivery cycle (Stripe retries up to 3
days by default).

## Production verification checklist (post-deploy)

| Step | Command / Check                                                                                              | Expected                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | `alembic current` on the production DB                                                                        | `050_stripe_webhook_events`                                            |
| 2    | `psql $DATABASE_URL -c "\d stripe_webhook_events"`                                                            | Columns and unique constraint match the skeleton above                |
| 3    | Send a test Stripe event from the Dashboard (test mode)                                                       | 200; new row in `stripe_webhook_events` with `handler_status='ok'`     |
| 4    | Re-send the **same** test event                                                                                | 200 with `{"replayed": true}`; same row count                          |
| 5    | Watch `/api/v1/health` for 60s after step 3                                                                    | `db_ok: true` throughout; no 5xx                                       |
| 6    | Check `app.services.stripe_events` log lines for the new event                                                 | One `record_received` line, one `mark_success` line, no `mark_failed`  |

## What this skeleton intentionally does **not** do

- No data backfill — Stripe events from before this migration
  are not deduped against (the dedup window opens forward).
  Acceptable: any double-counted historical event has already
  been processed; double-processing the same event a second
  time would be obvious in `subscription_invoice_payment_count`
  and is already handled in `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`.
- No retention policy — rows live forever today. Add a
  Celery beat task (`cleanup_old_stripe_webhook_events`) at
  365 days **after** we observe steady-state row volume.
- No partitioning — at our scale (~1k events/month max for
  the foreseeable future) a single table is fine.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No migration file added to `backend/alembic/versions/`.
- ✅ No `.env` change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No secret in this skeleton.
- ✅ No UX / copy change.

## Files

- `docs/P2_STRIPE_EVENT_DEDUP_MIGRATION_SKELETON_2026-05-27.md`
  (this doc).

## Related

- `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md` — the
  design.
- `docs/P2_STRIPE_EVENT_DEDUP_HELPERS_2026-05-27.md` —
  helpers + model commit notes (`f341e1f`).
- `backend/app/services/stripe_events.py` — the helpers that
  this migration unlocks.
- `backend/app/database/models.py::StripeWebhookEvent` — the
  ORM model.
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` § "Webhook
  replay" — the manual fix path while this migration is not
  yet applied.
