# Nightly auto-apply — deploy checklist (agent runbook)

Merged to `cursor/phase1-monorepo-scaffold` (commits through `9933fd3`).

## After merge (one-time)

```bash
# 1. Railway API vars (eager off + Redis broker)
./scripts/copy-railway-vars-to-clipboard.sh   # Raw Editor → twin → Deploy

# Or with linked CLI / RAILWAY_TOKEN in .env.railway:
./scripts/railway-apply-production-env.sh
./scripts/railway-apply-worker-env.sh

# 2. DB migration 037
./scripts/railway-alembic-upgrade.sh   # needs: railway link OR RAILWAY_TOKEN + project

# 3. Smoke
./scripts/verify-prod-health.sh
curl -sS "$API/api/v1/health/celery-status" | python3 -m json.tool
```

## Investor demo (works before beat)

1. `/dashboard/settings/auto-apply` — consent + enable
2. **Run now** with Pracuj.pl match ≥ threshold
3. Dashboard strip shows next run label

## Status (2026-05-19)

| Item | Status |
|------|--------|
| Code on scaffold | Done (`9933fd3` + header `6ed830e`) |
| `/health/celery-status` | Done |
| Integration tests (mock apply) | Done — `backend/tests/test_nightly_auto_apply_integration.py` |
| Dashboard strip | Done — `NightlyAutoApplyStrip` on `/dashboard` |
| `DEPLOYMENT.sh` / `ERRORS.md` | Done (root) |
| Prod env (`CELERY_TASK_ALWAYS_EAGER=false`, ops tokens) | Done via `railway link` + `railway-apply-production-env.sh` |
| Migration 037 | Runs on API deploy (`start-api.sh`); verify with consent/settings API |
| Worker + beat | Service `enthusiastic-encouragement` — keep `CELERY_BROKER_URL=${{Redis.REDIS_URL}}` |
| GitHub PR via `gh` | Optional — merge/push to `cursor/phase1-monorepo-scaffold` |
| Load test 100 users | Not in MVP scope |
