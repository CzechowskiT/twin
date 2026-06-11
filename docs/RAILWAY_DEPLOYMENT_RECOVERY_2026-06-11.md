# Railway deployment recovery — 2026-06-11

## Symptoms (resolved 2026-06-11)

- Railway deploys after PR #92–#102 failed at **Network → Healthcheck**.
- Container logs: `alembic upgrade head` → **Multiple head revisions** (pre-#97) or migration failure after #97/#101.
- Active prod deployment stuck on **PR #93** (`74c7c9f`); later scaffold commits never became healthy.

## Root cause

1. **Alembic fork (PR #92 era):** two migrations both had `down_revision = 050_stripe_webhook_events` (`051_company_role_fields` + `051_recruiter_audit_events`). Fixed in **PR #97** (linear chain 050→056).

2. **Unsafe version stamp (PR #101):** `start-api.sh` renamed old revision IDs (`052_recruiter_audit_events` → `053_…`) **without applying** the new **`052_calendar_access_token_cache`** migration inserted by PR #97. Prod DB thought it was at `053` while calendar columns were missing → subsequent `alembic upgrade head` failed → uvicorn never started → healthcheck timeout.

3. **Non-idempotent re-run:** re-stamping to `051` and upgrading again could fail if audit/pipeline/scheduling objects already existed from the old chain.

4. **psycopg URL normalization (PR #105 era):** duplicate fix attempts — **PR #105 CLOSED** (superseded by **PR #108** merged `2026-06-11T17:56:32Z`).

## Fix chain (merged)

| PR | Title | Status |
|----|-------|--------|
| #97 | Linearize Alembic migration chain | MERGED |
| #99 | Guard Alembic single head + prod green tests | MERGED |
| #101 | Patch stale alembic_version in start-api.sh | MERGED |
| #105 | Normalize DB URL to psycopg v3 | **CLOSED** — superseded by #108 |
| #108 | Normalize DATABASE_URL in start-api.sh | MERGED |
| #110 | Recover Railway backend deployment healthcheck | MERGED `2026-06-11T17:58:17Z` |

| File | Change |
|------|--------|
| `backend/scripts/alembic_prod_recovery.py` | Before migrate: if calendar cache columns missing, stamp back to `051_company_role_fields`; handle orphan `051_recruiter_audit_events`; safe rename only when calendar ready |
| `backend/scripts/start-api.sh` | Call recovery script; psycopg v3 URL normalization (PR #108) |
| `backend/alembic/versions/052–057` | Idempotent upgrades where applicable |
| `backend/tests/test_deployment_startup_health.py` | Import + single-head + health route guards |

## Alembic head (post-audit 2026-06-11)

```
050 → 051_company_role_fields → 052_calendar → 053_audit → 054_pipeline → 055_scheduling → 056_scorecards → 057_candidate_evidence_items
```

Single head: **`057_candidate_evidence_items`**

## Production alignment (2026-06-11 closure)

| Surface | `git_commit` | Notes |
|---------|--------------|-------|
| Scaffold HEAD | `adfcac0` | Empty redeploy trigger after PR #112 |
| Railway API health | `e48bff1` | PR #113 merge — **1 commit behind** scaffold |
| Vercel public-health | `e48bff1` | Same as Railway |
| `db_ok` | `true` | Both surfaces healthy |
| FE routes smoke | 200 | `/dashboard/evidence`, `/recruiter/pipeline`, `/company/dashboard` — Vercel deploy current |

**Gap:** Prod API reports `e48bff1`; scaffold at `adfcac0`. Founder redeploy closes the gap.

## Founder redeploy steps (~5 min)

1. Railway Dashboard → **production** → API service → **Deployments**.
2. Confirm branch **`cursor/phase1-monorepo-scaffold`**.
3. Click **Redeploy** (or let latest push deploy).
4. Watch logs: `alembic upgrade head` → single head `057` → uvicorn start.
5. Verify:

```bash
curl -s 'https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1' | jq '{status,git_commit,db_ok}'
curl -s 'https://twin-sooty.vercel.app/api/public-health' | jq '{status,git_commit,db_ok}'
```

Expect: `status: ok`, `db_ok: true`, `git_commit` = `adfcac0`.

6. If healthcheck fails: check Alembic logs; use `alembic_prod_recovery.py` path — do not manual-stamp prod.

**No `RAILWAY_TOKEN` in agent env** — founder must execute redeploy.

## Verification (local)

```bash
cd backend
python3 -c "from app.config import settings; print('config ok')"
python3 -c "from app.main import app; print('app ok')"
python3 -m alembic heads
python3 -m pytest tests/test_deployment_startup_health.py tests/test_alembic_single_head.py -q
```

## Launch stance

**Unchanged:** public launch **NO-GO**, auto-apply **PAUSED**, delegated apply **NOT LIVE**, recruiter calendar sync **NOT LIVE**.

## Remaining risk

- Prod redeploy to `adfcac0` pending founder action.
- O7 re-drill after redeploy — `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` (2026-06-11: **NOT DONE / BLOCKED**).
