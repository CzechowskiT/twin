# Seven-day D5 — investor execution (2026-07-08)

**Branch:** `feat/seven-day-d5-investor-readiness`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 5 = Investor)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D5)

| # | Area | Class | Change |
|---|------|-------|--------|
| 1 | Public room `/investor` | **ship** | Investor preview copy; one primary CTA + data room secondary; executive detail collapsed. |
| 2 | Workspace hub `/workspace/investor` | **ship** | `InvestorHubNextAction` → metrics; SoR hub with roadmap/hidden split. |
| 3 | Data room `/investor/data-room` | **founder_decision** | Invite-only preview badge; request access / contact founder; no fake live secure vault. |
| 4 | Placement `/investor/placement` | **pilot_only** | Limited pilot boundary; DD cohort demo timeline. |
| 5 | Trust proof `/investor/trust-proof` | **roadmap** | Founder-led preview boundary; no verified external customer claims. |
| 6 | Product proof `/investor/product-proof` | **roadmap** | Controlled preview boundary; maturity matrix illustrative. |
| 7 | Investor login `/login/investor` | **roadmap** | Builds on P3 invite-only — no `needs_setup`. |
| 8 | Board `/board/*` | **hide** | Hidden from default investor hub — collapsed internal toggle; routes preserved. |
| 9 | Metrics / calculator / roadmap | **ship** | Controlled illustrative preview copy — not investment advice. |
| 10 | Flags | — | `frontend/src/lib/seven-day-d5-investor.ts` |
| 11 | Guard | — | `frontend/scripts/seven-day-d5-investor-guard.test.ts` + `npm run test:seven-day-d5-investor-guard` |

**Builds on:** Product Polish P2 (simplified investor room), P3 (investor login invite-only).

---

## Founder decisions required

| # | Decision | Options | Blocks |
|---|----------|---------|--------|
| 1 | **Data room** | Placeholder invite-only (shipped) / signed URLs ship / hide | Full data room ship |
| 2 | **Gate F** | Separate step — ≠ Launch GO | After D7 |

**FOUNDER_DECISION_FORMAT:** `YES|NO|EDIT` per row

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No fake live secure data room, no verified external customer claims, no public launch promise
- 18–30 month passive timeline **superseded** — do not recommend

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
