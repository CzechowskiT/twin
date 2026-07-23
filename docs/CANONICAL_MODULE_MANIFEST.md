# Canonical Product Module Manifest

**Canonical.** One enforceable inventory for Hard LIVE + capability + activation.  
**Updated:** 2026-07-23 (External Blocker Elimination — HITL attestations + Class D/manifest guards)  
**Branch:** `cursor/phase1-monorepo-scaffold`

## Vocabulary

| Kind | Meaning |
|------|---------|
| MODULE | Hard LIVE evidence row (`docs/HARD_LIVE_EVIDENCE_REGISTRY.json`) |
| CAPABILITY | Product capability map row (`docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md`) |
| ACTIVATION | Workspace hub activation id (`frontend/src/lib/all-workspace-modules-activation.ts`) |
| ROUTE | Frontend App Router path |
| API | Backend `/api/v1` surface |
| WORKER | Celery task |

## Rules

1. Every MODULE must map to ≥1 ROUTE and ≥1 API (or N/A with justification).
2. CAPABILITY LIVE requires MODULE PASS + smoke SHA on aligned deploy.
3. Unmapped ROUTE/API/WORKER under product personas must appear here as PENDING_MAP or REJECTED.
4. Guard: `frontend/scripts/canonical-module-manifest-guard.test.ts`
5. Do not delete MODULE rows to lower HELD counts.
6. Every Hard LIVE module with status `HELD_POLICY` or `BLOCKED*` must appear in **Hard LIVE HELD / BLOCKED inventory** below with **class** + **blocker**. Unmapped held modules fail CI.

## Sources of truth

| Layer | Path |
|-------|------|
| Hard LIVE | `docs/HARD_LIVE_EVIDENCE_REGISTRY.json` |
| Capability | `docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md` |
| Activation | `frontend/src/lib/all-workspace-modules-activation.ts` |
| This manifest | `docs/CANONICAL_MODULE_MANIFEST.md` |
| Class decisions | `docs/FOUNDER_HELD_POLICY_RELEASE_DECISION_PACK.md` |

## Hard LIVE HELD / BLOCKED inventory

Every non-PASS Hard LIVE row must be listed. Class letters follow Founder decision pack (A–F / C operator).

| module_id | status | class | blocker |
|-----------|--------|-------|---------|
| cand_ms_calendar | HELD_POLICY | A | MICROSOFT_WRITE_BLOCKED |
| plan_payments | HELD_POLICY | A | STRIPE_NOT_PUBLIC |
| plat_ms_calendar_write | HELD_POLICY | A | MICROSOFT_WRITE_BLOCKED |
| plat_ms_calendar_busy_read | HELD_POLICY | A | MICROSOFT_BUSY_READ_FLAG_OFF |
| plat_stripe_public | HELD_POLICY | A | STRIPE_NOT_PUBLIC |
| plat_authologic_auto_kyc | HELD_POLICY | A | AUTHOLOGIC_AUTO_KYC_OFF |
| plat_identity_kyc | HELD_POLICY | C | AUTHOLOGIC_CONFIG_DEPENDENT |
| investor_s3_required_download | HELD_POLICY | C | S3_FOUNDER_KEYS |
| plat_slack_connector | BLOCKED_EXTERNAL_CREDENTIALS | C | BLOCKED_EXTERNAL_CREDENTIALS |
| ai_act_certified_claim | HELD_POLICY | D | NO_LEGAL_CERTIFICATION |
| ai_protected_attr_monitoring | HELD_POLICY | D | PROTECTED_ATTR_MONITORING_LEGAL_HOLD |
| company_ms_calendar_write | HELD_POLICY | E | MICROSOFT_WRITE_BLOCKED |
| plat_ats_live_sync_write | HELD_POLICY | E | ATS_LIVE_SYNC_BLOCKED |
| plat_ats_write_sync | HELD_POLICY | E | ATS_LIVE_SYNC_BLOCKED |
| investor_external_attestations | HELD_POLICY | F | NO_VERIFIED_CUSTOMER_CLAIMS |

**Class D note:** `TECH_READY_NO_CLAIM` — honesty may expose tech_ready=true while `ai_act_certified=false` and `protected_attr_monitoring_legal_gate_open=false`. Registry must never mark these PASS.

**Class F HITL:** `investor_external_attestations` — founder-signed queue (`/api/v1/platform/wave4/attestations`); `verified_customer_claims` stays false until ≥1 SIGNED row.

## Founder completion delta (prior batch)

| Cluster | Change |
|---------|--------|
| Calendar | Recruiter calendar LIVE holds; company draft holds |
| ATS | Harvest + Lever client stubs; vacancy preview honesty; sync dry-run → `ats_sync_attempts` |
| Billing | Company sandbox checkout CTA → `/billing/checkout-session` (STRIPE_NOT_PUBLIC_LAUNCH); uses `STRIPE_PRICE_ID_COMPANY_PILOT` |
| AI | Sandbox external verification + HITL employment ban retained |
| Enrollment | Capability readiness API with kill-switch OFF |
| Class A | Busy-read FE opt-out; auto-apply strip visible; MS coming-soon force off |

## Investor SOR proof ATS (`investor_sor_proof_ats`)

**Evidence table:** `ats_sync_attempts` (migration `097_founder_completion_ats_calendar_billing`)

**How smoke proves import readiness without live write:**

1. `GET /api/v1/integrations/ats/vacancies/preview` — without OAuth returns honest empty (`NEEDS_AUTH` / `NEEDS_OAUTH`, `jobs: []`); with Harvest/Lever token lists posts (`source: harvest|lever`, `writeback: false`).
2. `POST /api/v1/integrations/ats/sync/dry-run` — inserts a row with `dry_run=true`, `status=dry_run_ok`, `ats_write=false`; never calls Greenhouse/Lever mutate APIs.
3. `GET /api/v1/integrations/ats/sync/attempts` — lists evidence rows for diligence; `ats_live_sync` stays `BLOCKED` until Founder flag + Hard LIVE smoke.
4. `POST /api/v1/integrations/ats/sync/write` — returns 403 while `ATS_LIVE_SYNC` is off (do **not** promote Hard LIVE PASS yet).

**Remaining for real Greenhouse OAuth smoke:** partner OAuth env (`GREENHOUSE_CLIENT_ID/SECRET`, redirect URI), Railway secrets, recruiter connect flow, then Harvest list under authenticated user — still no live write until `ATS_LIVE_SYNC`.

## Unmapped / deferred (not deleted)

- Sales OS Layer 1 capabilities (NOT_BUILT) — remain on capability map
- Admin INTERNAL_ONLY routes — expected absent from Hard LIVE
- Board diligence pages — activation/capability only until Hard LIVE rows exist
