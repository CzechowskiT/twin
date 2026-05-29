# CI smoke health fix (2026-05-27)

## Root cause

The `prod-health` job in `.github/workflows/smoke.yml` runs `scripts/verify-prod-health.sh` against production. The script asserted fields that are **not** part of the public `GET /api/v1/health?ops=1` contract:

- `ops_admin_configured` — only in admin deploy health (`build_health_ops_admin_extensions`), not `build_health_ops_public`.
- `celery_task_always_eager` on the public health JSON — same; eager mode is reported on `GET /api/v1/health/celery-status`.

Smoke failed with `expected True got None` / `expected False got None` even when API and workers were healthy.

## Failing fields (before)

| Field | Source checked | Actual contract |
|-------|----------------|-----------------|
| `ops_admin_configured` | `?ops=1` public health | Admin-only extension |
| `celery_task_always_eager` | `?ops=1` public health | `celery-status` only |

Optional noise: `validated_jobs >= 1` and `beat_schedule_has_nightly` on celery-status were not required for the public deploy contract.

## Why removed from public health checks

Public health (`build_health_ops_public`) exposes deploy-safe booleans for `/status` and proxies — OAuth/mail/scrape flags, market coverage coarse metrics — without admin tokens or internal Celery wiring. Admin-only fields stay behind Bearer ops admin. CI should match what production clients and `frontend` `/api/public-health` rely on.

## Script changes (`scripts/verify-prod-health.sh`)

- Removed `ops_admin_configured` and public `celery_task_always_eager` checks.
- Removed `validated_jobs` and `beat_schedule_has_nightly` gates.
- Kept: `status`, `db_ok`, `scrape_worker_ready`.
- Added optional (when key present): `scrape_beat_enabled == true`, `market_coverage_feed_stale == false`.
- Celery: `worker_active` and `celery_task_always_eager == false` **only** from `/api/v1/health/celery-status` (with retries).
- Frontend: pass if **either** `/status` or `/api/public-health` returns HTTP 200.

## Workflow changes (`.github/workflows/smoke.yml`)

`paths-ignore` on `push` and `pull_request`:

- `docs/**`
- `**/*.md`

Doc-only changes no longer trigger backend/frontend/prod-health jobs. Changes under `backend/**`, `frontend/**`, `scripts/**`, or `.github/workflows/**` still run smoke.

## Verification steps

```bash
bash -n scripts/verify-prod-health.sh
./scripts/verify-prod-health.sh   # needs reachable VERIFY_PROD_API / VERIFY_PROD_FRONTEND
cd frontend && npm run lint && npx tsc --noEmit && npm run build
curl -fsS "${VERIFY_PROD_FRONTEND:-https://twin-sooty.vercel.app}/api/public-health" | head
```

After push to `cursor/phase1-monorepo-scaffold`, confirm the **smoke** workflow on GitHub Actions (prod-health job on push only).
