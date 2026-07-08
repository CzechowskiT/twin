# Seven-day D2 — candidate execution (2026-07-08)

**Branch:** `feat/seven-day-d2-candidate-readiness`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 2 = Candidate)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D2)

| # | Area | Class | Change |
|---|------|-------|--------|
| 1 | Career compass `/dashboard/career` | **ship** | Live badge; static framework (skills gap, target role, next steps, learning priorities); profile-backed path when configured — no pilot clutter. |
| 2 | Interview prep `/dashboard/interview-prep` | **ship** | Static prompt pack + checklist + prep plan always visible; optional application pack — no live AI coaching promise. |
| 3 | Evidence `/dashboard/evidence` | **ship** | Portfolio readiness, recruiter summary, missing-evidence checklist; manual add only — no auto-upload claims. |
| 4 | Trust hub `/profile/trust` | **roadmap** | Overview primary; advanced lanes in collapsed details; roadmap badge (not 10 cards as main product). |
| 5 | Referrals `/dashboard/referrals` | **pilot_only** | Limited pilot boundary — no automatic outreach, no marketplace liquidity. |
| 6 | Auto-apply | **hide** | `SHOW_DASHBOARD_AUTO_APPLY_STRIP=false`; `auto_apply` + `plan_payments` hidden from hub. |
| 7 | Calendar | **ship / roadmap / preview** | Google live, Microsoft coming soon, ICS/WebCal preview — unified `productPolish.calendar*` copy. |
| 8 | Dashboard home | **ship** | Command center + core quick links; extended modules + module nav collapsed by default. |
| 9 | Flags | — | `frontend/src/lib/seven-day-d2-candidate.ts` |
| 10 | Guard | — | `frontend/scripts/seven-day-d2-candidate-guard.test.ts` + `npm run test:seven-day-d2-candidate-guard` |

**Builds on:** Product Polish P0 (dashboard collapse, auto-apply hide), P1 (trust overview), P2 (calendar tiers).

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No live AI coaching, auto-upload evidence, or marketplace referral claims without pilot boundary
- 18–30 month passive timeline **superseded** — do not recommend

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
