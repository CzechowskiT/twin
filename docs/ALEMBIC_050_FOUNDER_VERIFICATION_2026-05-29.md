# Alembic `050` — founder production verification (read-only)

**Gate:** S5 in `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`  
**Migration:** `050_stripe_webhook_events` (`backend/alembic/versions/050_stripe_webhook_events.py`)  
**Agent checkpoint:** 2026-05-29 UTC (release gate) — **UNKNOWN on prod DB**
**Founder SQL paste:** `PASTE_RESULT_HERE` (placeholder — **not** a valid `version_num`; S5 cannot be marked PASS)

## What the agent verified (safe)

| Check | Result |
| ----- | ------ |
| Migration file chained after `049` | ✅ `pytest tests/test_stripe_migration_050.py` |
| Dedup helpers + webhook idempotency | ✅ 52 passed (`test_stripe_*` bundle) |
| Handler wired in repo | ✅ `billing.py` + `app/services/stripe_events.py` |
| `GET /api/public-health` | ✅ `status=ok`, `db_ok=true`, `git_commit=df15618` |
| `alembic_version` via public-health | ❌ not exposed (cannot infer revision) |

## Founder-only confirmation (required for S5 ✅)

Run **one** of these on **production Postgres** (read-only):

```sql
SELECT version_num FROM alembic_version;
```

**PASS** when `version_num = '050_stripe_webhook_events'`.  
**FAIL** when `049_job_match_feedback` or older.  
**Do not** run `alembic upgrade` during this check.

Or in Railway API shell:

```bash
alembic current
```

**PASS** when output includes `050_stripe_webhook_events (head)`.

## Record result

1. Paste output (revision only — no connection strings) into this file § Evidence log.
2. Flip S5 row in `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`.
3. Update `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` Stripe dedup row.

## Evidence log (append-only)

| Date (UTC) | Operator | Method | `version_num` | S5 |
| ---------- | -------- | ------ | ------------- | -- |
| 2026-05-29 | agent | public-health only | **UNKNOWN** | 🟡 pending founder SQL |
| 2026-05-29 | founder (gate handoff) | SQL `SELECT version_num FROM alembic_version;` | `PASTE_RESULT_HERE` (placeholder) | 🟡 **UNKNOWN** — re-paste real revision |

### What founder must paste (replace placeholder)

Run on **production Postgres** (read-only):

```sql
SELECT version_num FROM alembic_version;
```

Paste **only** the single cell value (examples: `050_stripe_webhook_events`, `049_job_match_feedback`).
Do **not** paste the template token `PASTE_RESULT_HERE`.

## If still on `049`

Follow `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md` after explicit founder approval. Do not run from agent sessions.

## Related

- `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md`
- `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`
