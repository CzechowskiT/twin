# All workspace modules GREEN — Wave 3 Slice 2 (recruiter + company integrations)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave3-integrations`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 3 Slice 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE3_TRUST_CENTER_2026-07-09.md)  
**PR #441 merge SHA:** `07046c6d4764b90d45c58a5e4f8d1233977d2363`

**Scope:** Frontend/UI + docs + guard only. No backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO route/SoR deletion

---

## 1. Wave 3 Slice 2 goal

Move **recruiter** and **company integrations** (`integrations`, `/recruiter/integrations`, `/company/integrations`) from workspace visibility to **product roadmap outside workspace** — while preserving routes, components, SoR entries, and static readiness previews.

**Selected modules:** `integrations` (recruiter + company hub card IDs)

**Previous status:** ORANGE/ROADMAP — `coming_soon` badge; honest static readiness rows; hidden from hub since Wave 1 but still in extended nav and marketing preview cards.

**Why not GREEN_WORKING:**

| Criterion | Recruiter integrations | Company integrations |
|-----------|------------------------|----------------------|
| Auth flow | Demo workspace only | Demo workspace only |
| Core action | Readiness matrix — no OAuth connect | Readiness matrix — no webhook writeback |
| Badge | `coming_soon` / `pilot` on SoR | `coming_soon` / `pilot` on SoR |
| Subflows | ATS import scaffold, calendar `not_live` | ATS webhooks `planned`, calendar `not_live` |
| Live sync | `INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC = true` | Same |

**Action:** `MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`

---

## 2. Integrations surface inventory

| Surface | Route / ID | Type | Workspace visible | Action |
|---------|------------|------|-------------------|--------|
| Hub card `integrations` (recruiter) | `/recruiter/integrations` | Workspace module | **N** (Wave 1 hidden) | MOVE_TO_ROADMAP |
| Hub card `integrations` (company) | `/company/integrations` | Workspace module | **N** (Wave 1 hidden) | MOVE_TO_ROADMAP |
| Recruiter integrations page | `/recruiter/integrations` | Readiness preview | Deep link only | PRESERVE + roadmap badge |
| Company integrations page | `/company/integrations` | Readiness preview | Deep link only | PRESERVE + roadmap badge |
| ATS subflows | `/recruiter/integrations/ats/*`, `/company/integrations/ats/*` | Scaffold previews | Deep link only | PRESERVE |
| SoR `recruiter_integrations` + `recruiter_ats_import_readiness` | system-of-record-routes | Registry | Hidden from hub | PRESERVE |
| SoR `company_integrations` + `company_ats_import_readiness` | system-of-record-routes | Registry | Hidden from hub | PRESERVE |
| Extended workspace nav | was linking integrations | Primary/extended nav | **Removed** | Green-only nav |
| Company marketing preview card | was `/company/integrations` | Marketing | **Roadmap anchor** | `/investor/roadmap#company-integrations` |
| Investor roadmap | `#recruiter-integrations`, `#company-integrations` | Roadmap card | Public | NEW |
| `/for-recruiters`, `/for-companies` | marketing persona pages | Public | Roadmap copy + anchor links | UPDATED |

**No Pilot/Preview/Coming Soon integration cards** in recruiter/company workspace hub after Wave 3 Slice 2.

---

## 3. What changed vs Wave 3 Slice 1

| Layer | Wave 3 Slice 1 | Wave 3 Slice 2 |
|-------|----------------|----------------|
| Hub card `integrations` (recruiter/company) | Hidden from hub | Unchanged — still hidden |
| `GREEN_WORKSPACE_ALLOWED_IDS` recruiter/company | Excludes `integrations` | Unchanged |
| Extended workspace nav | Linked integrations | **Removed** |
| Marketing `/for-*` | Some ATS/calendar tier bullets | **Roadmap-only + anchor links** |
| Company entry preview | Linked `/company/integrations` | **Roadmap anchor** |
| Investor roadmap | Trust Center section only | **+ recruiter/company integrations sections** |
| Deep link pages | Honest boundary copy | **+ outside-workspace note + roadmap link** |
| Routes / SoR / components | Preserved | **Preserved** |

---

## 4. Roadmap outside workspace

Integrations are documented on:

- `/investor/roadmap#recruiter-integrations` — recruiter ATS, calendar, CSV, webhooks/OAuth status
- `/investor/roadmap#company-integrations` — employer ATS, calendar, CSV, webhooks status
- `/for-recruiters`, `/for-companies` — integrations roadmap note + anchor links
- `/recruiter/integrations`, `/company/integrations` — readiness preview with roadmap badge (deep link, not workspace module)

Copy (EN):

- "Integrations are on the product roadmap."
- "No live ATS or calendar sync in the current pilot."
- "Current surfaces are readiness previews only."

---

## 5. Visibility per workspace (post Wave 3 Slice 2)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged) | 4 |
| **Recruiter** | 5 (inbox, pipeline, jobs, search, analytics) | 7 |
| **Company** | 3 (dashboard, roles, pipeline) | 6 |
| **Investor** | 4 (unchanged) | 2 + board/admin via D5 |

**Hidden count:** Wave 1 audit = 20 card IDs; effective = **19** (unchanged — integrations were hidden in Wave 1).

**Recruiter green hub modules:** inbox, pipeline, jobs, search, analytics.

**Company green hub modules:** dashboard, roles, pipeline.

---

## 6. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE3_SLICE2_*` exports; roadmap outside hrefs |
| `frontend/src/lib/seven-day-d3-recruiter.ts` | `RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`, `HIDE_RECRUITER_INTEGRATIONS_FROM_NAV` |
| `frontend/src/lib/seven-day-d4-company.ts` | `COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE`, `HIDE_COMPANY_INTEGRATIONS_FROM_NAV` |
| `frontend/src/components/recruiter/recruiter-workspace-nav.tsx` | Remove integrations from extended nav |
| `frontend/src/components/company/company-workspace-nav.tsx` | Remove integrations from extended nav |
| `frontend/src/app/recruiter/integrations/recruiter-integrations-client.tsx` | Outside-workspace note + roadmap link |
| `frontend/src/app/company/integrations/company-integrations-client.tsx` | Outside-workspace note + roadmap link |
| `frontend/src/lib/investor-founder-roadmap.ts` | `nextRecruiterIntegrations`, `nextCompanyIntegrations` |
| `frontend/src/components/investor/investor-roadmap-founder-updates-panel.tsx` | `#recruiter-integrations`, `#company-integrations` |
| `frontend/src/lib/company-entry-navigation.ts` | Preview card → roadmap anchor |
| `frontend/src/components/marketing/persona-marketing-page.tsx` | Integrations roadmap section |
| `frontend/src/lib/persona-pages.ts` | Honest marketing logistics |
| `frontend/src/lib/i18n.ts` | Wave 3 integrations copy EN + PL |
| `frontend/scripts/all-workspace-modules-green-wave3-integrations-guard.test.ts` | Static regression guard |

**Unchanged (preserved):** all `/recruiter/integrations/*` and `/company/integrations/*` routes, readiness components, SoR entries, ATS scaffold subflows.

---

## 7. Remaining Wave 3 candidates

| Module | Action | Status |
|--------|--------|--------|
| investor public login preview | MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE | Planned |

---

## 8. Tests

```bash
npm run test:all-workspace-modules-green-wave3-integrations-guard
npm run test:all-workspace-modules-green-wave3-trust-center-guard
npm run test:seven-day-d3-recruiter-guard
npm run test:seven-day-d4-company-guard
npm run test:product-surface-visibility-guard
```

---

## 9. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE3_INTEGRATIONS_DATE: 2026-07-09
PR_441_MERGE_SHA: 07046c6d4764b90d45c58a5e4f8d1233977d2363
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE3_SLICE2_MOVE_TO_ROADMAP_MODULES: recruiter_integrations, company_integrations
WAVE3_SLICE2_MOVE_TO_ROADMAP_ACTION: MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF: /investor/roadmap#recruiter-integrations
COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF: /investor/roadmap#company-integrations
WAVE3_SLICE2_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 3 — investor public login preview MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
```
