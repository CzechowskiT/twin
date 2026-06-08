# Premium Product Experience Polish Plan — 2026-06-08

**Operator:** TWIN Premium Product Experience Operator  
**Base branch:** `cursor/phase1-monorepo-scaffold`  
**Audit UTC:** `2026-06-08`  
**Mode:** Read-only route/component inspection → sequential safe-lane slices 0→7  
**Launch stance (preserved):** Public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar **NOT LIVE** · external invites **0** · H5c/H5d **HOLD**

---

## 1 — Executive summary

TWIN’s authenticated product surfaces are **functionally shipped** for a controlled pilot: candidate dashboard (matches, applications, calendar strip), recruiter token inbox (accept/decline + review card), and investor/demo marketing. The **premium gap** is not missing APIs — it is **decision clarity**: candidates do not yet see a single “today / next best action” hero; matches are ranked but not **grouped by confidence**; application transparency exists but reads like a legal `<details>` dump; recruiter inbox is operational but not yet a **decision console** with clear segment hierarchy; empty states are minimal one-liners without guided onboarding.

This plan sequences **eight safe-lane slices** (0–7) that polish UX **without** weakening CSP/auth/DB, re-enabling auto-apply, claiming delegated live, or inventing analytics. Each slice: branch → implement → test → commit → push → PR → auto-merge (if eligible) → deploy wait → smoke → docs → next.

**North star check (every slice):** Does this reduce noise toward **acceptance-ready calendar items**, or add noise?

---

## 2 — Launch stance & hard bans (non-negotiable)

| Gate | Status | Slice impact |
| ---- | ------ | ------------ |
| Public launch | **NO-GO** | No “we’re live” copy, no public GO matrix edits |
| Auto-apply | **PAUSED** | NBA CTA must not imply live autonomous submit |
| Delegated apply | **NOT LIVE** | Transparency + trust copy must say prepare-only |
| Recruiter calendar sync | **NOT LIVE** | Placeholder copy only on `/recruiter/calendar` |
| External recruiter invites | **0** | No invite flows, no fake traction |
| H5c / H5d | **HOLD** | Docs may reference packs; no GO SMALL without founder |
| CSP / auth / env / DB | **No weakening** | Frontend-only or copy-only slices preferred |
| Childish gamification | **Banned** | Do not expand XP/streak/badge prominence in premium slices |
| Invented analytics | **Banned** | Deterministic fallbacks from real API fields only |

Evidence anchors: `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`, `docs/PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md`, `docs/CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md`.

---

## 3 — Current product reality baseline

### Candidate (LIVE surfaces)

| Surface | Route | Key components | Data source |
| ------- | ----- | -------------- | ----------- |
| Dashboard hub | `/dashboard` | `dashboard/page.tsx`, `DashboardCommandCenter`, `MatchesSection`, `ApplicationsSection` | `/api/v1/candidates/me/*` |
| Profile | `/profile` | Profile forms, completeness hint | Candidate profile API |
| Calendar | `/dashboard/calendar` | Week view, OAuth connect | Google/Microsoft + ICS |
| Career brief | `/dashboard/career` | Career assistant panels | Career API |
| Acceptance | `/dashboard/acceptance` | Placement/acceptance UI | Placement events |
| Auto-apply settings | `/dashboard/settings/auto-apply` | Pause copy, gates | Readiness gate |
| Workspace subnav | `/workspace/candidate` | Persona hub | Static |

### Recruiter (pilot-thin, LIVE inbox)

| Surface | Route | Key components | Notes |
| ------- | ----- | -------------- | ----- |
| Inbox | `/recruiter/inbox` | `recruiter-inbox-client.tsx` | Token + company slug; batch accept/decline |
| Jobs POST | `/recruiter/jobs` | Job posting form | API-backed |
| Calendar | `/recruiter/calendar` | Placeholder | **NOT LIVE** sync |
| ATS integrations | `/recruiter/integrations/ats` | Webhook docs | Scaffolding |
| Workspace hub | `/workspace/recruiter` | Persona switcher | Marketing bridge |

### Investor / marketing (demo GO)

| Surface | Route | Notes |
| ------- | ----- | ----- |
| Homepage | `/` | Persona nav, trust cues |
| Interactive demo | `/demo` | 8-step walkthrough |
| For candidates / recruiters / companies | `/for-*` | Persona bundles via `persona-pages.ts` |
| Investor metrics | `/investor/metrics` | Internal/demo |
| Compare pages | `/compare/*` | Claims aligned to PAUSED/NOT LIVE |

---

## 4 — Route & component inventory — candidate workspace

### Primary dashboard composition (`/dashboard`)

```
Shell (wide + momentum rail)
├── CandidateWorkspaceSubnav (export JSON)
├── WorkspaceFlowSteps (dashboard step)
├── ProfileCompletenessHint
├── DashboardVerifiedReadinessCard (verified gate)
├── EmailVerificationBanner
├── NightlyAutoApplyStrip (PAUSED messaging)
├── dashboard-hero-grid
│   ├── DashboardCommandCenter (welcome + primary CTA + quick actions)
│   └── ProgressDashboard (XP/level/streak — gamification API)
├── OpportunityForecast
├── DashboardCalendarStrip
├── CareerCompassStrip
├── MatchesSection (#dashboard-matches)
├── DevelopmentFocusSection
├── ApplicationsSection (#dashboard-applications)
└── JobsSection (#dashboard-jobs)
```

### Gaps vs premium target

| Area | Current | Premium target (Slice 1–3) |
| ---- | ------- | -------------------------- |
| Hero | Welcome + generic CTA to matches or profile | **Today / Next Best Action** with mission cards + conversation readiness |
| Command center | Demo CTA prominent for all users with email | Mission-oriented cards; primary CTA from deterministic state |
| Matches | Top 20 + “more recommendations” by score cutoff | **Strong fit / Worth reviewing / Low confidence** groups + uncertainty chips |
| Applications transparency | Collapsible `<details>` bullet lists | Two-column **shared / not shared** privacy control panel |
| ProgressDashboard | XP/streak card in hero grid | **De-emphasize** in premium lane (do not expand gamification) |

### Relevant libs & hooks

- `frontend/src/lib/matching-quality.ts` — score labels (`excellent`/`good`/`possible`/`weak`)
- `frontend/src/hooks/dashboard/use-dashboard-match-feedback.ts` — visibility derivations
- `frontend/src/lib/job-apply-actions-guard.ts` — prepare-only gating
- `frontend/src/components/dashboard/candidate-application-transparency-panel.tsx` — static PII panel

---

## 5 — Route & component inventory — recruiter workspace

### Inbox composition (`/recruiter/inbox`)

```
RecruiterInboxClient
├── RecruiterAccessFields (token + company)
├── Status filter (all / applied / interview)
├── Search query
├── Batch select + batch decline
├── Row cards
│   ├── match_score + match_reasons (≤3)
│   ├── decision badge (recruiter-inbox-decision.ts)
│   ├── data visibility summary
│   ├── consent receipt flag
│   └── expandable review_card (REVIEW_CARD_SECTIONS)
└── Accept / Decline (+ decline note modal)
```

### Gaps vs premium target (Slice 4)

| Area | Current | Premium target |
| ---- | ------- | -------------- |
| Page header | ~~Functional title + filters~~ | **Decision console** header with dynamic awaiting-decision count + AI-assisted subcopy ✅ |
| Segments | ~~Status filter tabs~~ | Visual segments: **Strong fit / Good fit / Needs verification / Decided** ✅ |
| Card hierarchy | ~~Dense row layout~~ | Name → score/label/status → evidence/missing/confidence chips → review card → actions ✅ |
| Review card | Expandable sections | Polished due-diligence grid + confidence chip ✅ |
| Behavior | Accept/decline API | **Preserve verbatim** — UI-only polish ✅ |

### Test anchors (must keep passing)

- `npm run test:recruiter-inbox-decision`
- `npm run test:recruiter-review-card`
- `npm run test:pii-data-visibility`

---

## 6 — Route & component inventory — investor & marketing

Premium polish slices **do not** rewrite marketing pages in depth; they must stay aligned with launch stance.

| Check | File / route | Slice 5 touch |
| ----- | ------------ | ------------- |
| Auto-apply claims | `i18n.ts`, `persona-pages.ts` | Grep forbidden terms |
| Delegated live | compare pages, billing | Unify “prepare-only / NOT LIVE” |
| Recruiter SKU overpromise | `/for-recruiters` | Watchlists/HM packets — narrative only |
| Demo walkthrough | `/demo` | No change in slices 1–6 |
| Trust vocabulary | `landing-trust-cue.tsx`, dashboard north-star copy | Slice 5 unification |

Investor improvements from this program are **indirect**: cleaner candidate/recruiter authenticated demos increase investor confidence without new metrics claims.

---

## 7 — Slice 1 spec: Candidate Today / Next Best Action

**Branch:** `feat/candidate-today-next-best-action-2026-06-08`  
**Commit:** `feat(candidate): add today next-best-action experience`

### Deliverables

1. **Dashboard hero upgrade** — replace/extend `DashboardCommandCenter` with:
   - Eyebrow: “Today” / “Dziś”
   - **Mission cards** (2–3 max): e.g. complete profile, review top match, connect calendar — derived from **real state** (`hasProfile`, `visibleMatches.length`, `dashboardCalendarBundle`, `verifiedReadiness.gate`)
   - **Conversation readiness** chip: email verified? profile complete? matches available?
   - **Primary CTA** — single deterministic action (no A/B, no invented urgency)

2. **Deterministic priority logic** (safe fallbacks)

| Priority | Condition | CTA |
| -------- | --------- | --- |
| 1 | No profile | `/profile` — setup profile |
| 2 | Profile + 0 visible matches | `/profile` or wait copy — refresh criteria |
| 3 | Matches + no calendar connected | `#dashboard-calendar` or calendar settings |
| 4 | Matches available | `#dashboard-matches` — review strong fits |
| 5 | Active applications | `#dashboard-applications` — track pipeline |

3. **No invented analytics** — use only: `matches.total`, `visibleMatches.length`, `applications.length`, `pipelineActiveCount`, readiness gate fields.

### Files (expected)

- `frontend/src/components/dashboard/dashboard-today-hero.tsx` (new)
- `frontend/src/components/dashboard-command-center.tsx` (integrate or delegate)
- `frontend/src/lib/dashboard-next-best-action.ts` (new — pure functions)
- `frontend/src/lib/i18n.ts` — PL/EN keys
- `frontend/scripts/dashboard-next-best-action.test.ts` (new)
- Update `docs/PREMIUM_PRODUCT_EXPERIENCE_POLISH_PLAN_2026-06-08.md` §13 progress
- Touch `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — safe-lane note only

---

## 8 — Slice 2 spec: Match quality experience

**Branch:** `feat/candidate-match-quality-experience-2026-06-08`  
**Commit:** `feat(candidate): improve match quality experience`

### Deliverables

Re-group `MatchesSection` from “top 20 / more” into:

| Group | Score rule (reuse `matchQualityLabel`) | UI |
| ----- | -------------------------------------- | -- |
| **Strong fit** | `excellent` + `good` (≥60) | Cards with score, top reasons, “high confidence” chip |
| **Worth reviewing** | `possible` (40–59) | Score + reasons + “review carefully” chip |
| **Low confidence** | `weak` (<40) | Collapsed or de-emphasized section + uncertainty chip |

### Constraints

- Preserve `useDashboardMatchFeedback` visibility rules (`not_relevant` hides)
- Preserve apply/prepare gating via `applyActionsGuard`
- Reuse `JobList` — add group headers + chips, no new API
- Map reasons from existing `match_reasons` / job metadata fields only

### Files (expected)

- `frontend/src/components/dashboard/matches-section.tsx`
- `frontend/src/lib/match-quality-groups.ts` (new)
- `frontend/src/lib/i18n.ts`
- `frontend/scripts/match-quality-groups.test.ts` (new)

---

## 9 — Slice 3 spec: Application transparency premium

**Branch:** `feat/candidate-application-transparency-premium-2026-06-08`  
**Commit:** `feat(candidate): polish application transparency controls`

### Deliverables

Upgrade `CandidateApplicationTransparencyPanel`:

- **Two-column layout**: “Shared with recruiter” | “Not shared by default”
- **Human decision copy** — recruiter decides; TWIN does not hire
- **Automation status strip** — auto-apply PAUSED, delegated NOT LIVE (static, aligned with `docs/CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md`)
- Keep `<details>` or upgrade to `Card` variant="soft" — premium dark green aesthetic
- No DB, no new API, no consent model changes

### Files (expected)

- `frontend/src/components/dashboard/candidate-application-transparency-panel.tsx`
- `frontend/src/lib/i18n.ts`
- Extend `frontend/scripts/candidate-transparency.test.ts`

---

## 10 — Slice 4 spec: Recruiter decision console

**Branch:** `feat/recruiter-decision-console-2026-06-08`  
**Commit:** `feat(recruiter): upgrade inbox to decision console`

### Deliverables

UI-only refactor of `recruiter-inbox-client.tsx`:

1. **Console header** — queue name, company, row count, “human decision required” tally
2. **Segments** — map existing `statusFilter` to premium labels + counts
3. **Card hierarchy** — role title → candidate → match block → review card accordion
4. **Review card polish** — section labels from `REVIEW_CARD_SECTIONS`, confidence from `reviewCardDataConfidenceKey`

### Hard requirement

- `POST` accept/decline routes unchanged
- `test:recruiter-inbox-decision` + `test:recruiter-review-card` pass
- No new recruiter calendar sync claims

---

## 11 — Slice 5 spec: Trust language polish

**Branch:** `chore/product-trust-language-polish-2026-06-08`  
**Commit:** `chore(product): unify trust language and microcopy`

### Forbidden term grep targets

| Term / pattern | Replace with |
| -------------- | ------------ |
| “applies automatically” (live tense) | “prepares” / “phased” / “when enabled” |
| “autopilot” (without PAUSED) | “paused” / “prepare-only” |
| “delegated apply live” | “NOT LIVE” |
| “we decide” / “AI hires” | “recruiter decides” |
| Fake numbers / “thousands of users” | Remove or mark demo |

### Scope

- `frontend/src/lib/i18n.ts` (PL + EN)
- `frontend/src/lib/persona-pages.ts`
- Dashboard north-star strings
- Script: `frontend/scripts/trust-language-guard.test.ts` (grep-based)

---

## 12 — Slice 6 spec: Premium empty states & onboarding

**Branch:** `feat/premium-empty-states-onboarding-2026-06-08`  
**Commit:** `feat(product): add premium guided empty states`

### Deliverables

Extend `EmptyState` or add `GuidedEmptyState`:

| Context | Guided steps | CTA |
| ------- | ------------ | --- |
| Candidate: no matches | 1) Complete profile 2) Set titles 3) Wait for refresh | `/profile` |
| Candidate: no applications | 1) Review matches 2) Track first apply | `#dashboard-matches` |
| Recruiter: empty inbox | 1) Verify token 2) Load queue 3) Review first card | Inbox help copy |
| Recruiter: no search results | Refine filter guidance | Clear filters |

Use existing `t()` keys; 3-step max; no gamification rewards.

---

## 13 — Sequential execution plan (Slices 0–7)

| Slice | Branch | Type | PR title | Auto-merge criteria |
| ----- | ------ | ---- | -------- | ------------------- |
| **0** | `chore/premium-product-experience-audit-2026-06-08` | docs | docs(product): premium experience polish plan | docs-only ✅ |
| **1** | `feat/candidate-today-next-best-action-2026-06-08` | feat | feat(candidate): today next-best-action | lint+tsc+build+tests ✅ |
| **2** | `feat/candidate-match-quality-experience-2026-06-08` | feat | feat(candidate): match quality UX | same |
| **3** | `feat/candidate-application-transparency-premium-2026-06-08` | feat | feat(candidate): application transparency | same |
| **4** | `feat/recruiter-decision-console-2026-06-08` | feat | feat(recruiter): decision console | recruiter tests ✅ |
| **5** | `chore/product-trust-language-polish-2026-06-08` | chore | chore(product): trust language | grep guard ✅ |
| **6** | `feat/premium-empty-states-onboarding-2026-06-08` | feat | feat(product): guided empty states | same |
| **7** | `docs/final-premium-product-qa-pack-2026-06-08` | docs | docs(product): founder QA checklist | docs-only ✅ |

**Per-slice workflow:** checkout scaffold → pull → branch → implement → `npm run lint` → `npx tsc --noEmit` → `npm run build` → relevant `npm run test:*` → optional `pytest tests/test_csp_report*.py` → `git diff --check` → commit → push → `gh pr create` → auto-merge if green → wait deploy → smoke `twin-sooty.vercel.app` routes → update matrices → next slice.

---

## 14 — Test & smoke matrix

### Per code slice (frontend)

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
npm run test:dashboard-ux-safety      # Slice 1
npm run test:verified-readiness-guard # Slice 1
npm run test:candidate-transparency   # Slice 3
npm run test:recruiter-inbox-decision # Slice 4
npm run test:recruiter-review-card    # Slice 4
npm run test:pii-data-visibility      # Slice 4
npm run test:homepage-nav             # Slice 5 (regression)
git diff --check
```

### Optional backend (no mutation)

```bash
pytest tests/test_csp_report*.py -q
```

### Post-merge smoke routes (`twin-sooty.vercel.app`)

| Route | Method | Expect |
| ----- | ------ | ------ |
| `/` | GET | 200 |
| `/demo` | GET | 200 |
| `/dashboard` | GET | 200 (auth redirect OK) |
| `/login/candidate` | GET | 200 |
| `/recruiter/inbox` | GET | 200 |
| `/recruiter/calendar` | GET | 200, NOT LIVE copy |
| `/api/public-health` | GET | `db_ok: true` |

---

## 15 — Success criteria, risks & founder handoff

### Success criteria (program complete)

- [x] Candidate dashboard answers “**what should I do today?**” in &lt;5 seconds
- [x] Matches grouped by **confidence**, not flat score sort only
- [x] Application transparency readable as **privacy control panel**
- [x] Recruiter inbox feels like **decision console**, not raw table
- [x] Trust language grep clean (PL/EN)
- [x] Guided empty states on candidate + recruiter zero-data paths
- [x] `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` delivered (Slice 7)
- [x] Launch matrices updated with safe-lane notes; **public NO-GO unchanged**

### Stop conditions (report in Polish, await founder)

| Risk | Trigger |
| ---- | ------- |
| Auth/CSP regression | Any slice breaks security-headers or CSP tests |
| Apply re-enable | Any CTA or copy implies live autonomous submit |
| Recruiter behavior change | Accept/decline API contract modified |
| Scope creep | Backend migration required for UX polish |
| H5d GO SMALL | User asks to send external invites — **founder decision** |

### Founder handoff questions (post Slice 7)

1. **Slot-1 recruiter visual review** — ready after Slice 4 smoke on production inbox?
2. **5–10 candidate outreach** — ready after Slice 1+2 on production dashboard with real profile?
3. **What NOT to build next** — delegated apply, public launch, recruiter calendar sync, gamification expansion

### What NOT to build in this program

- Delegated apply engine or KYC submit flows
- Auto-apply re-enable or nightly beat activation
- Recruiter calendar OAuth/sync
- Public launch GO matrix flip
- Fake social proof / waitlist inflation
- Childish XP/badge campaigns
- New ML match endpoints (UI-only grouping of existing scores)

---

## Appendix A — Key file index

| Path | Role |
| ---- | ---- |
| `frontend/src/app/dashboard/page.tsx` | Candidate dashboard orchestrator |
| `frontend/src/components/dashboard-command-center.tsx` | Current welcome hero |
| `frontend/src/components/dashboard/matches-section.tsx` | Ranked matches feed |
| `frontend/src/components/dashboard/candidate-application-transparency-panel.tsx` | PII transparency |
| `frontend/src/app/recruiter/inbox/recruiter-inbox-client.tsx` | Recruiter inbox |
| `frontend/src/lib/recruiter-inbox-decision.ts` | Decision badges + filters |
| `frontend/src/lib/recruiter-inbox-segments.ts` | Decision console segments + counts |
| `frontend/src/lib/recruiter-review-card.ts` | Review card sections |
| `frontend/src/lib/i18n.ts` | PL/EN copy source of truth |
| `frontend/src/components/ux/empty-state.tsx` | Base empty state |
| `frontend/src/components/ux/guided-empty-state.tsx` | Premium guided empty states |
| `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` | Founder QA checklist + rubric |
| `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` | Launch stance matrix |
| `docs/CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md` | Transparency baseline |

---

## Appendix B — Slice 0 progress

| Slice | Status | PR |
| ----- | ------ | -- |
| 0 | **DONE** | [#52](https://github.com/CzechowskiT/twin/pull/52) |
| 1 | **DONE** | [#53](https://github.com/CzechowskiT/twin/pull/53) |
| 2 | **DONE** | [#54](https://github.com/CzechowskiT/twin/pull/54) |
| 3 | **DONE** | [#55](https://github.com/CzechowskiT/twin/pull/55) |
| 4 | **DONE** | [#56](https://github.com/CzechowskiT/twin/pull/56) |
| 5 | **DONE** | [#57](https://github.com/CzechowskiT/twin/pull/57) |
| 6 | **DONE** | [#58](https://github.com/CzechowskiT/twin/pull/58) |
| 7 | **DONE** | *(docs commit)* |

*Program complete 2026-06-08.*
