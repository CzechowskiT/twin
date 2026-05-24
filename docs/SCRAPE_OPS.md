# Scrape operations (production)

**Product default:** any signed-in user with core GDPR consents may trigger `POST /api/v1/jobs/scrape/all` from the dashboard (“Twin for your job”).

The optional allowlist below tags **ops / elevated** accounts for monitoring (`scrape_ops_elevated` on `/auth/me`). It does **not** block other users from scraping.

## Railway variables (founder checklist)

Set on the **API** service unless noted.

| Variable | Example | Service | Notes |
|----------|---------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | API | Optional — flags ops accounts on `/auth/me`. |
| `SCRAPE_OPS_USER_IDS` | `1,42` | API | Alternative to emails; ids from `GET /api/v1/auth/me`. |
| `SCRAPE_WORKER_READY` | `true` | API | Set after a Celery worker is live (`false` until then). |
| `CELERY_TASK_ALWAYS_EAGER` | `false` | API | `true` only for solo API (no worker). |
| `CELERY_BROKER_URL` | `${{Redis.REDIS_URL}}` | API + **worker** | Redis plugin reference on Railway. |
| `CELERY_RESULT_BACKEND` | `${{Redis.REDIS_URL}}` | API + **worker** | Same Redis as broker. |
| `SCRAPE_WORKER_READY` | `true` | **worker** | Mirror API when worker service exists. |
| `SCRAPE_BEAT_ENABLED` | `true` | **worker** | Optional daily `scrape-all` on beat. |

After changing API vars, redeploy API. After worker vars, redeploy **twin-worker** (see `deploy/railway-worker.toml`).

## Optional ops allowlist

Set **one** of (only if you want to flag specific operator accounts):

| Variable | Example | Notes |
|----------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | Comma-separated account emails. |
| `SCRAPE_OPS_USER_IDS` | `1,42` | Numeric `users.id` from `GET /api/v1/auth/me` |

Also required for hosted scrape (non-eager):

| Variable | Purpose |
|----------|---------|
| `SCRAPE_WORKER_READY` | `true` when a Celery worker service exists |
| `SCRAPE_BEAT_ENABLED` | Optional daily `scrape-all` on beat |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis |

## Verify

1. Log in with core consents completed at registration.
2. `GET /api/v1/auth/me` → `can_trigger_scrape: true` when consents + worker ready.
3. `GET /api/v1/health?ops=1` → `scrape_worker_ready`, `scrape_beat_enabled`, `validated_jobs`.
4. Public dashboard: [https://your-frontend/status](https://your-frontend/status) — **Validated jobs** counter and **Scrape worker** row.
5. `./scripts/verify-prod-health.sh` — CI smoke on push to `cursor/phase1-monorepo-scaffold`. Celery worker check **retries up to 5×** (12 s apart) so a Railway redeploy restart does not flake the job; a genuinely stopped worker still fails after ~60 s.

### CI `prod-health` vs worker restart

Push to scaffold triggers **both** GitHub Actions `prod-health` and Railway auto-deploy. During worker restart (`celery worker --beat`), `GET /api/v1/health/celery-status` may briefly return `worker_active: false`, `mode: no_workers` — that is an honest signal, not a false negative. If CI fails with that message **outside** a deploy window, check Railway → worker service logs (`celery@… ready`) and that API + worker share the same `CELERY_BROKER_URL` / `REDIS_URL`.

Allowlisted emails additionally get `scrape_ops_elevated: true` when `SCRAPE_OPS_*` is set.
