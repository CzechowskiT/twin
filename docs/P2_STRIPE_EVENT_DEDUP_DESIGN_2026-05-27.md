# P2 — Stripe Webhook Event Idempotency (Design) — 2026-05-27

**Scope:** TASK 3 of the 3-hour security session on
`cursor/phase1-monorepo-scaffold`. **Design only — no migration in this commit.**
Closes out the single P2 follow-up explicitly flagged by the
2026-05-27 morning audit
(`docs/P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`).

**Status:** ready to ship behind a migration. Implementation is
intentionally **not** in this commit because:

- it requires an Alembic migration (`HARD BANS` list this
  session: no migrations);
- the auto-promote-on-deploy story for migrations on Railway
  needs to be re-validated before we ship a webhook-blocking
  schema change.

## The hole (recap)

`POST /api/v1/billing/webhook` accepts and dispatches every
event Stripe sends, without de-duplicating by `event.id`:

```python
# backend/app/api/billing.py
event = stripe.Webhook.construct_event(payload, sig, secret)  # signature OK
event_d = _stripe_object_to_dict(event)
etype = event_d["type"]
obj_d = _stripe_object_to_dict(event_d["data"]["object"])

if etype == "checkout.session.completed":
    stripe_svc.process_checkout_completed(db, obj_d, settings)
elif etype == "customer.subscription.updated":
    stripe_svc.process_subscription_updated(db, obj_d, settings)
elif etype == "customer.subscription.deleted":
    stripe_svc.process_subscription_deleted(db, obj_d)
elif etype == "invoice.payment_succeeded":
    stripe_svc.process_invoice_payment_succeeded(db, obj_d, settings)
```

Stripe documents — and explicitly recommends defending against —
**at-least-once delivery**:

> "Stripe sometimes sends webhook events more than once. Make
> sure your endpoint is idempotent — typically by recording
> `event.id`s you've already processed and ignoring duplicates."
> — Stripe docs, *Webhook best practices*

### Where it bites today

Two handlers are **upsert-by-object-id** and are accidentally
safe under replay:

- `process_subscription_updated` — upserts user's
  `subscription_status`, `plan_tier`, `current_period_end` from
  the **current** subscription state. Replay overwrites with the
  same values. No drift.
- `process_subscription_deleted` — clears `stripe_subscription_id`,
  sets `subscription_status="canceled"`. Idempotent.

One handler is **counter-based** and **is not safe**:

- `process_invoice_payment_succeeded` →
  `referral_program.on_subscription_invoice_paid` →
  `user.subscription_invoice_payment_count += 1`.

A single `invoice.payment_succeeded` event delivered twice
(network blip, our 5xx, Stripe retry policy) bumps the counter
from `0 → 2` instead of `0 → 1`, which:

- **Trips referral payouts early.** Lines 152-162 of
  `backend/app/services/referral_program.py`: at count `== 1` we
  insert a `PAYOUT_FIRST_PAYMENT` row; replay skips that branch
  *but* line 164's `>= 3` retention payout fires after **two
  real cycles + one replay**, two days too early.
- **Distorts cohort analytics.** Any dashboard that asks
  "average paid invoices per user" reports inflated numbers.
- **Survives downgrades.** The counter is never decremented; a
  duplicate today contaminates the user for the lifetime of the
  account.

The fourth handler — `process_checkout_completed` — is
*partially* safe (the Checkout Session's `payment_intent` is
unique, so we wouldn't double-create), **but** it also performs
an `email_subscription_payment_succeeded` mail send. A replay
re-sends the welcome-to-paid email.

## Design — `stripe_webhook_events` table

A **dedup-only** ledger keyed by Stripe's own `event.id` (UUID-
shaped, globally unique per account+livemode).

### Schema

```python
class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    livemode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    handler_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- `event_id` is the **only** dedup key; everything else is
  observability.
- `livemode` distinguishes Stripe test from prod, since the same
  Stripe account can stream both into the same Railway pod
  during E2E. Composite unique on `(event_id)` is enough because
  Stripe event IDs are globally unique per account+livemode by
  contract, but keeping `livemode` as a column lets ops slice.
- `handler_status` is one of `pending` / `success` / `failed` /
  `ignored`. `failed` lets ops replay manually; `ignored` is for
  event types we don't subscribe to.

### Alembic migration sketch (`050_stripe_webhook_events.py`)

```python
def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("event_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("livemode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("received_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("handler_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_stripe_webhook_events_received_at",
        "stripe_webhook_events",
        ["received_at"],
        unique=False,
    )

def downgrade() -> None:
    op.drop_index("ix_stripe_webhook_events_received_at", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
```

Migration is **non-destructive** (new table only, no FK), so it
can land independently of code and roll back cleanly.

### Webhook handler change

```python
# backend/app/api/billing.py — after signature passes
event_id = event_d.get("id")  # always present after construct_event
if not event_id:
    raise HTTPException(400, detail="Event missing id.")

if stripe_events.already_processed(db, event_id):
    # idempotent replay — exit 200 so Stripe stops retrying
    return {"received": "true", "replayed": "true"}

ledger = stripe_events.record_received(db, event_id, etype, livemode=event_d.get("livemode", False))

try:
    # … existing if/elif handler dispatch …
    stripe_events.mark_success(db, ledger)
except Exception as exc:
    stripe_events.mark_failed(db, ledger, str(exc))
    logger.exception("Stripe webhook handler failed for %s", etype)
    raise HTTPException(500, detail="Webhook handler error.")

return {"received": "true"}
```

`stripe_events` is a tiny new service module
(`backend/app/services/stripe_events.py`) — three functions:
`already_processed(db, event_id)`, `record_received(db, ...)`,
`mark_success(db, ledger)` / `mark_failed(db, ledger, msg)`. Total
< 60 LOC; pure SQL, no Stripe SDK calls.

### Race-condition note

Two pods can receive the same retry simultaneously. Insert-then-
process is the canonical fix:

1. `INSERT INTO stripe_webhook_events (event_id, ...) VALUES (...) ON CONFLICT DO NOTHING RETURNING id;`
2. If `RETURNING` is empty → another pod won the race → return
   `{"received": "true", "replayed": "true"}` without invoking
   the handler.
3. Otherwise → run the handler under the same DB transaction as
   the row insert; commit together.

This is the same pattern used by `api_idempotency` (Alembic 023)
for candidate-side idempotency keys, just keyed on Stripe's
event id instead of a client-supplied header.

## Backward compatibility

- **No frontend impact.** The webhook endpoint is hit only by
  Stripe; the response shape stays
  `{"received": "true"}`. Adding `"replayed": "true"` on replays
  is purely advisory; Stripe ignores it.
- **No prod ops change.** Stripe replays are already a happy
  path (they happen every time we return 5xx). Adding dedup
  *removes* a class of bugs; nothing rolls back.
- **Test fixtures stay green.** Existing
  `tests/test_stripe_webhook_signature.py` exercises 4 events
  (no-header, bad-sig, valid+unhandled, not-configured). All
  four scenarios still return the same status codes. Only the
  body of the "valid+unhandled" reply gets an additional key on
  replay, which the existing test doesn't assert on.

## Test plan (when the code lands, not now)

`backend/tests/test_stripe_webhook_idempotency.py`:

1. **First delivery dispatches handler.** Signed
   `invoice.payment_succeeded` → 200, `subscription_invoice_payment_count`
   increments by 1, `stripe_webhook_events` row created with
   `handler_status="success"`.
2. **Replay does not dispatch.** Same payload, same signature,
   re-POSTed → 200 with `{"replayed":"true"}`, counter still 1,
   ledger has one row.
3. **Replay survives a different signature timestamp.** Stripe
   includes a fresh `t=` on each retry; the body is byte-equal.
   Signature still verifies; dedup still keys on event_id, not
   signature.
4. **Failed handler is retryable.** Mock `process_invoice_payment_succeeded`
   to raise → 500, ledger has `handler_status="failed"`. Re-POST
   → handler runs again, this time succeeds, ledger updated to
   `success`. (Stripe's own retry mechanism is enough; we don't
   need our own retry loop.)
5. **Two concurrent deliveries.** Race two `TestClient` posts
   with the same event_id → exactly one handler invocation,
   both return 200.

## Retention / cleanup

- **No data retention concern.** Ledger rows are tiny (< 200 B
  each); ~20k events/year at current scale = < 4 MB/year.
- **Ops cleanup:** an optional Celery beat at month-end could
  hard-delete rows older than 90 days where
  `handler_status IN ('success', 'ignored')`. Not required for
  P2; out of scope here.

## Out of scope (intentional)

- **No Connect / payouts handlers.** TWIN is candidate-side only
  today; recruiter/employer success-fee billing is a future
  surface and gets its own dedup once we ship Stripe Connect.
- **No retry of `failed` rows from the ledger.** We rely on
  Stripe's own retry policy (3 days, exponential backoff). A
  ledger row stuck in `failed` is an ops signal, not an
  automatic action.
- **No replay UI.** Ops can re-trigger a stuck event from the
  Stripe dashboard ("Resend") if needed — that issues a new
  delivery but with the same `event.id`, which our ledger
  recognises and the new code-path runs the handler again iff
  the prior `handler_status` was `failed`.

## Verdict

P2 design ready. Migration `050_stripe_webhook_events.py`,
service module `app/services/stripe_events.py`, and a 6-line
patch to `app/api/billing.py` are the entire surface area.
Total implementation budget once unblocked: ~half a day
(migration + 60 LOC service + 5 contract tests + one ops doc).
Promoted to next sprint as the **single billing-side dedup
gap** in the current Stripe integration.
