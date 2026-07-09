# All workspace modules GREEN — Wave 2A implementation

**Date:** 2026-07-09  
**Branch:** `feat/workspace-green-wave2a`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Wave 1:** [ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_WAVE1_2026-07-09.md)

**Scope:** Frontend/UI visibility ONLY — one MAKE_GREEN module. No backend/API/auth/DB/env changes. Routes and SoR entries preserved.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO Playwright · NO Wave 2B mass MAKE_GREEN

---

## 1. Wave 2A goal

Restore **one** previously hidden module to GREEN_WORKING visibility in workspace hub, primary nav, and module cards — with Live badge and honest read-only UX.

**Selected module:** `recruiter/analytics` (`analytics`, `recruiter_analytics` SoR IDs)

**Why GREEN_WORKING (not Wave 2B):**

- Shipped in D3 as read-only workspace aggregates via existing `/api/recruiter/analytics` proxy + jobs list for active roles.
- Real user value: pipeline health, status distribution, suggested next action — no revenue/hire-velocity claims.
- No new backend work required; only visibility + badge + copy polish.
- Safest MAKE_GREEN pick vs evidence (M5 NEEDS_REVIEW), recruiter pipeline (M7), company dashboard (M8) — all need smoke/vault credentials.

**Why not candidate evidence:** Already visible in Wave 1 hub (9 Live cards); classified MAKE_GREEN in plan for M5 smoke-close — deferred to Wave 2B.

---

## 2. Module change summary

| Field | Wave 1 | Wave 2A |
|-------|--------|---------|
| `RECRUITER_ANALYTICS_SHIP_STATUS` | `preview` | `live` |
| `HIDE_RECRUITER_ANALYTICS_FROM_HUB` | `true` | `false` |
| `GREEN_WORKSPACE_ALLOWED_IDS` recruiter | 4 modules | + `analytics`, `recruiter_analytics` |
| `RECRUITER_PRIMARY_NAV_HREFS` | 4 | 5 (+ `/recruiter/analytics`) |
| Hub quick actions | 4 | 5 (+ analytics CTA) |
| Page badge | Preview | Live |
| `notLiveNote` copy | "preview metrics only" | honest NOT LIVE for calendar export only |

---

## 3. Visibility per workspace (post Wave 2A)

| Persona | Visible (Live) | Hidden (unchanged from Wave 1 minus analytics) |
|---------|----------------|--------------------------------------------------|
| **Candidate** | 10 cards (unchanged) | referrals, trust_center, plan_payments, auto_apply |
| **Recruiter** | inbox, pipeline, jobs, search, **analytics** (5) | trust_review_queue, daily_cockpit, talent_pool, talent_radar, talent_radar_digest, integrations, calendar |
| **Company** | 3 (unchanged) | hiring_cockpit, hiring_command_center, team, talent_pool, integrations, billing |
| **Investor** | 4 (unchanged) | data_room, placement |

**Hidden count:** Wave 1 = 20 card IDs in audit list; Wave 2A effective hidden = **19** (analytics restored).

---

## 4. Wave 1 invariant preserved

- Non-green modules (pilot/preview/coming_soon) **stay hidden** from hub/nav.
- Roadmap tier in workspace hubs remains **empty**.
- Deep links to hidden routes still work with honest page copy.
- No Pilot/Preview badges on visible primary cards.

---

## 5. Implementation files

| File | Change |
|------|--------|
| `frontend/src/lib/all-workspace-green-gate.ts` | `WAVE2A_*` exports; analytics in `GREEN_WORKSPACE_ALLOWED_IDS`; recruiter limit 5 |
| `frontend/src/lib/seven-day-d3-recruiter.ts` | Analytics `live`; hub visible; primary nav 5 |
| `frontend/src/lib/recruiter-workspace-modules.ts` | Status via `RECRUITER_ANALYTICS_SHIP_STATUS` → live |
| `frontend/src/app/recruiter/page.tsx` | Quick action for analytics |
| `frontend/src/lib/i18n.ts` | Remove preview copy from `notLiveNote` |
| `frontend/scripts/all-workspace-modules-green-wave2a-guard.test.ts` | Static regression guard |

---

## 6. Tests

```bash
npm run test:all-workspace-modules-green-wave2a-guard
npm run test:all-workspace-modules-green-wave1-guard
npm run test:seven-day-d3-recruiter-guard
```

---

## 7. Launch stance footer

```
ALL_WORKSPACE_MODULES_GREEN_WAVE2A_DATE: 2026-07-09
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
WAVE2A_MAKE_GREEN_MODULE: analytics
WAVE2A_BACK_IN_HUB: true
WAVE1_HIDDEN_WORKSPACE_CARD_COUNT: 20
WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT: 19
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate_10, recruiter_5, company_3, investor_4
NEXT_SLICE: Wave 2B MAKE_GREEN (evidence M5, recruiter pipeline M7, company dashboard M8)
```
