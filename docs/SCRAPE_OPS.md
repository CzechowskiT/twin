# Scrape ops allowlist (production)

Dashboard **Auto scrap** and related Celery triggers are restricted to configured operators — not every logged-in user.

## Configure on Railway / API

Set **one** of:

| Variable | Example | Notes |
|----------|---------|--------|
| `SCRAPE_OPS_EMAILS` | `you@company.com,ops@company.com` | Comma-separated account emails (recommended). |
| `SCRAPE_OPS_USER_IDS` | `1,42` | Numeric `users.id` from `GET /api/v1/auth/me` |

Also required for hosted scrape:

| Variable | Purpose |
|----------|---------|
| `SCRAPE_WORKER_READY` | `true` when a Celery worker service exists |
| `SCRAPE_BEAT_ENABLED` | Optional daily `scrape-all` on beat |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis |

## Verify

1. Log in as an allowlisted email.
2. `GET /api/v1/auth/me` → `can_trigger_scrape: true` when worker + allowlist match.
3. `GET /api/v1/health?ops=1` → `scrape_worker_ready`, `scrape_beat_enabled`.

Non-ops users still see the jobs feed; scrape buttons stay hidden or return 403 from the API.
