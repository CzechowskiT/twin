# Canonical Product Module Manifest

**Canonical.** One enforceable inventory for Hard LIVE + capability + activation.  
**Updated:** 2026-07-23 (Founder architecture reclass — Hard LIVE denominator = CORE_PILOT_ONLY)  
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
| PRODUCT_INCLUSION | `CORE_PILOT` \| `POST_PILOT` \| `OPTIONAL_INTEGRATION` \| `LEGAL_MARKETING_CLAIM` \| … (`frontend/src/lib/product-inclusion-taxonomy.ts`) |

## Rules

1. Every MODULE must map to ≥1 ROUTE and ≥1 API (or N/A with justification).
2. CAPABILITY LIVE requires MODULE PASS + smoke SHA on aligned deploy.
3. Unmapped ROUTE/API/WORKER under product personas must appear here as PENDING_MAP or REJECTED.
4. Guard: `frontend/scripts/canonical-module-manifest-guard.test.ts`
5. Do not delete MODULE rows to lower HELD counts — **reclassify** via product inclusion instead.
6. Hard LIVE launch-readiness denominator = **CORE_PILOT only** (`HARD_LIVE_DENOMINATOR_RULE`).
7. Every Hard LIVE module with status `HELD_POLICY` or `BLOCKED*` (CORE denominator) must appear in **Hard LIVE CORE held / blocked inventory** below with **class** + **blocker**. Reclassified optional/legal/post-pilot rows appear in **Product inclusion reclass inventory**.

## Sources of truth

| Layer | Path |
|-------|------|
| Hard LIVE | `docs/HARD_LIVE_EVIDENCE_REGISTRY.json` |
| Product inclusion | `frontend/src/lib/product-inclusion-taxonomy.ts` |
| Capability | `docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md` |
| Activation | `frontend/src/lib/all-workspace-modules-activation.ts` |
| This manifest | `docs/CANONICAL_MODULE_MANIFEST.md` |
| Class decisions | `docs/FOUNDER_HELD_POLICY_RELEASE_DECISION_PACK.md` |

## Hard LIVE CORE held / blocked inventory

Every non-PASS **CORE_PILOT** Hard LIVE row must be listed. Class letters follow Founder decision pack (A–F / C operator).

| module_id | status | class | blocker | product_inclusion |
|-----------|--------|-------|---------|-------------------|
| investor_s3_required_download | HELD_POLICY | C | SECURE_DOWNLOAD_BE_TODO | CORE_PILOT |

**Note:** Temporary CORE held until provider-neutral secure download BE is ready (parent TODO). Metadata list already PASS via `investor_data_room_list`.

## Product inclusion reclass inventory

Former HELD/BLOCKED rows **truthfully reclassified** out of the Hard LIVE denominator (not deleted).

| module_id | status | class | blocker | product_inclusion | CORE counterpart (already PASS) |
|-----------|--------|-------|---------|-------------------|----------------------------------|
| cand_ms_calendar | OPTIONAL_INTEGRATION_NOT_CONFIGURED | A | MICROSOFT_WRITE_BLOCKED | OPTIONAL_INTEGRATION | ICS/holds + Google calendar |
| company_ms_calendar_write | OPTIONAL_INTEGRATION_NOT_CONFIGURED | E | MICROSOFT_WRITE_BLOCKED | OPTIONAL_INTEGRATION | ICS/holds |
| plat_ms_calendar_write | OPTIONAL_INTEGRATION_NOT_CONFIGURED | A | MICROSOFT_WRITE_BLOCKED | OPTIONAL_INTEGRATION | ICS/holds + busy-read |
| plat_identity_kyc | OPTIONAL_INTEGRATION_NOT_CONFIGURED | C | AUTHOLOGIC_CONFIG_DEPENDENT | OPTIONAL_INTEGRATION | candidate_identity_verification |
| plat_authologic_auto_kyc | OPTIONAL_INTEGRATION_NOT_CONFIGURED | A | AUTHOLOGIC_AUTO_KYC_OFF | OPTIONAL_INTEGRATION | candidate_identity_verification |
| plat_ats_live_sync_write | OPTIONAL_INTEGRATION_NOT_CONFIGURED | E | ATS_LIVE_SYNC_BLOCKED | OPTIONAL_INTEGRATION | ATS dry-run/export/preview |
| plat_ats_write_sync | OPTIONAL_INTEGRATION_NOT_CONFIGURED | E | ATS_LIVE_SYNC_BLOCKED | OPTIONAL_INTEGRATION | ATS dry-run evidence |
| plat_slack_connector | OPTIONAL_INTEGRATION_NOT_CONFIGURED | C | BLOCKED_EXTERNAL_CREDENTIALS | OPTIONAL_INTEGRATION | email/in-app notifications |
| ai_protected_attr_monitoring | POST_PILOT | D | PROTECTED_ATTR_MONITORING_LEGAL_HOLD | POST_PILOT | — (post-pilot) |
| ai_act_certified_claim | LEGAL_MARKETING_CLAIM | D | NO_LEGAL_CERTIFICATION | LEGAL_MARKETING_CLAIM | claim guard honesty (not certified) |

**Class D note:** `TECH_READY_NO_CLAIM` — honesty may expose tech_ready=true while `ai_act_certified=false` and `protected_attr_monitoring_legal_gate_open=false`. Registry must never mark these PASS / CORE.

**Class F HITL:** `investor_external_attestations` — founder-signed queue (`/api/v1/platform/wave4/attestations`); `verified_customer_claims` stays false until ≥1 SIGNED row. (PASS / CORE_PILOT)

## Founder completion delta (prior batch)

| Cluster | Change |
|---------|--------|
| Calendar | Recruiter calendar LIVE holds; company draft holds |
| ATS | Harvest + Lever client stubs; vacancy preview honesty; sync dry-run → `ats_sync_attempts` |
| Billing | Company sandbox checkout CTA → `/billing/checkout-session` (STRIPE_NOT_PUBLIC_LAUNCH); uses `STRIPE_PRICE_ID_COMPANY_PILOT` |
| AI | Sandbox external verification + HITL employment ban retained |
| Enrollment | Capability readiness API with kill-switch OFF |
| Class A | Busy-read FE opt-out; auto-apply strip visible; MS coming-soon force off |
| Architecture reclass | Hard LIVE denominator = CORE_PILOT_ONLY; optional vendors / legal claims leave denominator |

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
