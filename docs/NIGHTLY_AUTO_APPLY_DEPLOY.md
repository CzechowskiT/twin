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

## Blockers (2026-05-21)

| Item | Status |
|------|--------|
| GitHub PR via `gh` | PAT lacks `createPullRequest` — merged via git push instead |
| Railway `alembic upgrade` | CLI not linked in this environment |
| Prod `celery_task_always_eager` | Still `true` until Raw Editor / `railway-apply-production-env.sh` |
