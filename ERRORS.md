# TWIN — common errors (ops)

Quick fixes for production and local nightly auto-apply. Full runbooks: [docs/NIGHTLY_AUTO_APPLY_DEPLOY.md](docs/NIGHTLY_AUTO_APPLY_DEPLOY.md), [docs/PROD_AUTONOMOUS.md](docs/PROD_AUTONOMOUS.md).

## Production health

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| `celery_task_always_eager: true` | API has no Redis broker or solo-mode fallback | Set `CELERY_BROKER_URL=${{Redis.REDIS_URL}}`, `CELERY_TASK_ALWAYS_EAGER=false`, redeploy API + worker. Run `./DEPLOYMENT.sh` or `./scripts/railway-apply-production-env.sh` after `railway link`. |
| `celery-status` → `Port could not be cast … '6379}}'` | Malformed `CELERY_BROKER_URL` (extra `}}`) | Run `./scripts/railway-fix-redis-broker.sh` (sets `${{Redis.REDIS_URL}}` on API + worker, redeploys). |
| `worker_active: false` | Worker down or broker broken | Redeploy worker (`enthusiastic-encouragement` or `twin-worker`), check `railway logs --service <worker>`. |
| `ops_admin_configured: false` | Missing `OPS_ADMIN_TOKEN` | Set in Railway Raw Editor or `.env.railway` + `./scripts/railway-apply-production-env.sh`. |
| `GET /health/celery-status` 404 | Old API image | Deploy `cursor/phase1-monorepo-scaffold` (includes nightly auto-apply merge). |
| Nightly beat never fires | Eager mode or no worker+beat | Worker must run `celery … worker --beat` (`deploy/railway-worker.toml`). |

## Migrations (037 auto-apply)

| Symptom | Fix |
|--------|-----|
| `alembic upgrade head` fails locally | `DATABASE_URL` uses `postgres.railway.internal` — only works **inside** Railway. Migrations run automatically on API start (`backend/scripts/start-api.sh`). |
| Manual migration | `railway link -p responsible-success -s twin` then `railway ssh -s twin -- alembic upgrade head` (requires `~/.ssh` key), or trigger API redeploy. |

## Local dev

| Symptom | Fix |
|--------|-----|
| Sweep dry-run fails | `docker compose up -d postgres redis`, `cd backend && alembic upgrade head`. |
| Auto-apply consent 404 | Run migration 037 locally. |

## GitHub / PR

| Symptom | Fix |
|--------|-----|
| `gh pr create` permission denied | Merge via `git push` to `cursor/phase1-monorepo-scaffold` or open compare URL on GitHub web UI. |
