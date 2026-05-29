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

## Replay matrix (2026-05-28)

Local regression coverage in `backend/tests/test_stripe_webhook_idempotency.py`:

| Scenario | Test anchor |
| -------- | ----------- |
| Handled invoice/checkout first delivery + replay | `test_duplicate_invoice_event_dispatches_handler_once`, `test_duplicate_checkout_event_dispatches_handler_once` |
| Unhandled signed events (invoice/checkout/customer/payment_method/subscription) | `test_unhandled_replay_events_are_marked_ignored_and_deduped` |
| Burst duplicate deliveries (same `event.id`) | `test_duplicate_burst_same_event_dispatches_handler_once` |
| Payload drift with stable `event.id` | `test_replay_payload_drift_ignored` |
| `processed_at` stability on replay | `test_replay_preserves_first_processed_timestamp` |
| Rare unsupported signed event replay | `test_unsupported_event_replay_remains_deduped` |
| Malformed id before/after valid chain | `test_malformed_id_replay_chain_rejection` |
| Missing/null/blank `event.id` rejection | `test_missing_event_id_is_rejected_before_dedup_ledger_write`, `test_malformed_event_id_is_rejected_before_dedup_ledger_write` |
| Worker retry + replay short-circuit | `test_worker_retry_reprocesses_failed_event_once` |

Verification command:

```bash
cd backend && pytest tests/test_stripe_webhook_idempotency.py -q
```

## Founder gate before prod dedup is real

1. Run Alembic skeleton in `docs/P2_STRIPE_EVENT_DEDUP_MIGRATION_SKELETON_2026-05-27.md`.
2. Deploy API (Railway) — **not in agent scope**.
3. Replay one test event in Stripe dashboard; confirm ledger row.

## Risk if migration delayed

`invoice.payment_succeeded` replays can still double-count
`subscription_invoice_payment_count` until the table exists.
