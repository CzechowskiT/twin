# Wave 5 Calendar & Integrations — module prod smoke evidence

**Date:** 2026-07-22  
**SHA:** `b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18`  
**API + FE:** aligned on Railway + Vercel  
**Alembic:** `091_integrations_wave5_hard_live`

## Smoke

| Check | Result |
|-------|--------|
| Script | `npm run test:wave5-integrations-module-prod-smoke` |
| Env | `TWIN_PROD_SMOKE_WRITE=1` + excluded `smoke-*@twin.internal` JWT (register path; never committed) |
| Suite | **PASS 4/4** |
| Modules | **PASS 18/18** smokeable Wave 5 modules |
| Fail-closed | No JWT / no metrics exclusion / real email / real calendar write / real ATS write → FAIL |
| Provider writes | Never — Google/MS/ATS honesty only; ICS synthetic; webhook dry-run |

## Policy holds verified on `/platform/wave5/status`

- `microsoft_write=BLOCKED`
- `ats_live_sync=BLOCKED`
- `stripe_public=NOT_LIVE`
- `authologic_kyc=OFF`
- `auto_apply=PAUSED`
- `external_pilot_enrollment_enabled=false`
- `live_claim=false`

## Wave 4 honesty

Wave 4 Investor Complete **was not shipped** — Wave 5 proceeded from Wave 3 HEAD without inventing Wave 4.
