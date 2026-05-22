# Nightly auto-apply — morning verification snapshot

**Timestamp (Europe/Warsaw):** 2026-05-22 14:38:54 CEST  
**Verifier:** agent (manual run per `docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`)  
**API:** https://twin-production-bcd9.up.railway.app  
**Branch:** `cursor/phase1-monorepo-scaffold`

## Evidence sources

| Source | Available | Notes |
|--------|-----------|-------|
| `./scripts/verify-prod-health.sh` | Yes | All critical flags OK |
| `GET /api/v1/health/celery-status` | Yes | curl (saved inline below) |
| `GET /api/v1/ops/auto-apply/last-run` | Yes | Bearer `OPS_ADMIN_TOKEN` from local `.env.railway` (redacted in logs) |
| Railway worker logs (`nightly_auto_apply_sweep`, 48h) | No | Railway CLI not installed; curl/API evidence only |

## Results

| Check | Result |
|-------|--------|
| `git_commit` (health) | `dbeb737ad827c6fc0143f136bba61e3af7f12fa6` |
| `celery_task_always_eager` | `false` |
| `beat_schedule_has_nightly` | `true` |
| `nightly_auto_apply_beat_enabled` | `true` |
| `worker_active` | `true` |
| `worker_nodes` | `celery@38a1f7176085` |
| Worker logs: `nightly_auto_apply_sweep` | Not checked (no Railway CLI) |

### `GET /api/v1/health/celery-status`

```json
{
  "celery_task_always_eager": false,
  "broker_configured": true,
  "nightly_auto_apply_beat_enabled": true,
  "beat_schedule_has_nightly": true,
  "worker_active": true,
  "worker_nodes": ["celery@38a1f7176085"]
}
```

### `GET /api/v1/ops/auto-apply/last-run`

| Field | Value |
|-------|-------|
| `id` | 1 |
| `started_at` | 2026-05-22T00:00:00.044171 |
| `finished_at` | 2026-05-22T00:00:00.678547 |
| `total_users_processed` | 0 |
| `total_applications_submitted` | 0 |
| `total_applications_failed` | 0 |

## Sweep processed users?

**No users processed** (`total_users_processed: 0`), but the **nightly run row exists** for **2026-05-22 ~02:00 UTC** (`started_at` / `finished_at` ~634ms). That indicates the **beat-triggered sweep executed** and completed without crashing; zero users is **expected when no prod accounts have nightly auto-apply consent + enablement** (or none pass eligibility), not evidence of worker/schedule failure.

## Follow-ups

- [ ] When Railway CLI/token available: grep worker logs for `nightly_auto_apply_sweep` (last 48h) to corroborate beat firing.
- [ ] After first prod user enables consent: re-check `last-run` for `total_users_processed` ≥ 1 or confirm **Run now** path via dashboard.

