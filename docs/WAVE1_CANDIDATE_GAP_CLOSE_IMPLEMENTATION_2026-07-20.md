# Wave 1 Candidate Gap Close — implementation evidence (pre-smoke)

**Date:** 2026-07-20  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Scope:** Full Product Productionization — Wave 1 Candidate Gap Close (not Wave 2)

## Goal

Close remaining Wave 1 technical gaps with honest LIVE boundaries:
- Per-module authenticated prod smoke harness (`WAVE1_SMOKE_MODULES`)
- `candidate_export_preview` → real self-serve export lifecycle + ops intake (not auto DSR fulfillment)
- `candidate_identity_verification` → manual identity review status LIVE path; `plat_identity_kyc` stays HELD
- Six `cand_*` modules smokeable without fake KYC / enrollment / policy flips

## Stance (unchanged)

| Field | Value |
|-------|-------|
| Pilot | BLOCKED_BY_FOUNDER |
| Gate F | PENDING |
| Launch | NO-GO |
| Enrollment | OFF |
| Auto-apply | PAUSED |
| Stripe | NOT LIVE |
| ATS | BLOCKED |
| MS write | BLOCKED |
| Authologic KYC start | HELD (`plat_identity_kyc`) |

## DSR honesty split

| Layer | Mechanism | LIVE claim |
|-------|-----------|------------|
| Intake | `POST /privacy-requests` (`export`, `identity_review`, …) | Yes (queue) |
| Self-serve access | `GET /candidates/me/export.json` | Yes |
| Ops intake row | `POST /export-requests` type `candidate_export_intake` status `queued_for_ops_intake` | Yes (non-fulfillment) |
| Legal fulfillment / deletion | Manual GDPR ops | HELD / INTERNAL |

## Smoke

```bash
# Fail-closed without JWT
npm run test:wave1-candidate-module-prod-smoke

# Authenticated (excluded metrics account)
TWIN_PROD_TEST_JWT=… TWIN_PROD_SMOKE_WRITE=1 \
  WAVE1_SMOKE_MODULES=all \
  npm run test:wave1-candidate-module-prod-smoke
```

Select one module: `WAVE1_SMOKE_MODULES=cand_notifications`.

## LIVE badge rule

Do **not** mark capability map / Hard LIVE registry PASS until this module smoke PASSes on aligned prod SHA.
