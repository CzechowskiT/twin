# All workspace modules GREEN — Wave 1 implementation

> **Superseded by founder decision 2026-07-10** — see `FOUNDER_ALL_MODULES_VISIBLE_AND_GREEN_DECISION_2026-07-10.md`.

**Date:** 2026-07-09  
**Branch:** `feat/hide-non-green-workspace-modules-wave1`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)

**Scope:** Frontend/UI visibility ONLY — no backend/API/auth/DB/env changes. Routes and SoR entries preserved; hubs/nav hide non-green modules.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO route/SoR deletion

---

## 1. Wave 1 goal

Zero Pilot/Preview/Coming soon/Paused badges on **visible** workspace hub cards. Only GREEN_WORKING (Live) modules appear in primary hub grids and primary nav.

`WORKSPACE_GREEN_ONLY_MODE = true` — roadmap tier in workspace hubs is **empty**.

---

## 2. Modules hidden from workspace hubs (20 card IDs)

| Persona | Hidden card IDs |
|---------|-----------------|
| **Candidate** | referrals, trust_center, plan_payments, auto_apply |
| **Recruiter** | trust_review_queue, daily_cockpit, talent_pool, talent_radar, talent_radar_digest, analytics, integrations, calendar |
| **Company** | hiring_cockpit, hiring_command_center, team, talent_pool, integrations, billing |
| **Investor** | data_room, placement |

**Plan inventory reference:** 22 workspace-visible non-green modules before Wave 1; 20 card-level IDs in `WAVE1_HIDDEN_WORKSPACE_CARD_IDS` (board/admin and demo journeys already internal-only).

---

## 3. Modules visible in workspace hubs (green-only)

| Persona | Visible |
|---------|---------|
| **Candidate** | profile, jobs, matches, applications, calendar, identity, career_compass, interview_prep, evidence, CV (10 SoR cards) |
| **Recruiter** | inbox, pipeline, jobs, search (4) |
| **Company** | dashboard, roles, pipeline (3) |
| **Investor** | metrics, roadmap, calculator, contact (4) |

---

## 4. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WORKSPACE_GREEN_ONLY_MODE`, `GREEN_WORKSPACE_ALLOWED_IDS`, `isWorkspaceGreenVisible` |
| `frontend/src/lib/product-surface-visibility.ts` | Green-only `shouldHideFromDefaultHub`, empty roadmap tier |
| `frontend/src/lib/seven-day-d2-candidate.ts` | Hide referrals/trust_center flags |
| `frontend/src/lib/seven-day-d3-recruiter.ts` | Primary nav 4, hide analytics/integrations, roadmap promos off |
| `frontend/src/lib/seven-day-d4-company.ts` | Primary nav 3, hide integrations, roadmap promos off |
| `frontend/src/lib/seven-day-d5-investor.ts` | Empty roadmap IDs, hide data_room/placement |
| `frontend/src/app/recruiter/page.tsx` | Quick actions without analytics |
| `frontend/src/components/investor/investor-room-page.tsx` | Filter preview modules via `splitWorkspaceModules` |
| `frontend/scripts/all-workspace-modules-green-wave1-guard.test.ts` | Static regression guard |

---

## 5. Acceptance

Founder opens `/dashboard`, `/recruiter`, `/company/dashboard`, `/workspace/investor` — **only Live** cards in visible hub grids; no collapsed roadmap tier with pilot/preview badges.

Deep links (e.g. `/dashboard/referrals`, `/recruiter/analytics`, `/investor/data-room`) still work with honest page copy.

---

## 6. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE1_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WORKSPACE_GREEN_ONLY_MODE: true
WAVE1_HIDDEN_WORKSPACE_CARD_COUNT: 20
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_4, company_3, investor_4
NEXT_SLICE: Wave 2 MAKE_GREEN (evidence, recruiter pipeline, company dashboard, analytics)
```
