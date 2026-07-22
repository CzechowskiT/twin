# Wave 3 Company Complete — final evidence

**Date:** 2026-07-22  
**Verdict:** **DONE_WITH_POLICY_HOLDS**  
**Merge:** PR [#534](https://github.com/CzechowskiT/twin/pull/534) @ `e841dffc0db0faabef2ed9e067b2581559752a66`  
**Alembic:** `090_company_wave3_hard_live`  
**Stance unchanged:** Pilot **BLOCKED_BY_FOUNDER** · Gate F **PENDING** · Launch **NO-GO** · enrollment **OFF**

## Smoke

| Check | Result |
|-------|--------|
| Script | `npm run test:wave3-company-module-prod-smoke` |
| Env | `TWIN_PROD_SMOKE_WRITE=1` + prod `RECRUITER_INBOX_TOKEN` (Railway) · company `nova-hiring-pl` |
| Suite | **PASS 4/4** |
| Modules | **PASS 16/16** smokeable Wave 3 modules |
| Demo rejection | `demo-candidate-001` scorecard/trust → 400 |

## LIVE promotions (post-smoke)

16 Hard LIVE **PASS** (Wave 3). Capability map LIVE for PILOT promotions: hiring cockpit/command center, talent pool, team, trust summary, plus new org settings / permissions / analytics / audit / scorecards / notifications / synthetic onboarding. Core LIVE modules re-confirmed by regression smoke.

## Policy holds remaining

company_integrations · rec_ats_sync · rec_vacancy_import · company_ats_import_readiness · company_billing · company_billing_public_claim · rec_subscription · company_ms_calendar_write · company_invite_delivery · rec_company_onboarding

## DEMO_ONLY isolation

All `company_demo_*`

## Explicit non-flips

No Wave 4 start · No Founder Command · No Product Agent · No invites · No enrollment ON · No Stripe/ATS/MS write/auto-apply/Authologic flip
