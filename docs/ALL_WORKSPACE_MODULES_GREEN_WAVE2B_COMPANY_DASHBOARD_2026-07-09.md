# All workspace modules GREEN — Wave 2B Slice 3 (company dashboard)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave2b-company-dashboard`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 2A:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md)  
**Wave 2B Slice 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md)  
**Wave 2B Slice 2:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_2026-07-09.md)  
**D4 company:** [SEVEN_DAY_D4_COMPANY_EXECUTION_2026-07-08.md](./SEVEN_DAY_D4_COMPANY_EXECUTION_2026-07-08.md)

**Scope:** Frontend/UI visibility + docs + guard only. Uses existing `GET /api/company/dashboard`, `GET /api/company/roles`, `GET /api/company/pipeline` proxies and recruiter token + company slug session — no backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO new backend

---

## 1. Wave 2B Slice 3 goal

Confirm **company core trio** (`company_dashboard`, `roles`/`company_roles`, `pipeline`/`company_pipeline`) as **GREEN_WORKING** in workspace hub — Live badge only, honest human-decision UX, M8 smoke-close via static/code audit.

**Selected module:** `company_dashboard` (`/company/dashboard`) — formalizes all three green company hub cards.

**Why GREEN_WORKING (audit):**

| Criterion | Dashboard | Roles | Pipeline |
|-----------|-----------|-------|----------|
| Auth flow | Recruiter token + company slug via `RecruiterAccessFields` | Same | Same |
| Core action | Executive snapshot metrics | Create/list internal roles | Segment counts per role |
| Badge | `COMPANY_DASHBOARD_SHIP_STATUS = live` | `COMPANY_ROLES_SHIP_STATUS = live` | `COMPANY_PIPELINE_SHIP_STATUS = live` |
| Copy | Human decision; no delegated apply live; no live ATS | Same boundaries on page | `humanDecisionNote` + boundary |
| M8 smoke | **NEEDS_FOUNDER_AUTH_SMOKE** — no company recruiter token in [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md); prod browser smoke not faked GREEN |
| ATS / outreach | **OFF** — `boundaryTags: human_decision_required, no_ats_sync` on SoR routes |

**Why not hidden:** Company hub showed **3 Live cards** in Wave 1 (dashboard via SoR, roles, pipeline). Wave 2B closes M8 NEEDS_REVIEW classification from the green plan — formal MAKE_GREEN, not a hub restore.

**Hidden (effective):** billing, integrations, hiring cockpit/command center, team, talent pool — unchanged from Wave 1.

---

## 2. Module change summary

| Field | Wave 1 | Wave 2B Slice 3 |
|-------|--------|-----------------|
| Hub visibility | 3 Live cards | Unchanged — confirmed GREEN |
| `GREEN_WORKSPACE_ALLOWED_IDS` company | dashboard, roles, pipeline SoR IDs | Unchanged |
| `COMPANY_*_SHIP_STATUS` | implicit `live` | explicit `live` |
| SoR `company_dashboard` / `company_roles` | `live` | `live` + boundary tags |
| Workspace card value copy | generic segment counts | honest human-decision wording |
| M8 prod smoke | NEEDS_REVIEW | **NEEDS_FOUNDER_AUTH_SMOKE** (static GREEN; founder re-run with recruiter token) |

---

## 3. Visibility per workspace (post Wave 2B Slice 3)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged) | 4 |
| **Recruiter** | 5 (unchanged from Wave 2A) | 7 |
| **Company** | 3 (dashboard, roles, pipeline) | 6 |
| **Investor** | 4 (unchanged) | 2 |

**Hidden count:** Wave 1 audit = 20 card IDs; effective = **19** (unchanged — company core was never hidden).

---

## 4. M8 company hub checklist

| Item | Route | Signal |
|------|-------|--------|
| Hiring dashboard | `/company/dashboard` | `GET /api/company/dashboard` after token + slug load |
| Roles list | `/company/roles` | `GET /api/company/roles` |
| Pipeline quality | `/company/pipeline` | `GET /api/company/pipeline` |
| Human decision | page copy + SoR tags | `human_decision_required` |
| No ATS sync | SoR boundary tags | `no_ats_sync` |
| No auto outreach | hub + page copy | explicit per module value keys |

- Company hub entry: `/company/dashboard` — `SystemOfRecordNavigationHub` shows 3 green SoR cards.
- Primary nav: `COMPANY_PRIMARY_NAV_HREFS` = dashboard, roles, pipeline.
- **Delegated apply / automated outreach stays OFF** — unchanged from D4 company slice.

---

## 5. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE2B_SLICE3_*` exports; company core GREEN audit constants |
| `frontend/src/lib/seven-day-d4-company.ts` | `COMPANY_DASHBOARD/ROLES/PIPELINE_SHIP_STATUS` |
| `frontend/src/lib/company-workspace-modules.ts` | roles/pipeline status from ship constants |
| `frontend/src/lib/system-of-record-routes.ts` | company dashboard/roles boundary tags |
| `frontend/src/lib/i18n.ts` | Honest hub card + boundary copy |
| `frontend/src/app/company/dashboard/company-dashboard-client.tsx` | ship status marker + boundary note |
| `frontend/src/app/company/roles/page.tsx` | ship status marker + boundary note |
| `frontend/src/app/company/pipeline/company-pipeline-client.tsx` | ship status marker |
| `frontend/scripts/all-workspace-modules-green-wave2b-company-dashboard-guard.test.ts` | Static regression guard |

**Unchanged (already GREEN):** `company-hiring-dashboard.ts`, `company-pipeline-quality.ts`, `seven-day-d4-company-guard`.

---

## 6. Tests

```bash
npm run test:all-workspace-modules-green-wave2b-company-dashboard-guard
npm run test:all-workspace-modules-green-wave2b-recruiter-pipeline-guard
npm run test:all-workspace-modules-green-wave2b-evidence-guard
npm run test:all-workspace-modules-green-wave2a-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:seven-day-d4-company-guard
npm run test:company-hiring-dashboard-mvp
```

---

## 7. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE2B_COMPANY_DASHBOARD_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE2B_SLICE3_MAKE_GREEN_MODULE: company_dashboard
WAVE2B_SLICE3_BACK_IN_HUB: true
WAVE2B_COMPANY_CORE_ALWAYS_IN_HUB: true
WAVE2B_SLICE3_M8_SMOKE: NEEDS_FOUNDER_AUTH_SMOKE
WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 2B Slice 4 MAKE_GREEN (investor workspace — TBD from green plan)
```
