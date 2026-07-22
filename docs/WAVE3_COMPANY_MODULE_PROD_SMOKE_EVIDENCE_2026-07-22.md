# Wave 3 Company — module prod smoke evidence

**Date:** 2026-07-22  
**SHA:** `e841dffc0db0faabef2ed9e067b2581559752a66`  
**Alignment:** FE+API+repo_head **ALIGNED** (`twin-sooty.vercel.app` public-health)  
**Alembic:** `090_company_wave3_hard_live` (applied on API deploy via `start-api.sh`)

## Result

| Check | Result |
|-------|--------|
| Script | `npm run test:wave3-company-module-prod-smoke` |
| Env | `TWIN_PROD_SMOKE_WRITE=1` + prod `RECRUITER_INBOX_TOKEN` (Railway) · company `nova-hiring-pl` |
| Suite | **PASS 4/4** |
| Modules | **PASS 16/16** smokeable Wave 3 modules |
| Demo rejection | `demo-candidate-001` scorecard/trust-summary → 400 |
| Enrollment | still `BLOCKED_BY_FOUNDER` / `external_pilot_enrollment_enabled=false` |

## Policy holds (not smoked toward LIVE)

company_integrations · rec_ats_sync · rec_vacancy_import · company_ats_import_readiness · company_billing · company_billing_public_claim · rec_subscription · company_ms_calendar_write · company_invite_delivery · rec_company_onboarding

## DEMO_ONLY

All `company_demo_*` journeys isolated.
