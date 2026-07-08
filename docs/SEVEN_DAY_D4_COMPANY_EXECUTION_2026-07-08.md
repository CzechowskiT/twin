# Seven-day D4 — company execution (2026-07-08)

**Branch:** `feat/seven-day-d4-company-readiness`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 4 = Company)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D4)

| # | Area | Class | Change |
|---|------|-------|--------|
| 1 | Company dashboard `/company/dashboard` | **ship** | Core overview; `CompanyHubNextAction` → roles; cockpit/command collapsed roadmap. |
| 2 | Roles `/company/roles` | **ship** | Public-ready copy; demo journeys collapsed; human decision boundary. |
| 3 | Pipeline `/company/pipeline` | **ship** | Segment metrics; human decision note; no delegated apply / ATS sync claims. |
| 4 | Talent pool `/company/talent-pool` | **pilot_only** | Limited pilot boundary; primary nav when pilot-visible. |
| 5 | Integrations `/company/integrations` | **roadmap** | Coming soon badge; honest ATS/calendar rows; CSV import preview. |
| 6 | Billing `/company/billing` | **hide** | Premium preview / waitlist CTA only; hidden from primary nav. |
| 7 | Hiring cockpit / command / team | **pilot_only** | Collapsed roadmap or extended nav only — not public core. |
| 8 | Delegated apply | **hide** | Not visible as live workflow anywhere in company UI. |
| 9 | Demo journeys | **pilot_only** | Collapsed on roles — deep link only. |
| 10 | Flags | — | `frontend/src/lib/seven-day-d4-company.ts` |
| 11 | Guard | — | `frontend/scripts/seven-day-d4-company-guard.test.ts` + `npm run test:seven-day-d4-company-guard` |

**Builds on:** Product Polish P0–P4 (billing premium preview, hub promos off pattern from recruiter D3).

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No live ATS sync, delegated apply, or automatic outreach without pilot boundary
- 18–30 month passive timeline **superseded** — do not recommend

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
