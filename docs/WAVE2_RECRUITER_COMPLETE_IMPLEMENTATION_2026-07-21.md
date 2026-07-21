# Wave 2 Recruiter Complete — implementation

**Date:** 2026-07-21  
**Scope:** Full Product Productionization — Wave 2 Recruiter Complete (not Wave 3)  
**Branch:** `feat/wave2-recruiter-complete`  
**Alembic:** `089_recruiter_wave2_hard_live` (after `088_candidate_wave1_hard_live`)

## Shipped

- Hard LIVE registry Wave 2 (TS + JSON + CI guard) — PENDING_SMOKE / HELD_POLICY / DEMO_ONLY
- `recruiter_decision_memory_entries` + live `/api/v1/recruiter/decision-memory` (rejects `demo-candidate-*`)
- Job lifecycle `PATCH /jobs/{id}` + `POST /jobs/{id}/archive`
- Team invite dry-run `POST /team/invites/dry-run` (outbox draft; synthetic emails only; enrollment OFF)
- Communications draft `POST /communications/draft` (`send=true` rejected)
- Platform API `/api/v1/platform/wave2/status` + hard-live evidence mark
- Smoke harness `WAVE2_SMOKE_MODULES` → `npm run test:wave2-recruiter-module-prod-smoke`
- Demo/SoR capability rows → **DEMO_ONLY**

## Policy holds (unchanged)

| Hold | Modules |
|------|---------|
| ATS live-sync BLOCKED | `recruiter_integrations`, `investor_sor_proof_ats` |
| MS calendar write BLOCKED | `recruiter_calendar`, `rec_interview_scheduling` |
| Enrollment OFF | `rec_recruiter_onboarding` |
| NOT_BUILT | `rec_sla_tracking` |
| Auto-apply PAUSED / Stripe NOT LIVE / Authologic OFF | (cross-persona; not flipped) |

## Smoke (post-deploy)

```bash
cd frontend
set -a && source .env.local && set +a
TWIN_PROD_SMOKE_WRITE=1 WAVE2_SMOKE_MODULES=all \
  npm run test:wave2-recruiter-module-prod-smoke
```

Requires `RECRUITER_INBOX_TOKEN` (or `TWIN_PROD_RECRUITER_JWT`) + company slug (`nova-hiring-pl` default). Never prints JWT. No real outbound / ATS write / calendar invites to humans.

Do **not** mark capability map / Hard LIVE registry PASS until this module smoke PASSes on aligned prod SHA.

## Rollback

- Flags: `RECRUITER_WAVE2_*` off; policy flags stay false
- Migration reverse: drop `recruiter_decision_memory_entries` only if empty/safe
- Prior Railway/Vercel deploy

## Explicit non-flips

No Wave 3 · No Founder Command · No Product Agent · No invites · No enrollment ON · No Stripe/ATS/MS write/auto-apply/Authologic flip · No Pilot/Gate F/Launch flip
