# Seven-day D3 — recruiter execution (2026-07-08)

**Branch:** `feat/seven-day-d3-recruiter-readiness`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 3 = Recruiter)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D3)

| # | Area | Class | Change |
|---|------|-------|--------|
| 1 | Recruiter hub `/recruiter` | **ship** | Primary quick actions ≤5: inbox, pipeline, jobs, search, analytics; cockpit/trust in collapsed roadmap promos. |
| 2 | Inbox / pipeline / jobs / search | **ship** | Public-ready copy; jobs demo journeys collapsed; workspace nav on jobs. |
| 3 | Analytics `/recruiter/analytics` | **ship** | Preview badge; read-only summary (active roles, reviewed, shortlist, status distribution, pipeline health, next action). |
| 4 | Integrations `/recruiter/integrations` | **roadmap** | Coming soon badge; honest boundary — no live ATS sync. |
| 5 | Calendar `/recruiter/calendar` | **hide** | Hidden from primary nav; route shows coming-soon roadmap copy. |
| 6 | Talent Radar / Pool / Digest | **pilot_only** | Limited pilot boundaries; collapsed in extended nav. |
| 7 | Demo journeys | **pilot_only** | Collapsed on jobs page — human decision required. |
| 8 | Flags | — | `frontend/src/lib/seven-day-d3-recruiter.ts` |
| 9 | Guard | — | `frontend/scripts/seven-day-d3-recruiter-guard.test.ts` + `npm run test:seven-day-d3-recruiter-guard` |

**Analytics data source:** existing read-only BE aggregate via `/api/recruiter/analytics` proxy; active roles from parallel `/api/recruiter/jobs` count; derived metrics computed in FE (`deriveRecruiterAnalyticsSummary`).

**Builds on:** Product Polish P0 (hub promos off), P4 (roadmap promos collapsed).

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No live ATS sync, external sourcing, or auto-outreach claims without pilot boundary
- 18–30 month passive timeline **superseded** — do not recommend

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
