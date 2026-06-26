# Hiring Journey Traceability — 2026-06-26

Traceability memo for the read-only Hiring Journey timeline layer shipped in PRs **#291–#296**. Consolidates routes, safety boundaries, test coverage, deploy interpretation, and launch gates.

**Canonical feature doc:** [HIRING_JOURNEY_TIMELINE_2026-06-25.md](./HIRING_JOURNEY_TIMELINE_2026-06-25.md)  
**Related:** [SCHEDULING_PROPOSAL_PACK_2026-06-25.md](./SCHEDULING_PROPOSAL_PACK_2026-06-25.md), [PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md)

## Status summary

| Item | Status |
|------|--------|
| UI preview (5 persona routes) | **READY** |
| Live workflow engine | **NOT SHIPPED** |
| Read-only / demo-only | **ENFORCED** |
| Unit + guard tests | **PASS** (see table below) |
| Browser smoke (local) | **OPTIONAL** — requires `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

---

## 1. Routes, personas, aliases, board blocked, read-only semantics

### Five routes

| Route | Route surface | Persona | Overall status (demo) |
|-------|---------------|---------|------------------------|
| `/dashboard/hiring-journey` | `candidate_dashboard` | Candidate | `preview` |
| `/profile/hiring-journey` | `candidate_profile` | Candidate (profile alias) | `preview` |
| `/recruiter/hiring-journey` | `recruiter` | Recruiter | `ready_for_human_review` |
| `/company/hiring-journey` | `company` | Company | `in_review` |
| `/board/hiring-journey` | `board` | Board | **`blocked`** |

Source: `HIRING_JOURNEY_ROUTES` and `PERSONA_OVERALL_STATUS` in `frontend/src/lib/hiring-journey.ts` / `hiring-journey-demo-data.ts`.

### Candidate alias semantics

- Dashboard and profile routes both resolve **identical** journey data (`persona: candidate`).
- Bidirectional alias nav: dashboard ↔ profile via `hiringJourneyCandidateAliasNav()` with `data-hiring-journey-nav="candidate-alias"`.
- Test **15** in `hiring-journey.test.ts` asserts alias parity.

### Board blocked semantics

| Aspect | Board behavior |
|--------|----------------|
| Overall status | `blocked` — badge marker `hiring-journey-board-blocked` |
| Blocking point copy | `hiringJourney.blockingPointBoard` (board-specific, not scheduling) |
| Step nav hrefs | **Blocked** — `hiringJourneyBoardStepNavBlocked(board) === true`; links use `data-hiring-journey-nav="source-module-blocked"` |
| Step provenance | **Monitor-only** on every step (`hiring-journey-step-provenance-monitor-only`) |
| Cross-links | Omit self-route `/board/hiring-journey`; outbound links to other readiness surfaces only |

Board is **evidence/monitor-only** — no step advancement, no live-action CTAs.

### Read-only semantics

| Marker / copy | Meaning |
|---------------|---------|
| `hiring-journey-read-only-badge` | Visible read-only preview badge |
| `hiring-journey-read-only-note` | Explains demo/readiness-only nature |
| `hiring-journey-no-live-action` | No live scheduling, invites, calendar write |
| `hiring-journey-source-badge` | `source: readiness_preview` |
| Data origin | `hiring-journey-demo-data.ts` — no backend writes, no OAuth, no external API |

Eleven shared steps: Discovery → Matching → Trust Review → Candidate Readiness → Offer Readiness → Scheduling Proposal → Interview Preparation → Decision Review → Offer Decision → Placement Verification → Onboarding Preview.

---

## 2. Safety boundaries

This layer is **not** a workflow engine. Explicitly blocked (enforced in demo data, i18n guards, and test **4** / **17**):

| Boundary | Status |
|----------|--------|
| Automatic candidate advancement / movement | **BLOCKED** |
| Interview scheduled / event write | **BLOCKED** |
| Invite sent | **BLOCKED** |
| Email sent | **BLOCKED** |
| Calendar sync / calendar write | **BLOCKED** |
| ATS writeback | **BLOCKED** |
| Payment / invoice / revenue recognition | **BLOCKED** |
| External employer confirmation | **BLOCKED** |
| Microsoft Graph live busy-read | **NOT SHIPPED** (staging smoke blocked) |
| Mutation controls (`<button>`, `<form>`, submit, primary CTAs) | **Forbidden** on timeline UI |
| Affirmative live-action copy | **Guarded** — `hiringJourneyHasAffirmativeForbiddenCopy()` with negation window (PR #296) |

Human review required before any live action. Product gate required for calendar integration.

Cross-module alignment: Scheduling Proposal (step 6) shares the same blocked calendar/invite/email boundaries per [SCHEDULING_PROPOSAL_PACK_2026-06-25.md](./SCHEDULING_PROPOSAL_PACK_2026-06-25.md).

---

## 3. Test coverage table

Verification batch run on **2026-06-26** against scaffold HEAD `4be155c` (PR #296 merge).

| Command | Scope | Result |
|---------|-------|--------|
| `npm run test:hiring-journey` | 24 tests — routes, 11 steps, provenance, blocked actions, read-only markers, board blocked, alias nav, cross-links, i18n EN/PL + locale parity, forbidden copy guard, no secrets | **PASS** |
| `npm run test:hiring-journey-browser` | 5 routes browser smoke (optional; needs `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1`) | **NOT RUN** (optional gate) |
| `npm run test:candidate-trust-overview` | Trust overview inbound link to hiring journey (test 15) | **PASS** |
| `npm run test:candidate-profile-360` | Profile 360 inbound link by surface (test 10) | **PASS** |
| `npm run test:i18n-native-copy-quality` | Native copy quality across locales | **PASS** |
| `npm run test:i18n-coverage` | i18n key parity | **PASS** |
| `npm run test:trust-language-guard` | Trust/safety language guardrails | **PASS** |
| `npm run build` | Next.js production build | **PASS** |
| `npx tsc --noEmit` | TypeScript check | **PASS** |

### Hiring journey unit test inventory (`scripts/hiring-journey.test.ts`)

| # | Test |
|---|------|
| 1 | Four persona variants, eleven steps |
| 2 | Five routes registered with surface props |
| 3–3c | Step fields, provenance metadata, human-review steps |
| 4 | Blocked actions include required boundaries |
| 5–5f | Read-only badge, canonical copy, board blocked, no CTA controls, valid hrefs, board monitor-only |
| 6 | Cross-links to safe routes |
| 7–9 | Forbidden claims guard, EN/PL keys, locale parity |
| 10 | No secrets in sources |
| 11 | Doc file + npm script registered |
| 12–16 | Persona labels, alias nav, overview links, alias parity, board cross-link rules |
| 17 | Negative live-action guard (PR #296) |

---

## 4. Deploy / commit interpretation

Per [PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md):

| SHA | Meaning |
|-----|---------|
| **Scaffold HEAD** | `4be155c` — `origin/cursor/phase1-monorepo-scaffold` after PR #296 |
| **Vercel `frontend_commit`** | Frontend deploy SHA from `/api/public-health` |
| **Railway `api_commit`** | Backend deploy SHA — **unchanged** by hiring-journey PRs (#291–#296 are frontend-only) |

### Expected drift pattern

| Scenario | Pattern |
|----------|---------|
| Docs-only PR (this memo) | `docs_only_drift: true`, `alignment_status: acceptable_docs_only_drift` |
| Frontend-only PR (#291–#296) | `frontend_commit` newer than `api_commit` — **expected, not a bug** |
| Full-stack alignment | Both SHAs match scaffold HEAD + Alembic head confirmed separately |

**Important:** A newer Vercel frontend does **not** prove Railway ran migrations. Hiring Journey has **no backend dependency** — frontend-only deploy is sufficient for this slice.

Verification:

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{
  status, db_ok,
  git_commit, frontend_commit, api_commit,
  commit_interpretation, deployment_note
}'
```

Prod browser smoke (after Vercel deploy catches up):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:hiring-journey-browser
```

---

## 5. Launch-gate matrix

| Gate | Status | Notes |
|------|--------|-------|
| UI preview ready (5 routes) | **YES** | Read-only timeline shipped #291–#296 |
| Unit/guard tests passing | **YES** | Table in §3 |
| Browser smoke (local/prod) | **OPTIONAL** | Not required for docs batch; prod smoke after FE deploy |
| Live workflow engine | **NO** | Not shipped |
| Candidate advancement | **BLOCKED** | By design |
| Scheduling / calendar write | **BLOCKED** | By design |
| Microsoft Graph live busy-read | **NOT SHIPPED** | Staging operator setup pending |
| P0 performance | **OPEN** | See [P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md](./P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md) |
| Phase 3B controlled multitab | **HARD BLOCKED** | No unlock from hiring-journey alone |
| Public launch | **NO-GO** | Readiness preview only |

### Pilot caveats

- **Founder/demo use only** — all data is `readiness_preview` demo bundle.
- **Do not claim** live scheduling, placement confirmation, or calendar sync from this surface.
- **Board route** is monitor-only; step navigation intentionally blocked.
- **Auth shell** may appear in browser smoke without session — test accepts auth-shell as non-failure.
- **Limited recruiter pilot** remains subject to separate tracker constraints ([LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md](./LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md)).

---

## 6. PR SHAs (#291–#296)

Verified against `git log` and `gh pr view` on **2026-06-26**.

| PR | Title | Merge commit | Branch head (pre-merge) |
|----|-------|--------------|-------------------------|
| [#291](https://github.com/CzechowskiT/twin/pull/291) | Add hiring journey timeline preview | `6d40ea3` | `10b10de` |
| [#292](https://github.com/CzechowskiT/twin/pull/292) | feat(hiring): add journey inbound cross-links | `0d3fb89` | `ac210d5` |
| [#293](https://github.com/CzechowskiT/twin/pull/293) | Hiring journey read-only UI polish | `eb864de` | `8641820` |
| [#294](https://github.com/CzechowskiT/twin/pull/294) | Polish hiring journey route consistency (5 surfaces) | `1eb0b16` | `0ce18cf` |
| [#295](https://github.com/CzechowskiT/twin/pull/295) | Hiring Journey evidence provenance cards | `349a645` | `0163b2d` |
| [#296](https://github.com/CzechowskiT/twin/pull/296) | Harden hiring journey negative live-action guard | `4be155c` | `9d9a341` |

**Scaffold HEAD after #296:** `4be155cf147ed3192380e11f9f39bc4606e81b1a`

### PR scope summary

| PR | Primary deliverable |
|----|---------------------|
| #291 | Core timeline, demo data, 5 routes, component, unit tests |
| #292 | Inbound cross-links from trust, profile 360, scheduling, placement, board monitors |
| #293 | Read-only badge/note copy, board blocked messaging polish |
| #294 | Route surface consistency, persona labels, overview links, alias nav |
| #295 | Evidence provenance cards per step |
| #296 | Negative live-action copy guard with negation window |

---

## Files (feature scope, #291–#296)

| Path | Role |
|------|------|
| `frontend/src/lib/hiring-journey.ts` | Routes, markers, cross-links, guards |
| `frontend/src/lib/hiring-journey-demo-data.ts` | Demo bundle, blocked actions, audit |
| `frontend/src/components/hiring-journey/HiringJourneyTimeline.tsx` | Timeline UI |
| `frontend/src/app/*/hiring-journey/page.tsx` | Five persona routes |
| `frontend/scripts/hiring-journey.test.ts` | Unit/guard tests |
| `frontend/e2e/hiring-journey-browser.spec.ts` | Browser smoke |
| `docs/HIRING_JOURNEY_TIMELINE_2026-06-25.md` | Feature specification |

---

## Hard bans (unchanged)

- No live workflow engine from this layer.
- No candidate movement, scheduling, invites, email, calendar sync, ATS writeback, or payments.
- No public launch claim.
- P0 performance remains **OPEN**.
- Phase 3B remains **HARD BLOCKED**.

**Public launch: NO-GO.**
