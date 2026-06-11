# Railway deployment recovery — 2026-06-11

## Symptoms

- Railway deploys after PR #92–#102 failed at **Network → Healthcheck**.
- Container logs: `alembic upgrade head` → **Multiple head revisions** (pre-#97) or migration failure after #97/#101.
- Active prod deployment stuck on **PR #93** (`74c7c9f`); later scaffold commits never became healthy.

## Root cause

1. **Alembic fork (PR #92 era):** two migrations both had `down_revision = 050_stripe_webhook_events` (`051_company_role_fields` + `051_recruiter_audit_events`). Fixed in **PR #97** (linear chain 050→056).

2. **Unsafe version stamp (PR #101):** `start-api.sh` renamed old revision IDs (`052_recruiter_audit_events` → `053_…`) **without applying** the new **`052_calendar_access_token_cache`** migration inserted by PR #97. Prod DB thought it was at `053` while calendar columns were missing → subsequent `alembic upgrade head` failed → uvicorn never started → healthcheck timeout.

3. **Non-idempotent re-run:** re-stamping to `051` and upgrading again could fail if audit/pipeline/scheduling objects already existed from the old chain.

## Fix (this PR)

| File | Change |
|------|--------|
| `backend/scripts/alembic_prod_recovery.py` | Before migrate: if calendar cache columns missing, stamp back to `051_company_role_fields`; handle orphan `051_recruiter_audit_events`; safe rename only when calendar ready |
| `backend/scripts/start-api.sh` | Call recovery script instead of inline #101 patch |
| `backend/alembic/versions/052–056` | Idempotent upgrades (inspect columns/tables before create) |
| `backend/tests/test_deployment_startup_health.py` | Import + single-head + health route guards |

## Alembic head (after fix)

```
050 → 051_company_role_fields → 052_calendar → 053_audit → 054_pipeline → 055_scheduling → 056_scorecards
```

Single head: **`056_recruiter_application_scorecards`**

## Verification

```bash
cd backend
python3 -c "from app.config import settings; print('config ok')"
python3 -c "from app.main import app; print('app ok')"
python3 -m alembic heads
python3 -m pytest tests/test_deployment_startup_health.py tests/test_alembic_single_head.py -q
```

After Railway redeploy:

```bash
curl -s 'https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1'
curl -s 'https://twin-sooty.vercel.app/api/public-health'
```

Expect: HTTP 200, `status: ok`, `db_ok: true`, `git_commit` matching scaffold HEAD.

## Launch stance

**Unchanged:** public launch **NO-GO**, auto-apply **PAUSED**, delegated apply **NOT LIVE**, recruiter calendar sync **NOT LIVE**.

## Remaining risk

Founder must **Redeploy** Railway API service from `cursor/phase1-monorepo-scaffold` after merge (no `RAILWAY_TOKEN` in agent env). First deploy after recovery may run migrations 052–056 in one pass — expected and safe with idempotent upgrades.
