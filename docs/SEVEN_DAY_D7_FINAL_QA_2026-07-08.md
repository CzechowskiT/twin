# Seven-day D7 — final QA readiness (2026-07-08)

**Branch:** `feat/seven-day-d7-final-qa-readiness`  
**Parent plan:** [SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md](./SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md) (Day 7 = QA)  
**Builds on:** merged PR #426 (D6) — merge SHA `ee8c1fe9d89e3224905b61c398fd085e63d5ad26`  
**Scope:** frontend/UI + docs + guard only. No backend/API/auth/DB/env. No Playwright, Gate E, Phase 3B.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Executive summary

Seven-day execution D1–D6 is complete on `cursor/phase1-monorepo-scaffold`. D7 is a **grep-based audit + readiness lock**: all 48 modules carry an honest D7 class per the execution plan; primary hubs respect surface limits (candidate 8, recruiter 5, company 4); billing, auto-apply, and calendar live-sync overclaims remain bounded. **Recommendation: Ready for Gate F review** — founder decisions on launch scope, data room, and Stripe remain open. **NOT Ready for Launch.**

| Audit | Result | Notes |
|-------|--------|-------|
| Pilot clutter | **MINOR** | Primary hubs clean; residual honest labels in deep pilot / investor matrix |
| UX consistency | **PASS** | Unified badge vocabulary on primary EN workspace modules; hub limits locked |
| 48-module classification | **PASS** | Counts match plan guard (`ship=12, hide=14, pilot_only=11, roadmap=8, founder_decision=3`) |
| Banned string grep (primary UI) | **PASS** | No `needs_setup`, `TODO`, `coming later`, or fake-checkout literals in hub chrome |

---

## Public launch surface (Surface A)

Per plan — marketing public + auth + live core hubs:

### Candidate (8 primary)

| # | Module | Route | Tier |
|---|--------|-------|------|
| 1 | Panel / command center | `/dashboard` | Live |
| 2 | Jobs | `/dashboard/jobs` | Live |
| 3 | Matches | `/dashboard/matches` | Live |
| 4 | Applications | `/dashboard/applications` | Live |
| 5 | Profile | `/profile` | Live |
| 6 | CV | `/profile` (CV section) | Live |
| 7 | Calendar (Google) | `/dashboard/calendar` | Live |
| 8 | Identity | `/profile` (identity) | Live |

Roadmap collapsed: career, interview prep, evidence, trust hub, referrals, ICS preview.

### Recruiter (5 primary)

| # | Module | Route | Tier |
|---|--------|-------|------|
| 1 | Inbox | `/recruiter/inbox` | Live |
| 2 | Pipeline | `/recruiter/pipeline` | Live |
| 3 | Jobs | `/recruiter/jobs` | Live |
| 4 | Search | `/recruiter/search` | Live |
| 5 | Analytics | `/recruiter/analytics` | Preview (ship) |

Roadmap collapsed: integrations, talent modules, demo journeys. Calendar hidden from nav.

### Company (4 primary)

| # | Module | Route | Tier |
|---|--------|-------|------|
| 1 | Dashboard | `/company/dashboard` | Live |
| 2 | Roles | `/company/roles` | Live |
| 3 | Pipeline | `/company/pipeline` | Live |
| 4 | Talent pool | `/company/talent-pool` | Limited pilot |

Roadmap collapsed: hiring cockpit, team, integrations, demo journeys. Billing hidden.

### Marketing (public)

`/`, `/for-*`, `/waitlist`, `/faq`, `/privacy`, `/terms`, `/status`, thin routes (`/partners`, `/careers`, `/media`) as honest roadmap pages.

`LAUNCH_SURFACE_A: candidate_8_recruiter_5_company_4_marketing_public`

---

## Controlled pilot surface

Modules reachable via deep link / collapsed roadmap with explicit boundaries (D2–D5):

- Candidate: referrals (`REFERRALS_LIMITED_PILOT`), trust subflows (hidden from hub)
- Recruiter: daily cockpit, trust queue, talent radar, talent pool import, demo journeys
- Company: hiring cockpit, command center, team permissions
- Investor: placement economics, data room (founder_decision), trust/product proof previews

`PilotPreviewBoundary` / `data-seven-day-d6-*` markers on billing, calendar, integrations, auto-apply.

---

## Remaining roadmap (post-D7, not launch blockers for Gate F)

| Area | Class | Next slice |
|------|-------|------------|
| Microsoft 365 calendar OAuth | roadmap | Ship when Graph ready |
| ATS bidirectional sync | roadmap | OAuth writeback |
| Stripe public checkout | hide/preview | After Gate F + founder YES |
| Auto-apply resume | hide/paused | Cohort unlock only |
| Trust subflows (8 routes) | hide | XL compliance |
| Recruiter calendar live sync | roadmap | Post Microsoft ship |
| Investor data room signed URLs | founder_decision | S3 presigned + access control |

---

## Remaining founder decisions

| # | Decision | Options | Blocks |
|---|----------|---------|--------|
| 1 | **7-day plan acceptance** | YES / NO / EDIT | Execution sign-off |
| 2 | **Launch scope post-D7** | Surface A minimum / B aggressive | Gate F package |
| 3 | **Investor data room** | Placeholder (shipped) / signed URLs / hide | D5 data room |
| 4 | **Logo disclaimer** | A subtle (shipped) / B footer / C remove | Marketing legal |
| 5 | **Stripe public checkout** | Preview-only (shipped) / enable at Gate F | Billing ship |
| 6 | **Backend in ship slices** | Allow BE for analytics / FE-only | Recruiter analytics depth |
| 7 | **Gate F** | Separate step — **≠ Launch GO** | After this D7 PR |

**FOUNDER_DECISION_FORMAT:** `YES|NO|EDIT` per row

---

## Known limitations

- Recruiter analytics aggregates may be thin in staging — Preview badge, not full BI.
- Interview prep static mock questions — honest rehearsal pack, not live AI coaching.
- Investor room status matrix uses explicit “Not live” tier labels (intentional diligence copy).
- Trust / correction / portability subflows retain workflow `not_live` states on deep routes only.
- Employer media page notes “mock links” for downloadable packs (thin marketing route).
- i18n overlay locales retain legacy `status_not_live` keys in investor/FAQ blocks — primary EN workspace maps `statusNotLive` → “Coming soon”.
- No Playwright smoke in D7 — manual founder checklist deferred to Gate F.

---

## Pilot clutter audit → **MINOR**

**Evidence (grep `frontend/src`, 2026-07-08):**

| Finding | Location | Severity | Mitigation |
|---------|----------|----------|------------|
| No `needs_setup` user copy in primary hubs | `workspaceModules.statusNeedsSetup` → “Coming soon” (EN) | OK | Shipped D2/D6 |
| `not_live` type literals in TS only on investor room | `investor-room-page.tsx` maps tier → badge | OK | Internal, not raw UI string |
| Integration rows normalized | `integration-row-status-badge.tsx` → Coming Soon | OK | D6 |
| Investor status matrix “Not live” section | `i18n.ts` investorRoom block | MINOR | Honest diligence; collapsed on public room |
| “Mock questions” interview prep | `candidate-interview-prep-client.tsx` | OK | Honest static rehearsal label |
| “mock links” employer media | `employer-media-messages.ts` | MINOR | Thin roadmap page only |
| Auto-apply / billing / calendar promos | Hidden or paused boundaries | OK | D6 |
| Primary hub violet promos | Off (`SHOW_*_HUB_PRIMARY_PROMOS=false`) | OK | D3/D4 |

**Verdict:** No vague pilot clutter in primary nav or hub quick actions. Residual labels are honest and confined to roadmap / deep pilot / investor diligence sections.

---

## UX consistency audit → **PASS**

**Evidence:**

| Check | Result |
|-------|--------|
| Primary badge vocabulary (EN workspace) | Live, Limited Pilot, Preview, Coming soon, Paused |
| `needs_setup` / `not_live` module badges | Mapped to “Coming soon” on primary workspace keys |
| Hub primary limits | `CONTROLLED_PILOT_PRIMARY_LIMITS`: candidate=8, recruiter=5, company=4 |
| Recruiter quick actions | Exactly 5 core links on `/recruiter` |
| Company next action | Single CTA via `CompanyHubNextAction` (D4) |
| Calendar tiers | Google Live / Microsoft Coming soon / ICS Preview (D6) |
| Billing | Premium Preview + waitlist; `STRIPE_NOT_PUBLIC_LAUNCH` |
| Logo marquee | Subtle disclaimer `data-testid="marquee-logo-disclaimer"` (D1/P4) |
| Footer social proof | Illustrative labels when `FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS` |

**Verdict:** Primary surfaces share consistent honesty patterns; no conflicting live/sync claims across personas.

---

## Open risks

1. **Gate F not run** — production smoke, founder manual checklist, and diligence package still pending.
2. **Founder launch scope undecided** — Surface A vs B affects which ship modules get marketing CTA promotion.
3. **Data room** — placeholder preview may underwhelm institutional investors until signed URLs ship.
4. **Analytics BE depth** — recruiter analytics Preview depends on staging data volume.
5. **Locale drift** — non-EN overlays may retain older “Not live” strings in investor blocks (low traffic).

---

## Final recommendation

**Ready for Gate F review** — seven-day plan executed; guards D1–D7 green; stance locked.  
**NOT Ready for Launch** — founder decisions open; Gate F PENDING; Stripe/ATS/calendar live paths remain roadmap.

---

## D7 deliverables

| # | Artifact |
|---|----------|
| 1 | This doc |
| 2 | `frontend/src/lib/seven-day-d7-final-qa.ts` |
| 3 | `frontend/scripts/seven-day-d7-final-qa-guard.test.ts` |
| 4 | `npm run test:seven-day-d7-final-qa-guard` |

---

## Stance footer

**P0 CLOSED** | **Gate E PASS** | **Gate F PENDING** | **Launch NO-GO**

- NOT Launch GO
- NOT Gate F YES
- Gate F YES ≠ Launch GO
- NOT Playwright / Gate E / Phase 3B in this slice

```
D7_QA_READINESS_LOCK: true
READY_FOR_GATE_F_REVIEW: true
NOT_READY_FOR_LAUNCH: true
PILOT_CLUTTER_AUDIT: MINOR
UX_CONSISTENCY_AUDIT: PASS
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
```
