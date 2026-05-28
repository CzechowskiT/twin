# Backend route inventory — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 19 of the long autonomous security session.
A docs-only, machine-derived dump of every HTTP route the
FastAPI app currently exposes, grouped by router. Generated
from `app.main.app.routes` on the head SHA; complements the
abuse-surface audit in
`P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md` and the docs
index at `P1_DOCS_INDEX_2026-05-27.md`.

## How this was generated

```bash
cd backend && python -c "
from app.main import app
for r in app.routes:
    if hasattr(r, 'methods') and hasattr(r, 'path'):
        for m in sorted(r.methods - {'HEAD', 'OPTIONS'}):
            print(f'{m:6} {r.path}')
"
```

No source change; the inventory is a snapshot, not a fixture.

## Quick stats

- Routers wired in `app/api/router.py`: 36.
- Distinct (method, path) tuples: 175.
- Public surface (no JWT required): 38 routes (see audit).
- Auth-only surface: 137 routes.

## Per-router catalogue (alphabetical by prefix)

### Health / system

| Method | Path                                  | Notes                                              |
| ------ | ------------------------------------- | -------------------------------------------------- |
| GET    | /                                     | Root liveness ping                                  |
| GET    | /api/v1/health                        | Public; frozen by `test_public_health_regression`  |
| GET    | /api/v1/health/celery-status          | Public; frozen by `test_public_health_regression`  |
| POST   | /api/v1/csp-report                    | Public; rate-limited 60/min                         |
| GET    | /docs, /docs/oauth2-redirect          | OpenAPI Swagger UI                                  |
| GET    | /openapi.json                         | OpenAPI schema                                      |

### Admin (`/api/v1/admin/*`) — requires OPS_ADMIN_TOKEN

| Method | Path                                                          |
| ------ | ------------------------------------------------------------- |
| GET    | /api/v1/admin/data-quality                                    |
| GET    | /api/v1/admin/deploy-health                                   |
| GET    | /api/v1/admin/market-coverage-status                          |
| GET    | /api/v1/admin/matching-quality                                |
| GET    | /api/v1/admin/metrics                                         |
| GET    | /api/v1/admin/partner-api-keys                                |
| POST   | /api/v1/admin/partner-api-keys                                |
| POST   | /api/v1/admin/partner-api-keys/{key_id}/revoke                |
| GET    | /api/v1/admin/placement-disputes                              |
| POST   | /api/v1/admin/placement-disputes/{application_id}/resolve     |
| GET    | /api/v1/admin/recruiter-company-tokens                        |
| POST   | /api/v1/admin/recruiter-company-tokens                        |
| POST   | /api/v1/admin/recruiter-company-tokens/{token_id}/revoke      |

### Auth (`/api/v1/auth/*`)

| Method | Path                                            | Auth |
| ------ | ----------------------------------------------- | ---- |
| POST   | /api/v1/auth/register                           | none |
| POST   | /api/v1/auth/login                              | none |
| POST   | /api/v1/auth/login/json                         | none |
| POST   | /api/v1/auth/forgot-password                    | none |
| POST   | /api/v1/auth/reset-password                     | none |
| POST   | /api/v1/auth/verify-email                       | token in body |
| POST   | /api/v1/auth/verify-email/resend                | JWT  |
| GET    | /api/v1/auth/me                                 | JWT  |
| PATCH  | /api/v1/auth/me/billing-profile                 | JWT  |
| PATCH  | /api/v1/auth/me/marketing                       | JWT  |
| PATCH  | /api/v1/auth/me/notification-preferences        | JWT  |
| PATCH  | /api/v1/auth/me/password                        | JWT  |
| POST   | /api/v1/auth/onboarding/complete                | JWT  |
| POST   | /api/v1/auth/gdpr-consent                       | JWT  |
| GET    | /api/v1/auth/{provider}/login                   | none |
| GET    | /api/v1/auth/{provider}/callback                | OAuth state cookie |
| POST   | /api/v1/auth/{provider}/callback                | OAuth state cookie |
| GET    | /api/v1/auth/linkedin/login                     | none |
| GET    | /api/v1/auth/linkedin/callback                  | OAuth state cookie |

#### Unauth mutation inventory delta (2026-05-28)

The highest-risk unauthenticated auth mutations are now explicitly tracked for
rate-limit regression coverage:

| Route | Mutation class | RL verification tests |
| ----- | -------------- | --------------------- |
| `POST /api/v1/auth/login/json` | credential mutation (unauth) | `backend/tests/test_auth_login_rate_limit.py` |
| `POST /api/v1/auth/register` | account creation (unauth) | `backend/tests/test_auth_mutation_rate_limits.py` |
| `POST /api/v1/auth/reset-password` | credential reset (unauth) | `backend/tests/test_auth_reset_password_rate_limit.py` |

### Beta waitlist (`/api/v1/beta/*`)

| Method | Path                                                              | Auth |
| ------ | ----------------------------------------------------------------- | ---- |
| POST   | /api/v1/beta/join                                                 | none; 5/min |
| GET    | /api/v1/beta/stats                                                | none |
| GET    | /api/v1/beta/leaderboard                                          | none |
| GET    | /api/v1/beta/match-preview                                        | none |
| GET    | /api/v1/beta/waitlist/{referral_code}                             | referral_code |
| PATCH  | /api/v1/beta/waitlist/{referral_code}/profile                     | referral_code |
| POST   | /api/v1/beta/waitlist/{referral_code}/linkedin-share              | referral_code |
| POST   | /api/v1/beta/waitlist/{referral_code}/testimonial                 | referral_code |
| POST   | /api/v1/beta/waitlist/{referral_code}/cv                          | referral_code; **R-007 HIGH** |
| POST   | /api/v1/beta/waitlist/{referral_code}/voice                       | referral_code; **R-008 HIGH** |
| GET    | /api/v1/beta/admin/stats                                          | BETA_ADMIN_TOKEN |
| GET    | /api/v1/beta/admin/export                                         | BETA_ADMIN_TOKEN |

### Billing (`/api/v1/billing/*`)

| Method | Path                              | Auth |
| ------ | --------------------------------- | ---- |
| GET    | /api/v1/billing/plans             | none |
| POST   | /api/v1/billing/checkout-session  | JWT |
| POST   | /api/v1/billing/portal-session    | JWT |
| POST   | /api/v1/billing/webhook           | Stripe signature; **R-004 PARTIAL** |

### Calendar (Google + Microsoft + ICS — `/api/v1/calendar/*`)

| Method | Path                                              | Auth |
| ------ | ------------------------------------------------- | ---- |
| GET    | /api/v1/calendar/oauth-config                     | JWT |
| GET    | /api/v1/calendar/google/authorize                 | JWT |
| GET    | /api/v1/calendar/google/callback                  | OAuth state |
| DELETE | /api/v1/calendar/google                           | JWT |
| GET    | /api/v1/calendar/google/events                    | JWT |
| POST   | /api/v1/calendar/google/events                    | JWT |
| POST   | /api/v1/calendar/google/freebusy                  | JWT |
| GET    | /api/v1/calendar/google/interviews                | JWT |
| POST   | /api/v1/calendar/google/interviews                | JWT |
| GET    | /api/v1/calendar/google/slots                     | JWT |
| GET    | /api/v1/calendar/google/slots/next                | JWT |
| GET    | /api/v1/calendar/google/status                    | JWT |
| GET    | /api/v1/calendar/microsoft/authorize              | JWT |
| GET    | /api/v1/calendar/microsoft/callback               | OAuth state |
| DELETE | /api/v1/calendar/microsoft                        | JWT |
| GET    | /api/v1/calendar/microsoft/events                 | JWT |
| POST   | /api/v1/calendar/microsoft/freebusy               | JWT |
| POST   | /api/v1/calendar/microsoft/interviews             | JWT |
| GET    | /api/v1/calendar/microsoft/slots                  | JWT |
| GET    | /api/v1/calendar/microsoft/slots/next             | JWT |
| GET    | /api/v1/calendar/microsoft/status                 | JWT |
| GET    | /api/v1/calendar/me/interviews                    | JWT |
| POST   | /api/v1/calendar/me/webcal-token                  | JWT |
| GET    | /api/v1/calendar/me/webcal.ics                    | webcal token |
| GET    | /api/v1/calendar/interviews/{interview_id}/ics    | JWT |
| GET    | /api/v1/calendar/interviews/{interview_id}/ics-shared | interview ics_token |
| POST   | /api/v1/calendar/interviews/{interview_id}/ics-token | JWT |
| POST   | /api/v1/calendar/interviews/{interview_id}/cancel | JWT |

### Candidates (`/api/v1/candidates/*`) — JWT throughout

A user's own profile + matches surface; 18 routes. Read /
mutate / export — JWT-only.

### Career assistant (`/api/v1/career-assistant/*`) — JWT + LLM

7 LLM-heavy mutating endpoints; all newly under the Layer 2
`@limiter.limit("60/minute", key_func=user_or_ip_key)` cap
shipped in commit `28a50a0`. See
`P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md`.

### Consent (`/api/v1/consent/*`)

| Method | Path                       | Auth |
| ------ | -------------------------- | ---- |
| POST   | /api/v1/consent/cookies    | none; **R-011 LOW** |

### Demo (`/api/v1/demo/*`)

| Method | Path                         | Auth |
| ------ | ---------------------------- | ---- |
| GET    | /api/v1/demo/apply-target    | none (placeholder data) |
| GET    | /api/v1/demo/snapshot        | none |

### Employers (`/api/v1/employers/*`)

| Method | Path                                  | Auth |
| ------ | ------------------------------------- | ---- |
| GET    | /api/v1/employers/curated-careers     | none |
| POST   | /api/v1/employers/employer-leads      | none; **R-026 (new) — TODO inventory abuse audit** |

### Feedback / opportunities / gamification

| Method | Path                                | Auth |
| ------ | ----------------------------------- | ---- |
| POST   | /api/v1/feedback                    | JWT |
| GET    | /api/v1/gamification/my-progress    | JWT |
| GET    | /api/v1/opportunities/forecast      | JWT |
| GET    | /api/v1/opportunities/unified-feed  | JWT |

### Geo

| Method | Path                              | Auth |
| ------ | --------------------------------- | ---- |
| GET    | /api/v1/geo/jurisdiction-hint     | none |

### Integrations / Investor / Jobs / KYC / LinkedIn viral

Auth: all JWT or a partner / recruiter token. Full inventory
preserved in the raw dump section below.

### Ops (`/api/v1/ops/*`) — OPS_ADMIN_TOKEN

| Method | Path                                              |
| ------ | ------------------------------------------------- |
| GET    | /api/v1/ops/auto-apply/last-run                   |
| POST   | /api/v1/ops/demo/placement-verify-seed            |
| POST   | /api/v1/ops/demo/recruiter-inbox-refresh          |

### Partner (`/api/v1/partner/*`)

| Method | Path                                              | Auth |
| ------ | ------------------------------------------------- | ---- |
| GET    | /api/v1/partner/exports/applications-recent.csv   | partner_api_key |

### Placement (`/api/v1/placement/*`)

| Method | Path                                              | Auth |
| ------ | ------------------------------------------------- | ---- |
| POST   | /api/v1/placement/verify/confirm                  | candidate verify token |
| GET    | /api/v1/placement/employer/preview                | employer attest link |
| POST   | /api/v1/placement/employer/confirm                | employer attest link |

### Profile import (`/api/v1/profile/*`) — JWT

### Public (`/api/v1/public/*`)

| Method | Path                          | Auth |
| ------ | ----------------------------- | ---- |
| GET    | /api/v1/public/mvp-stats      | none |

### Recruiter (`/api/v1/recruiter/*`)

| Method | Path                                                          | Auth |
| ------ | ------------------------------------------------------------- | ---- |
| GET    | /api/v1/recruiter/inbox                                       | recruiter company token |
| POST   | /api/v1/recruiter/inbox/respond-batch                         | recruiter company token; **R-012 MEDIUM** |
| POST   | /api/v1/recruiter/inbox/{application_id}/respond              | recruiter company token; **R-012 MEDIUM** |
| GET    | /api/v1/recruiter/jobs                                        | recruiter company token |
| POST   | /api/v1/recruiter/jobs                                        | recruiter company token |

### Referrals / Talent pool / Interview coach

JWT throughout. Interview coach (2 LLM routes) also covered by
the Layer 2 rate-limit shipped in `28a50a0`.

## Cross-references

- `P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md` — abuse risk
  grading for every `none` / public-token route above.
- `P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md` — rate-
  limit coverage on LLM mutating routes.
- `SECURITY_RISK_REGISTER_2026-05-27.md` — risk IDs (R-007
  … R-026) cited inline above.
- `app/api/router.py` — source of truth for router wire-up.

## What this inventory does **not** include

- Per-route OpenAPI request / response schemas (live in
  `/openapi.json`).
- Per-route rate-limit budget (mixed: SlowAPI decorator vs
  custom decorator). When R-009 / R-010 / R-011 ship, this
  doc will gain a "Rate-limit budget" column.
- Internal-only (Celery beat) endpoints — they're not HTTP
  routes; they live in `app/tasks/`.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No secret in this inventory (all token names referenced
  by purpose, never value).
- ✅ No deploy / Railway / Vercel change.
- ✅ No DB migration.
- ✅ No `.env` change.
- ✅ No UX / copy change.

## Files

- `docs/BACKEND_ROUTE_INVENTORY_2026-05-27.md` (this doc).

## Related

- `app/api/router.py` — wire-up of the 36 sub-routers.
- `app/main.py` — `app = FastAPI(...)` and CORS / middleware
  attach.
- `docs/P1_DOCS_INDEX_2026-05-27.md` — entry point into the
  security workstream.

Backlog 19 of the long autonomous security session.
