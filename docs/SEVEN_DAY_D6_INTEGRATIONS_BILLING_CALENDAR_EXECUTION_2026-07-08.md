# Seven-day D6 — integrations / billing / calendar execution (2026-07-08)

**Branch:** `feat/seven-day-d6-integrations-billing-calendar`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 6 = Integrations / billing / calendar)  
**Scope:** frontend/UI + docs only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Delivered (D6)

| # | Area | Class | Change |
|---|------|-------|--------|
| 1 | Candidate calendar | **ship** | Google=Live, Microsoft=Coming Soon, ICS/WebCal=Preview; D6 boundary banner. |
| 2 | Recruiter calendar | **roadmap** | Coming soon badge + boundary; hidden from primary nav (D3). |
| 3 | Company scheduling | **roadmap** | Employer calendar coming soon boundary on integrations. |
| 4 | Candidate billing | **hide/preview** | Premium preview; Stripe public checkout disabled; waitlist/contact CTA. |
| 5 | Company billing | **hide/preview** | Premium preview surface; no checkout impression. |
| 6 | Recruiter integrations | **roadmap** | ATS coming soon; CSV/import preview; no fake connected sync. |
| 7 | Company integrations | **roadmap** | Same honest rows; scheduling boundary. |
| 8 | Auto-apply | **hide/paused** | Strip hidden (P0); settings page paused badge + boundary. |
| 9 | Copy normalization | — | User-facing `not_live` integration rows → Coming Soon badge. |
| 10 | Flags | — | `frontend/src/lib/seven-day-d6-integrations.ts` |
| 11 | Guard | — | `frontend/scripts/seven-day-d6-integrations-guard.test.ts` |

**Builds on:** Product Polish P2 (calendar/billing tiers), D2–D5 persona slices.

---

## Status matrices (summary)

### Calendar

| Surface | Persona | Tier | Primary nav | Notes |
|---------|---------|------|-------------|-------|
| Google OAuth | Candidate | **Live** | Yes (dashboard) | Busy read + holds |
| Microsoft 365 | Candidate | **Coming Soon** | — | `FORCE_MICROSOFT_CALENDAR_COMING_SOON` |
| ICS / WebCal | Candidate | **Preview** | — | Export/subscribe, not sync |
| Recruiter calendar | Recruiter | **Coming Soon** | Hidden | Roadmap page only |
| Employer calendar | Company | **Coming Soon** | — | Integrations row + boundary |

### Billing

| Surface | Persona | Tier | Primary nav | Checkout |
|---------|---------|------|-------------|----------|
| `/dashboard/billing` | Candidate | **Preview** | Hidden (D2) | Waitlist/contact only |
| `/company/billing` | Company | **Preview** | Hidden (D4) | Waitlist/contact only |
| Stripe | — | **Not public** | — | `STRIPE_NOT_PUBLIC_LAUNCH` |

### Integrations / ATS

| Row | Recruiter | Company | User badge |
|-----|-----------|---------|------------|
| Acceptance inbox | Live | Live | Live |
| Talent pool CSV import | Pilot (Preview) | Pilot (Preview) | Limited pilot |
| ATS OAuth / webhooks | Planned | Planned | Coming soon |
| Calendar sync | Coming soon | Coming soon | Coming soon (normalized) |
| Teams / Meet | Planned | — | Coming soon |

### Hidden / paused

| Module | State | Where |
|--------|-------|-------|
| Nightly auto-apply strip | **Paused / hidden** | Dashboard (P0 off) |
| Auto-apply settings | **Paused** | Deep link + paused badge |
| Stripe public checkout | **Disabled** | Billing surfaces |
| Recruiter calendar nav | **Hidden** | Primary nav (D3) |
| Candidate billing nav | **Hidden** | Hub (D2) |
| Company billing nav | **Hidden** | Nav (D4) |

---

## Founder decisions required

| # | Decision | Options | Blocks |
|---|----------|---------|--------|
| 1 | **Stripe public checkout** | Keep preview-only (shipped) / enable when Gate F | Billing ship |
| 2 | **Microsoft calendar live** | Keep coming soon (shipped) / ship OAuth when ready | D6 calendar |
| 3 | **ATS live sync** | Roadmap only (shipped) / OAuth writeback ship | Integrations ship |
| 4 | **Auto-apply resume** | Stay paused (shipped) / cohort unlock | Candidate automation |
| 5 | **Gate F** | Separate step — ≠ Launch GO | After D7 |

**FOUNDER_DECISION_FORMAT:** `YES|NO|EDIT` per row

---

## Hard bans (unchanged)

- NOT Launch GO · NOT Gate F YES
- No fake checkout, no fake connected/live sync, no Microsoft calendar live claims
- No auto-apply or marketplace liquidity claims on production UI

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
