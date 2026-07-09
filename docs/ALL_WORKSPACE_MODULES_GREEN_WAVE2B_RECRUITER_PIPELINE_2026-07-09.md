# All workspace modules GREEN — Wave 2B Slice 2 (recruiter pipeline)

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave2b-recruiter-pipeline`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)  
**Wave 2A:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2A_2026-07-09.md)  
**Wave 2B Slice 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md)  
**D3 recruiter:** [SEVEN_DAY_D3_RECRUITER_EXECUTION_2026-07-08.md](./SEVEN_DAY_D3_RECRUITER_EXECUTION_2026-07-08.md)

**Scope:** Frontend/UI visibility + docs + guard only. Uses existing `GET /api/recruiter/pipeline` proxy and recruiter token + company slug session — no backend/API/auth/DB/env changes.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO new backend

---

## 1. Wave 2B Slice 2 goal

Confirm **recruiter pipeline** (`pipeline`, `recruiter_pipeline`) as **GREEN_WORKING** in workspace hub — Live badge only, honest human-decision UX, M7 smoke-close via static/code audit.

**Selected module:** `pipeline` (`/recruiter/pipeline`)

**Why GREEN_WORKING (audit):**

| Criterion | Pipeline |
|-----------|----------|
| Auth flow | Recruiter token + company slug via `RecruiterAccessFields` (same as inbox/analytics) |
| Core action | Read-only stage board; filter by status; open row in inbox for explicit accept/decline |
| Badge | `RECRUITER_PIPELINE_SHIP_STATUS = live` — no Pilot/Preview |
| Copy | Human decision per stage; no auto outreach, no live ATS sync |
| M7 smoke | **NEEDS_FOUNDER_AUTH_SMOKE** — no recruiter JWT/token in [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md); prod browser smoke not faked GREEN |
| ATS / outreach | **OFF** — `boundaryTags: human_decision_required, no_ats_sync` on SoR route |

**Why not hidden:** Pipeline was **already visible** in Wave 1 recruiter hub (inbox, pipeline, jobs, search — 4 cards; analytics added in 2A = 5). Wave 2B closes M7 NEEDS_REVIEW classification from the green plan — formal MAKE_GREEN, not a hub restore.

---

## 2. Module change summary

| Field | Wave 1 | Wave 2B Slice 2 |
|-------|--------|-----------------|
| Hub visibility | Visible (Live) | Unchanged — confirmed GREEN |
| `GREEN_WORKSPACE_ALLOWED_IDS` recruiter | includes `pipeline`, `recruiter_pipeline` | Unchanged |
| `RECRUITER_PIPELINE_SHIP_STATUS` | implicit `live` | explicit `live` |
| SoR `recruiter_pipeline` status | `live` | `live` |
| Workspace card value copy | generic segment counts | honest human-decision wording |
| M7 prod smoke | NEEDS_REVIEW | **NEEDS_FOUNDER_AUTH_SMOKE** (static GREEN; founder re-run with recruiter token) |

---

## 3. Visibility per workspace (post Wave 2B Slice 2)

| Persona | Visible (Live) | Hidden (effective) |
|---------|----------------|-------------------|
| **Candidate** | 9 hub cards + CV SoR (unchanged from Slice 1) | 4 |
| **Recruiter** | 5 (unchanged from Wave 2A) | 7 |
| **Company** | 3 (unchanged) | 6 |
| **Investor** | 4 (unchanged) | 2 |

**Hidden count:** Wave 1 audit = 20 card IDs; Wave 2A effective = **19**; Wave 2B Slice 1–2 effective = **19** (pipeline was never hidden).

---

## 4. M7 recruiter hub checklist

| Item | Route | Signal |
|------|-------|--------|
| Pipeline stage board | `/recruiter/pipeline` | `GET /api/recruiter/pipeline` after token + slug load |
| Human decision | inbox deep link per row | `openInInbox` → `/recruiter/inbox?review={id}` |
| No ATS sync | SoR boundary tags | `no_ats_sync` |
| No auto outreach | page copy + filters | explicit recruiter action per `nextAction*` keys |

- Recruiter hub: `/recruiter` — 5 primary links include pipeline.
- Primary nav: `RECRUITER_PRIMARY_NAV_HREFS` includes `/recruiter/pipeline`.
- **Delegated / automated outreach stays OFF** — unchanged from D3 recruiter slice.

---

## 5. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE2B_SLICE2_*` exports; pipeline GREEN audit constants |
| `frontend/src/lib/seven-day-d3-recruiter.ts` | `RECRUITER_PIPELINE_SHIP_STATUS` |
| `frontend/src/lib/recruiter-workspace-modules.ts` | pipeline status from ship constant |
| `frontend/src/lib/i18n.ts` | Honest hub card + boundary copy |
| `frontend/src/app/recruiter/pipeline/recruiter-pipeline-client.tsx` | ship status marker + boundary note |
| `frontend/scripts/all-workspace-modules-green-wave2b-recruiter-pipeline-guard.test.ts` | Static regression guard |

**Unchanged (already GREEN):** `recruiter-pipeline.ts`, `recruiter-inbox.ts`, SoR route `recruiter_pipeline`, `seven-day-d3-recruiter-guard`.

---

## 6. Tests

```bash
npm run test:all-workspace-modules-green-wave2b-recruiter-pipeline-guard
npm run test:all-workspace-modules-green-wave2b-evidence-guard
npm run test:all-workspace-modules-green-wave2a-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:seven-day-d3-recruiter-guard
npm run test:recruiter-pipeline-mvp
```

---

## 7. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE2B_SLICE2_MAKE_GREEN_MODULE: pipeline
WAVE2B_SLICE2_BACK_IN_HUB: true
WAVE2B_PIPELINE_ALWAYS_IN_HUB: true
WAVE2B_SLICE2_M7_SMOKE: NEEDS_FOUNDER_AUTH_SMOKE
WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 2B Slice 3 MAKE_GREEN (company dashboard M8)
```
