# Candidate readiness working flow — 2026-07-09

**Branch:** `feat/candidate-readiness-working-flow`  
**Scope:** frontend/UI + docs + guard only. Uses existing `GET /api/v1/candidates/me/verified-readiness` — no backend changes.  
**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Executive summary

Candidates can complete missing readiness checklist items via **real working pages** — not stubs. Status updates come from the existing verified-readiness API when the user is authenticated. **Delegated apply stays OFF** and **auto-apply remains PAUSED/hidden**. Copy is explicit: profile can reach review-ready; delegated sending remains disabled.

| Flow item | Completion route | API signal |
|-----------|------------------|------------|
| Profile basics | `/profile` | `profile_present` |
| CV material | `/profile` | `cv_present` |
| Career brief | `/dashboard/career` | `career_brief_present` |
| Skill evidence baseline | `/dashboard/evidence` | `skill_evidence_present` |
| Required consent | `/consent/gdpr` | `consent_general_present` |
| Storage / CV consent | `/consent/gdpr` | `consent_storage_present` |

Dashboard hub: `/dashboard#dashboard-readiness` (Lista gotowości / Readiness checklist card).

---

## What works today

1. **Dashboard checklist** — `DashboardVerifiedReadinessCard` loads verified-readiness gate; missing items link to completion routes above.
2. **Career compass** — live page saves career brief via existing career-compass API; banner links back to checklist.
3. **Evidence vault** — live page adds proof items via evidence API; banner links back to checklist.
4. **Consent panel** — `/consent/gdpr` for general + storage consent (unchanged).
5. **Apply guard** — `jobApplyActionsGuardFromReadiness` blocks delegated submit; `can_prepare_application_package` may allow package prep only.

---

## What stays disabled

| Capability | Status | Notes |
|------------|--------|-------|
| Delegated apply | **OFF** | `delegated_apply_allowed` / submit gated |
| Auto-apply strip | **PAUSED / hidden** | `SHOW_DASHBOARD_AUTO_APPLY_STRIP = false` |
| Launch | **NO-GO** | Gate F PENDING |

Copy lock: `candidateReadinessWorkingFlow.profileReadyDelegatedOff` — profile can be ready; delegated sending disabled.

---

## Implementation inventory

| File | Role |
|------|------|
| `frontend/src/lib/candidate-readiness-working-flow.ts` | Route map + stance flags |
| `frontend/src/components/dashboard/dashboard-verified-readiness-card.tsx` | Checklist + missing-item links |
| `frontend/src/components/candidate/candidate-readiness-flow-banner.tsx` | Career/evidence → checklist cross-link |
| `frontend/src/app/dashboard/career/page.tsx` | Career brief completion |
| `frontend/src/app/dashboard/evidence/candidate-evidence-client.tsx` | Evidence baseline completion |
| `frontend/scripts/candidate-readiness-working-flow-guard.test.ts` | Static guard |

---

## Tests run (this slice)

- `git diff --check`
- `npx tsc --noEmit`
- `npm run test:candidate-readiness-working-flow-guard`
- `npm run test:seven-day-d2-candidate-guard`
- `npm run test:product-polish-p0-guard` … `p1-guard`
- `npm run build`

---

## Open limitations

- Readiness status requires auth + live API; unauthenticated users see login flow only.
- No new backend fields — checklist reflects server-side verified-readiness only.
- Delegated apply enablement remains a separate founder/product decision.

---

## Stance footer

**P0:** CLOSED · **Gate E:** PASS · **Gate F:** PENDING · **Launch:** NO-GO  
**NOT** Launch GO · **NOT** Gate F YES · **NOT** delegated apply live
