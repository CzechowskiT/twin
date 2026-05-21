# Nightly auto-apply

TWIN can apply to top Pracuj.pl matches while the candidate sleeps.

## Flow

1. Candidate enables consent at `/dashboard/settings/auto-apply`.
2. Celery Beat runs `nightly_auto_apply_sweep` daily (default **02:00 Europe/Warsaw**).
3. For each active `AutoApplyConsent`, pick matches ≥ `min_score_threshold`, respect `daily_limit`, skip already-applied jobs.
4. Reuses `auto_apply_for_user` (same path as manual auto-apply).
5. Morning email via `send_nightly_auto_apply_summary_email` when submissions > 0.

## API (`/api/v1/auto-apply`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/settings` | Current consent + stats |
| POST | `/consent` | First-time enable |
| PATCH | `/settings` | Toggle / thresholds |
| POST | `/trigger` | Run for current user (demo) |
| POST | `/trigger-sweep` | Full sweep (queued or eager) |

## Config (`backend/app/config.py`)

- `NIGHTLY_AUTO_APPLY_HOUR` / `MINUTE` — beat schedule
- `NIGHTLY_AUTO_APPLY_SUPPORTED_BOARDS` — default `pracuj`
- `NIGHTLY_AUTO_APPLY_DEFAULT_MIN_SCORE` — default 90
- `NIGHTLY_AUTO_APPLY_DEFAULT_DAILY_LIMIT` — default 10
- `NIGHTLY_AUTO_APPLY_COOLDOWN_SECONDS` — pause between applies (default 30)

## Production

1. Migration: `alembic upgrade head` (revision `037_auto_apply_consent_nightly`).
   - Local: `cd backend && alembic upgrade head`
   - Railway: `./scripts/railway-alembic-upgrade.sh` (linked CLI + service `twin`)
2. Railway **worker** service with Redis broker (`CELERY_BROKER_URL`), `CELERY_TASK_ALWAYS_EAGER=false`.
3. Worker runs beat + worker (`deploy/railway-worker.toml`).
4. Smoke: `./scripts/verify-prod-health.sh` and `GET /api/v1/health/celery-status`.
5. One-shot env: `./scripts/apply-prod-autonomous.sh`

## Investor demo

1. Open settings page, accept consent, save thresholds.
2. Use **Run now** with a Pracuj.pl match ≥90% in the feed.
3. Explain nightly run at 2 AM once worker is live on prod.
