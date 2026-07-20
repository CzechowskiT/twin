# Activation TTV Proof — rollout & rollback

**Date:** 2026-07-20  
**Alembic:** `085_activation_ttv` (after `084_product_funnel_events`)  
**Gates unchanged:** Gate F PENDING · Launch NO-GO · Phase 3B blocked · P0 CLOSED

## What this ships

1. Auto-dispatch matching after candidate onboarding when profile is min-complete (Celery worker, idempotent per `user_id` + `profile_version`).
2. Server-side activation funnel events (no PII in metadata).
3. TTV latency percentiles on `/admin/funnel` → `activation.ttv_latencies` (`null` + `sample_size` when empty — never fake 0).
4. UX banner on `/dashboard/matches?activated=1` for pending / ready / empty / failed / incomplete / worker unavailable.
5. Quality alerts under env thresholds (suppressed below min sample size).
6. `users.exclude_from_product_metrics` so smoke/test accounts do not pollute North Star.

## Feature flags (independent kill switches)

| Flag | Default | Where | Effect when false |
|------|---------|-------|-------------------|
| `ACTIVATION_AUTO_MATCHING_ENABLED` | true | Railway API + worker | No enqueue after onboarding |
| `ACTIVATION_TTV_METRICS_ENABLED` | true | Railway API | No `activation` block / percentiles |
| `ACTIVATION_TTV_ALERTS_ENABLED` | true | Railway API | Alerts object `enabled: false` |
| `NEXT_PUBLIC_ACTIVATION_MATCHING_STATUS_ENABLED` | on (≠ false) | Vercel | Hide status banner |
| `NEXT_PUBLIC_TTV_MATCHES_REDIRECT` | on | Vercel | Finish → `/dashboard` again |
| `PRODUCT_FUNNEL_EVENTS_ENABLED` | true | Railway | Stop all funnel writes |

### Alert thresholds (Railway)

| Env | Default |
|-----|---------|
| `ACTIVATION_FIRST_MATCH_MIN_RATE` | `0.80` |
| `ACTIVATION_FIRST_MATCH_P90_MAX_SECONDS` | `3600` |
| `ACTIVATION_MATCHING_FAILURE_RATE_MAX` | `0.10` |
| `ACTIVATION_STUCK_MAX_AGE_SECONDS` | `7200` |
| `ACTIVATION_ALERTS_MIN_SAMPLE_SIZE` | `10` |

## Rollout

1. Merge PR → Railway API starts → Alembic `085_activation_ttv`.
2. Confirm worker imports `app.tasks.activation_matching_tasks`.
3. Set flags true (defaults) on Railway; Vercel FE with status + TTV redirect.
4. Smoke with **excluded** test account (`exclude_from_product_metrics=true`).
5. Check `GET /api/v1/admin/funnel?days=30` → `activation` + `north_star.test_accounts_excluded`.

## Rollback (no data loss, no destructive migration)

1. `ACTIVATION_AUTO_MATCHING_ENABLED=false` on Railway API (+ worker if separate) — **no redeploy required** if env hot-reloads; else redeploy API.
2. `ACTIVATION_TTV_METRICS_ENABLED=false` / `ACTIVATION_TTV_ALERTS_ENABLED=false` independently.
3. Vercel: `NEXT_PUBLIC_ACTIVATION_MATCHING_STATUS_ENABLED=false` and/or `NEXT_PUBLIC_TTV_MATCHES_REDIRECT=false` + redeploy FE.
4. Do **not** drop `activation_matching_jobs` or reverse Alembic in prod for rollback.

## Confirm

- Onboarding complete → job row with unique `(user_id, profile_version)`.
- Events: eligible/dispatched/started/completed (or not_eligible).
- `/dashboard/matches?activated=1` → one `activation_ttv_matches_view` (server, once/user).
- Funnel percentiles: `p50_seconds: null` when `sample_size: 0`.
- Excluded smoke user does not raise North Star.

## Privacy

Banned PII keys stripped in funnel props. Activation metadata: `source`, `trigger`, `profile_version`, `correlation_id`, `match_count_bucket`, `latency_bucket`, `failure_category` only.
