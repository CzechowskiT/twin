# Wave 1 candidate module prod smoke evidence

**Date:** 2026-07-20T20:25:00Z  
**Result:** **PASS 4/4** (modules **6/6**)  
**Prod SHA (FE+API):** `cf773744c92c7ccfae408175b27c30f498d5361f`  
**Alembic:** `088_candidate_wave1_hard_live`  
**Enrollment:** OFF · Pilot **BLOCKED_BY_FOUNDER**

## Command

```bash
cd frontend
TWIN_PROD_SMOKE_WRITE=1 WAVE1_SMOKE_MODULES=all \
  npm run test:wave1-candidate-module-prod-smoke
```

JWT from approved `/api/v1/auth/register` smoke path (`smoke-*@twin.internal`, `utm_source=smoke`) — never printed/committed.

## Modules PASS

| module_id | Proof |
|-----------|-------|
| candidate_export_preview | export.json + privacy export + export-requests intake |
| candidate_identity_verification | KYC configured/status read + identity_review intake (no Authologic start) |
| cand_notifications | PATCH notification-preferences toggle+restore |
| cand_preferences | visibility preferences POST/PATCH |
| cand_feedback | match-feedback list/POST |
| cand_match_explanation | matches score/match_reason schema |

## Held (not LIVE)

`cand_cv_import` / `cand_cv_parsing` — PROFILE_EDIT requires Standard+ (Stripe policy)
