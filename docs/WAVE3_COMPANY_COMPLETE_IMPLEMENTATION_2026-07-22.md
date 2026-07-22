# Wave 3 Company Complete — implementation

**Date:** 2026-07-22  
**Branch:** `feat/wave3-company-complete`  
**Alembic:** `090_company_wave3_hard_live`  
**Stance unchanged:** Pilot **BLOCKED_BY_FOUNDER** · Gate F **PENDING** · Launch **NO-GO** · enrollment **OFF**

## Inventory (company user-facing)

| Bucket | Count | Modules |
|--------|------:|---------|
| Smokeable → Hard LIVE after auth smoke | 16 | dashboard, pipeline, roles, vacancy, cockpits, talent pool, team, trust summary, org settings, permissions, analytics, audit log, scorecards, notifications, synthetic onboarding |
| HELD_POLICY | 10 | integrations, ATS sync/import, billing/Stripe, MS write, invite delivery, real company onboarding |
| DEMO_ONLY | 7 | all `company_demo_*` journeys |
| NOT_BUILT (out of Wave 3 LIVE bar) | EDI / SCIM / SSO / enterprise framework | remain NOT_BUILT |

## Surfaces shipped

| Surface | Route / API | Notes |
|---------|-------------|-------|
| Hard LIVE registry | `/api/v1/platform/wave3/*` | status + evidence + mark |
| Org settings | `GET/PUT /api/v1/company/org-settings` | persisted `company_org_settings` |
| RBAC matrix | `GET /api/v1/company/permissions` | hiring_manager + employer_admin seeded |
| Team invite dry-run | `POST /api/v1/company/team/invites/dry-run` | synthetic email only; delivery HELD |
| Scorecards | `GET/POST /api/v1/company/scorecards` | demo fixtures → 400 |
| Trust summary | `GET /api/v1/company/trust-summary` | demo fixtures → 400 |
| Audit log | `GET /api/v1/company/audit-log` | domain events |
| Notifications | `POST /api/v1/company/notifications/draft` | send=true forbidden |
| Onboarding synthetic | `GET /api/v1/company/onboarding` | enrollment stays false |
| Billing honesty | `GET /api/v1/company/billing/honesty` | Stripe NOT_LIVE |
| Integrations honesty | `GET /api/v1/company/integrations/honesty` | ATS BLOCKED |

## Flags (defaults)

`COMPANY_WAVE3_*` enabled for engineering paths; `ATS_LIVE_SYNC`, `MICROSOFT_CALENDAR_WRITE_ENABLED`, `STRIPE_PUBLIC_LAUNCH`, `EXTERNAL_PILOT_ENROLLMENT_ENABLED` forced **false**.

## Smoke harness

```bash
TWIN_PROD_SMOKE_WRITE=1 WAVE3_SMOKE_MODULES=all npm run test:wave3-company-module-prod-smoke
```

Fail-closed without JWT. Never prints JWT. No real invites / emails / ATS / Stripe / MS write.

## Rollback

1. Flag off `COMPANY_WAVE3_*` live paths  
2. Prior Railway/Vercel deploy  
3. Alembic downgrade `090` only if safe (drops org settings + scorecard tables)

## Explicit non-flips

No Wave 4 · No Founder Command · No Product Agent · No invites · No enrollment ON · No Stripe/ATS/MS write/auto-apply/Authologic flip · No LIVE badges until post-smoke PASS
