# P2 Stripe webhook dedup — handler wire-up — 2026-05-27

**Status:** Code landed in `ff22f3a`. **Migration still required** for
production dedup (table absent on Railway until Alembic ships).

## Behaviour

After signature verification, `POST /api/v1/billing/webhook`:

1. Rejects events without `id` (`400`).
2. `already_processed` → `200` + `{"replayed":"true"}`.
3. `record_received` → pending ledger row (or `None` if table missing).
4. Dispatches known handlers; `mark_success` / `mark_ignored` / `mark_failed`.
5. Commits ledger row when the table exists.

When `stripe_webhook_events` is **not** migrated, helpers degrade to
no-op (same as pre-wire-up production).

## Tests

| File | Covers |
| ---- | ------ |
| `test_stripe_event_dedup_helpers.py` | Helper algorithm |
| `test_stripe_webhook_idempotency.py` | Handler + ledger integration |
| `test_stripe_webhook_signature.py` | Signature gate unchanged |

## Founder gate before prod dedup is real

1. Run Alembic skeleton in `docs/P2_STRIPE_EVENT_DEDUP_MIGRATION_SKELETON_2026-05-27.md`.
2. Deploy API (Railway) — **not in agent scope**.
3. Replay one test event in Stripe dashboard; confirm ledger row.

## Risk if migration delayed

`invoice.payment_succeeded` replays can still double-count
`subscription_invoice_payment_count` until the table exists.
