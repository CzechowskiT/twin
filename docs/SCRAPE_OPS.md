# Scrape operations (production)

**Product default:** any signed-in user with core GDPR consents may trigger `POST /api/v1/jobs/scrape/all` from the dashboard (“Twin for your job”).

The optional allowlist below tags **ops / elevated** accounts for monitoring (`scrape_ops_elevated` on `/auth/me`). It does **not** block other users from scraping.

## Optional ops allowlist

Set **one** of (only if you want to flag specific operator accounts):

| Variable | Example | Notes |
|----------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | Comma-separated account emails. |
| `SCRAPE_OPS_USER_IDS` | `1,42` | Numeric `users.id` from `GET /api/v1/auth/me` |

Also required for hosted scrape:

| Variable | Purpose |
|----------|---------|
| `SCRAPE_WORKER_READY` | `true` when a Celery worker service exists |
| `SCRAPE_BEAT_ENABLED` | Optional daily `scrape-all` on beat |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis |

## Verify

1. Log in with core consents completed at registration.
2. `GET /api/v1/auth/me` → `can_trigger_scrape: true` when consents + worker ready.
3. `GET /api/v1/health?ops=1` → `scrape_worker_ready`, `scrape_beat_enabled`.

Allowlisted emails additionally get `scrape_ops_elevated: true` when `SCRAPE_OPS_*` is set.
