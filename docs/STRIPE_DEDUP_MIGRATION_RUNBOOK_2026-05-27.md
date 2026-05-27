# Stripe dedup migration runbook — 2026-05-27

**Status:** Migration file **ready in repo** (`050_stripe_webhook_events.py`).
**NOT run on production** — requires founder approval (gate S5).

## Preconditions

1. `git rev-parse HEAD` matches the commit containing `050_stripe_webhook_events.py`.
2. `pytest tests/test_stripe_webhook_idempotency.py tests/test_stripe_migration_050.py -q` green.
3. Stripe webhook handler already wired (`billing.py` — shipped `ff22f3a`).
4. Incident runbook open: `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`.

## Deploy sequence

1. **Announce maintenance window** (5 min) — webhook replays are safe; dedup opens forward-only.
2. **Railway:** run `alembic upgrade head` on production Postgres (one step: `050`).
3. **Verify:** `alembic current` → `050_stripe_webhook_events`.
4. **Stripe Dashboard:** send test `invoice.payment_succeeded` (test mode).
5. **DB:** `SELECT event_id, handler_status FROM stripe_webhook_events ORDER BY id DESC LIMIT 5;`
6. **Replay same event** → HTTP 200 + `replayed: true`; handler not re-entered.
7. **Health:** `./scripts/verify-prod-health.sh` for 60s.

## Rollback

1. Pause Stripe webhook endpoint (Dashboard).
2. `alembic downgrade -1` — drops `stripe_webhook_events`.
3. Redeploy previous API SHA if handler rollback needed (helpers no-op without table).
4. Resume webhook.

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| Unique violation race | `record_received` + DB unique on `event_id` |
| Ledger unavailable | Helpers degrade to no-op (pre-migration behaviour) |
| Failed handler row | `mark_failed`; Stripe retries; ops can inspect ledger |

## Related

- `docs/P2_STRIPE_EVENT_DEDUP_MIGRATION_SKELETON_2026-05-27.md`
- `docs/API_DEPLOY_DECISION_MEMO_2026-05-27.md`
- Gate **S5** in `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
