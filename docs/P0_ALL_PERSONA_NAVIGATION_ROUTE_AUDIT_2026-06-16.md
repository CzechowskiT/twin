# P0 all-persona navigation route audit — 2026-06-16

**Branch:** `fix/p0-all-persona-navigation-routes-buttons-2026-06-16`  
**Incident:** Candidate tiles Oferty / Dopasowania / Profil i CV → 404 or blank; logout landed on `/login` without homepage Demo; same class of risk on recruiter, company, investor module cards.

## Executive summary

| Persona | Module hrefs audited | Broken before | Fix |
| ------- | -------------------- | ------------- | --- |
| Candidate | 11 | 2 (`/dashboard/jobs`, profile tile → `/dashboard`) | Canonical routes + alias pages |
| Recruiter | 13 | 0 | Verified; scorecard/scheduling → `/recruiter/inbox` |
| Company | 7 | 0 | Verified |
| Investor | 6 (+mailto) | 0 | Verified |

**Logout:** `logoutRedirectPath()` → `/` (homepage marketing chrome includes flat **Demo** link → `/demo`).  
**Auth:** `PersonaWorkspaceGate` preserves `?next=` via `loginPathWithNext`; matches page stays on `/dashboard/matches` (no signed-in bounce to panel).

## Root cause fix (2026-06-16) — real content

PR #153 stopped 404s but `/dashboard/matches` used `router.replace("/dashboard#dashboard-matches")` when signed in, and `/dashboard/jobs` server-redirected away. Founder could not distinguish Panel vs Oferty vs Dopasowania.

**Fix branch:** `fix/candidate-offers-matches-real-content-2026-06-16`  
**Tests:** `test:candidate-offers-matches-real-content` + browser smoke.
**Launch stance:** unchanged **NO-GO** — navigation repair only; no auth weakening.

## Candidate canonical mapping

| Label (PL) | Canonical route | Implementation |
| ---------- | --------------- | -------------- |
| Panel | `/dashboard` | Existing hub |
| Kalendarz | `/dashboard/calendar` | Existing |
| Oferty | `/dashboard/jobs` | **Distinct offers page** — `CandidateJobDiscovery` (no dashboard bounce) |
| Dopasowania | `/dashboard/matches` | **Distinct matches page** — `CandidateMatchesWorkspace` (removed `router.replace` to `#dashboard-matches`) |
| Profil i CV | `/profile` | Module href updated from `/dashboard` |
| CV alias | `/dashboard/cv` | **New** → redirect `/profile` |
| Profile alias | `/dashboard/profile` | **New** → redirect `/profile` |
| Plan | `/dashboard/plan` | **New** → redirect `/dashboard/billing` |
| Aplikacje | `/dashboard/applications` | Existing |
| Evidence | `/dashboard/evidence` | Existing |
| Interview prep | `/dashboard/interview-prep` | Existing |

Constants: `frontend/src/lib/candidate-canonical-routes.ts`

## Recruiter surfaces

| Module | href | Page | Status badge |
| ------ | ---- | ---- | ------------ |
| inbox | `/recruiter/inbox` | ✓ | live |
| pipeline | `/recruiter/pipeline` | ✓ | live |
| search | `/recruiter/search` | ✓ | live |
| jobs | `/recruiter/jobs` | ✓ | live |
| calendar | `/recruiter/calendar` | ✓ | **not_live** |
| notes_scorecards | `/recruiter/inbox` | ✓ | live (inbox panel) |
| scheduling | `/recruiter/inbox` | ✓ | pilot (inbox panel) |
| audit | `/recruiter/inbox` | ✓ | pilot (inbox panel) |
| integrations | `/recruiter/integrations` | ✓ | pilot |
| talent_pool / radar / analytics | respective `/recruiter/*` | ✓ | pilot |

## Company surfaces

All `COMPANY_WORKSPACE_MODULES` hrefs resolve to existing `/company/*` pages. Billing module remains **not_live** with honest badge.

## Investor surfaces

All internal hrefs resolve (`/investor/metrics`, `/roadmap`, `/data-room`, `/calculator`, `/placement`). Contact card uses `mailto:` — external, not a 404 risk.

## Logout & Demo

| Surface | Before | After |
| ------- | ------ | ----- |
| `logoutRedirectPath` | `/login` | `/` |
| Homepage Demo | Present in `headerMarketingLaneLinks()` | Unchanged — visible on `/` marketing header |
| Session clear | `clearToken()` + `clearSessionPersona()` | Unchanged |

## Automated verification

```bash
cd frontend
npm run test:p0-all-persona-navigation-routes          # 15 static assertions
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:p0-all-persona-navigation-browser      # 7 sequential Playwright scenarios
npm run build && npx tsc --noEmit
```

**Production smoke (post-deploy, gated):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-all-persona-navigation-browser
```

## Hard bans confirmed

No auth weakening, no auto-apply activation, no recruiter calendar sync activation, no outreach, no test weakening, no launch GO change.

## Related docs

- `docs/P0_WORKSPACE_DEEPLINK_MULTITAB_2026-06-16.md` — `?next=` deep-link preservation (complementary)
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — module nav row
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — navigation entry
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — unchanged NO-GO
