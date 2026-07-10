# All workspace modules GREEN — Wave 2B Slice 4 (investor workspace)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave2b-investor-workspace`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 2A:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md)  
**Wave 2B Slice 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md)  
**Wave 2B Slice 2:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_2026-07-09.md)  
**Wave 2B Slice 3:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_COMPANY_DASHBOARD_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_COMPANY_DASHBOARD_2026-07-09.md)  
**PR #439 merge SHA:** `f262162a20ff6d028f390ff066e64b90747175a7`  
**D5 investor:** [SEVEN_DAY_D5_INVESTOR_EXECUTION_2026-07-08.md](./SEVEN_DAY_D5_INVESTOR_EXECUTION_2026-07-08.md)

**Scope:** Frontend/UI visibility + docs + guard only. Uses existing investor routes, metrics dashboard, roadmap, calculator, and mailto contact — no backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO new backend

---

## 1. Wave 2B Slice 4 goal

Confirm **investor core quartet** (`metrics`, `roadmap`, `calculator`, `contact`) as **GREEN_WORKING** in workspace hub — Live badge only, honest diligence copy, M9 smoke-close via static/code audit.

**Selected workspace:** Investor

**Selected module:** `metrics` (`/investor/metrics`) — formalizes all four green investor hub cards.

**Why GREEN_WORKING (audit):**

| Criterion | Metrics | Roadmap | Calculator | Contact |
|-----------|---------|---------|------------|---------|
| Auth flow | Investor workspace gate or public metrics | Investor workspace gate | Public + workspace route | `mailto:contact@twin.care` CTA |
| Core action | Read-only aggregates + public-health signals | Transparent now/next/later matrix | Illustrative five-year scenario model | Founder email conversation |
| Badge | `INVESTOR_METRICS_SHIP_STATUS = live` | `INVESTOR_ROADMAP_SHIP_STATUS = live` | `INVESTOR_CALCULATOR_SHIP_STATUS = live` | `INVESTOR_CONTACT_SHIP_STATUS = live` |
| Copy | Read-only; no audited ARR or cohort claims | Production reality; no slide-deck launch dates | Illustrative only; **not investment advice** | Working founder contact; no fake secure room |
| M9 smoke | **NEEDS_FOUNDER_VISUAL_SMOKE** — no dedicated investor demo login in founder doc; static GREEN only |
| Proof claims | **OFF** — no verified external customer attestations |

**Why not hidden:** Investor hub showed **4 Live cards** in Wave 1 (metrics, roadmap, calculator, contact). Wave 2B closes M9 NEEDS_REVIEW classification from the green plan — formal MAKE_GREEN, not a hub restore.

**Hidden from visible hub (routes/SoR preserved):** data_room (invite-only/founder decision), placement (limited pilot), trust_proof, product_proof, board evidence (`/board/*`), admin/internal, investor login invite-only preview card.

---

## 2. Module change summary

| Field | Wave 1 | Wave 2B Slice 4 |
|-------|--------|-----------------|
| Hub visibility | 4 Live cards | Unchanged — confirmed GREEN |
| `GREEN_WORKSPACE_ALLOWED_IDS` investor | metrics, roadmap, calculator, contact (+ SoR aliases) | Trimmed — no workspace_hub/public_room in green set |
| `INVESTOR_*_SHIP_STATUS` | implicit `live` on quartet | explicit `live` |
| Workspace card value copy | generic | honest read-only / illustrative / founder-contact wording |
| M9 prod smoke | NEEDS_REVIEW | **NEEDS_FOUNDER_VISUAL_SMOKE** (static GREEN; founder visual re-run) |

---

## 3. Visibility per workspace (post Wave 2B Slice 4)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged) | 4 |
| **Recruiter** | 5 (unchanged from Wave 2A) | 7 |
| **Company** | 3 (unchanged from Wave 2B Slice 3) | 6 |
| **Investor** | 4 (metrics, roadmap, calculator, contact) | 2 (data_room, placement in WAVE1_HIDDEN) + trust_proof, product_proof, board/admin via D5 flags |

**Hidden count:** Wave 1 audit = 20 card IDs; effective = **19** (unchanged — investor quartet was never hidden).

---

## 4. M9 investor hub checklist

| Item | Route | Signal |
|------|-------|--------|
| Metrics reality | `/investor/metrics` | Read-only dashboard + `GET /api/public-health` client |
| Transparent roadmap | `/investor/roadmap` | Production reality matrices |
| Illustrative calculator | `/investor/calculator` | Scenario model; not investment advice |
| Founder contact | `mailto:contact@twin.care` | Hub card CTA |
| Data room hidden | `/investor/data-room` | Route works; invite-only; not in hub |
| Proof surfaces hidden | `/investor/trust-proof`, `/investor/product-proof` | Founder-led preview only |
| Board hidden | `/board/*` | Internal; collapsed in SoR hub |

- Investor hub entry: `/workspace/investor` — `SystemOfRecordNavigationHub` shows 4 green module cards + hidden board toggle.
- Primary modules: `INVESTOR_PRIMARY_MODULE_IDS` = metrics, roadmap, calculator, contact (+ SoR aliases).
- **No verified external customer proof claims** — unchanged from D5 investor slice.

---

## 5. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE2B_SLICE4_*` exports; investor green ID trim |
| `frontend/src/lib/seven-day-d5-investor.ts` | `INVESTOR_*_SHIP_STATUS`; `INVESTOR_PRIMARY_MODULE_IDS` trim |
| `frontend/src/lib/investor-workspace-modules.ts` | Quartet status from ship constants |
| `frontend/src/lib/i18n.ts` | Honest hub card + workspace hub lead copy (EN/PL) |
| `frontend/src/components/investor/investor-metrics-reality-dashboard.tsx` | ship status marker |
| `frontend/src/app/investor/roadmap/page.tsx` | ship status marker |
| `frontend/src/components/marketing/investor-calculator.tsx` | ship status marker |
| `frontend/src/app/workspace/investor/page.tsx` | workspace green marker |
| `frontend/scripts/all-workspace-modules-green-wave2b-investor-workspace-guard.test.ts` | Static regression guard |

**Unchanged (already GREEN/hidden):** `investor-room.ts`, `investor-data-room-request-access.ts`, `seven-day-d5-investor-guard`.

---

## 6. Acceptance checklist

- [x] Investor hub shows **only** metrics, roadmap, calculator, contact as Live cards
- [x] data_room, placement **not** visible in hub
- [x] trust_proof, product_proof, board/admin **not** visible in default hub
- [x] Calculator copy states illustrative / not investment advice (EN + PL)
- [x] Contact mailto CTA present in workspace modules
- [x] Routes and SoR entries preserved (deep links work)
- [x] No Launch GO, no Gate F YES in docs/guards
- [ ] Founder visual smoke on `/workspace/investor` — **NEEDS_FOUNDER_VISUAL_SMOKE**

**Smoke:** NEEDS_FOUNDER_VISUAL_SMOKE (static/code audit PASS; founder browser re-run pending)

---

## 7. Remaining MAKE_GREEN candidates

| Module | Status after Slice 4 |
|--------|----------------------|
| candidate calendar MS sub-copy | OPEN — Wave 2B remainder from green plan |
| Wave 3 roadmap-outside-workspace links | Planned |
| Wave 4 internal-only + founder decisions (data_room signed URLs, product_proof external claims) | Planned |

---

## 8. Tests

```bash
npm run test:all-workspace-modules-green-wave2b-investor-workspace-guard
npm run test:all-workspace-modules-green-wave2b-company-dashboard-guard
npm run test:all-workspace-modules-green-wave2b-recruiter-pipeline-guard
npm run test:all-workspace-modules-green-wave2b-evidence-guard
npm run test:all-workspace-modules-green-wave2a-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:seven-day-d5-investor-guard
```

---

## 9. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE2B_INVESTOR_WORKSPACE_DATE: 2026-07-09
PR_439_MERGE_SHA: f262162a20ff6d028f390ff066e64b90747175a7
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE2B_SLICE4_MAKE_GREEN_MODULE: metrics
WAVE2B_SLICE4_BACK_IN_HUB: true
WAVE2B_INVESTOR_CORE_ALWAYS_IN_HUB: true
WAVE2B_SLICE4_M9_SMOKE: NEEDS_FOUNDER_VISUAL_SMOKE
WAVE2B_SLICE4_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 3 MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE (trust_center, integrations links)
```
