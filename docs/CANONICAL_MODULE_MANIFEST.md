# Canonical Product Module Manifest

**Canonical.** One enforceable inventory for Hard LIVE + capability + activation.  
**Updated:** 2026-07-23 (Founder completion BUILD batch)  
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

## Sources of truth

| Layer | Path |
|-------|------|
| Hard LIVE | `docs/HARD_LIVE_EVIDENCE_REGISTRY.json` |
| Capability | `docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md` |
| Activation | `frontend/src/lib/all-workspace-modules-activation.ts` |
| This manifest | `docs/CANONICAL_MODULE_MANIFEST.md` |

## Founder completion delta (this batch)

| Cluster | Change |
|---------|--------|
| Calendar | Recruiter calendar LIVE holds; company draft holds |
| ATS | Harvest + Lever client stubs; vacancy preview honesty; sync dry-run → `ats_sync_attempts` |
| Billing | Company sandbox checkout CTA → `/billing/checkout-session` (STRIPE_NOT_PUBLIC_LAUNCH) |
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
