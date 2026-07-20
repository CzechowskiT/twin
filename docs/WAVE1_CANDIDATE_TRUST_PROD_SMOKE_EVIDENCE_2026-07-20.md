# Wave 1 candidate trust — authenticated prod smoke evidence

**Date:** 2026-07-20  
**Result:** **PASS** (4/4)  
**Prod SHA (FE+API):** `9a889a8e9d685c1270e64b2954913c9b37e4357b`  
**Alembic current:** `088_candidate_wave1_hard_live`  
**Enrollment:** `EXTERNAL_PILOT_ENROLLMENT_ENABLED=false` · Pilot **BLOCKED_BY_FOUNDER**  
**Gates unchanged:** Gate F **PENDING** · Launch **NO-GO** · Phase 3B **not flipped** · no invites

## Command (secrets ephemeral — never committed)

```bash
cd frontend
# TWIN_PROD_TEST_JWT from approved smoke register path (exclude_from_product_metrics)
TWIN_PROD_SMOKE_WRITE=1 npm run test:wave1-candidate-trust-prod-smoke
```

## Checks

| # | Check | Result |
|---|--------|--------|
| 1 | Smoke artifacts present | PASS |
| 2 | Unauth trust/wave1 paths → 401 | PASS |
| 3 | public-health aligned + enrollment gate OFF | PASS |
| 4 | Auth live-bundle + idempotent privacy correction write + cancel | PASS |

## Account

- Created via approved `/api/v1/auth/register` smoke path (`smoke-*@twin.internal`, `utm_source=smoke`)
- Candidate profile created via `POST /api/v1/candidates/` (required for live-bundle)
- Metrics exclusion heuristics apply (email prefix + UTM) — no NS pollution intended
- JWT never printed, never committed; shell ephemeral only

## LIVE promotions (post-smoke)

| Module | Evidence | Capability map |
|--------|----------|----------------|
| `candidate_consent_receipt` | PASS | **LIVE** |
| `candidate_control_center` | PASS | **LIVE** |
| `candidate_correction_request` | PASS | **LIVE** |
| `candidate_data_portability` | PASS | **LIVE** |
| `candidate_trust_audit_export` | PASS | **LIVE** |
| `candidate_trust_overview` | PASS | **LIVE** |
| `candidate_export_preview` | PARTIAL | **PARTIAL** (non-fulfillment queue) |
| `candidate_identity_verification` | PARTIAL | **PARTIAL** (Authologic #15) |
| `cand_*` (notif/prefs/cv/feedback/match) | PENDING_SMOKE | unchanged PARTIAL |
| Policy holds | HELD_POLICY | unchanged |

## Explicit non-flips

- No Wave 2
- No Founder Command
- No real invites / enrollment ON
- No Gate F / Launch / Phase 3B / Pilot flip
