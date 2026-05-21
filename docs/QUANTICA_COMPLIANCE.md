# Quantica Lab compliance MVP (TWIN)

Shipped slices from the Quantica mega-prompt, adapted to TWIN paths and stack.

## Phase 1 — Onboarding & help

- `/onboarding` — multi-step wizard (profile, calendar, finish) with `POST /api/v1/auth/onboarding/complete`
- `HelpWidget` on dashboard (FAB + links to guide and onboarding)
- User guide: `public/docs/twin-user-guide.md` served at `/api/user-guide`

## Phase 2 — Admin data quality

- `GET /api/v1/admin/data-quality` (Bearer `OPS_ADMIN_TOKEN` or `BETA_ADMIN_TOKEN`)
- UI: `/admin/data-quality` via Next proxy `/api/ops-admin/data-quality`

## Phase 3 — Admin metrics

- `GET /api/v1/admin/metrics`
- UI: `/admin/metrics` (CSS bar charts, no Chart.js dependency)

## Phase 4 — Product feedback

- `POST /api/v1/feedback` + `product_feedback` table (migration `033`)
- `FeedbackModal` on dashboard + tutorial CTA

## Phase 5 — Lifecycle email

- Welcome email on register (Celery `send_welcome_email_task`)
- First match email after `find_top_matches` persists matches
- Weekly digest beat (`weekly_product_digest_sweep`) for users with `email_product_updates`

## Env

| Variable | Purpose |
|----------|---------|
| `BETA_ADMIN_TOKEN` / `OPS_ADMIN_TOKEN` | Admin API + Next.js ops proxies |
| `WEEKLY_DIGEST_BEAT_ENABLED` | Monday digest sweep (default true) |
