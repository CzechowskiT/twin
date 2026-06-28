# P0 No Headless Final State — 2026-06-17

**Branch:** `fix/p0-no-headless-final-state-2026-06-17`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Owner:** TWIN P0 No Headless Final State Owner

## Founder decision

**Phase 3B BLOCKED** — controlled multitab verification reintroduced `chrome-headless-shell` CPU rise and allowed blank/skeleton-only routes as passing final states. This PR narrows the P0 guardrail to **tests + minimal route fixes only**. No shell/gate/layout/fallback changes without founder review.

## Failure definition

Final state **fails** if the user sees only:

- header / logo strip / shell frame
- skeleton with no real content
- blank page / empty layout
- loading with no content
- chrome without meaningful main content

Final state **passes** if the user sees:

- real page content in `main`
- auth-required card with sign-in CTA and preserved `next=` deep link
- guided not-found (`data-testid="*-not-found"`)
- planned / pilot / demo markers
- meaningful error surface

## Root cause (Phase 3B investigation)

| Layer | File | Role in headless final states |
| ----- | ---- | ----------------------------- |
| Paint shell | `frontend/src/components/lightweight-route-shell.tsx` | Defers children behind skeleton until `paintReady`; hidden tabs force early paint, visible tabs can sit on skeleton if hydration stalls |
| Auth gate | `frontend/src/components/persona-workspace-gate.tsx` | **Valid** final state when unauthenticated — renders auth card + `loginPathWithNext` Link (not a failure) |
| Workspace layout | `frontend/src/components/workspace-route-layout.tsx` | Wraps all persona workspaces: `PersonaWorkspaceGate` → `LightweightRouteShell` + `WorkspaceRouteSkeleton` |
| Loading shells | `frontend/src/app/recruiter/loading.tsx`, persona `loading.tsx` | Server skeleton before client hydration — can appear as final state if client never paints |
| Phase 3B multitab | `verify/phase3b-controlled-multitab-2026-06-17` (not merged) | Opened ≤8 tabs per batch with 60–90s idle + CDP metrics; `evaluateRoute` treated `shellReady \|\| mainVisible` as content — **chrome frame could pass** without main body copy |

**Why Phase 3B is blocked:** multitab Playwright runs spin up `chrome-headless-shell` processes; combined with `LightweightRouteShell` skeleton deferral, routes could settle on header+marquee+empty `main` and still satisfy Phase 3B heuristics (`visibleTextLength ≥ 40` from chrome copy alone).

**Fix strategy in this PR:** sequential **one-page** browser smoke with `isChromeOnly` detection (sparse `main` + header/marquee present, no auth card). Route-level fixes only where a route lacks auth card, demo marker, or guided not-found.

## Critical routes (36)

| Lane | Routes |
| ---- | ------ |
| Public | `/`, `/demo`, `/for-companies` |
| Candidate | `/dashboard`, `/dashboard/jobs`, `/dashboard/matches`, `/dashboard/trust`, `/dashboard/trust/controls`, `/profile`, `/dashboard/profile`, `/dashboard/cv`, `/dashboard/hiring-journey`, `/profile/hiring-journey` |
| Recruiter | `/recruiter`, demo-candidate-001 (+ trust/team/communication/collaboration), demo-role-001 pipeline/team/tasks, `ats/import-readiness`, `/recruiter/hiring-journey` |
| Company | `/company/dashboard`, demo candidate surfaces, demo role pipeline/team/tasks, `ats/import-readiness`, `/company/hiring-journey` |
| Board | `/board/hiring-journey` |

Inventory: `frontend/e2e/helpers/p0-no-headless-final-state.ts`

## Implementation

| Artifact | Path |
| -------- | ---- |
| Shared evaluator | `frontend/e2e/helpers/p0-no-headless-final-state.ts` |
| Static guards | `frontend/scripts/p0-no-headless-final-state.test.ts` |
| Browser smoke | `frontend/e2e/p0-no-headless-final-state-browser.spec.ts` |

### Commands

```bash
cd frontend
npm run test:p0-no-headless-final-state
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:p0-no-headless-final-state-browser
```

Production smoke (gated):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-no-headless-final-state-browser
```

### Required bundle (no Phase 3B)

```bash
npm run test:p0-no-headless-final-state
npm run test:p0-no-headless-final-state-browser   # local browser
npm run test:p0-all-persona-navigation-routes
npm run test:p0-all-persona-navigation-browser
npm run test:performance-safe-moving-logo-marquee
npm run test:performance-safe-moving-logo-marquee-browser
npm run test:login-options-instant-render
npm run test:trust-language-guard
npm run test:i18n-coverage
npm run build
npx tsc --noEmit
```

## Auth vs headless

| Signal | Valid? | Detection |
| ------ | ------ | --------- |
| Sign in / Zaloguj + workspace gate copy | ✅ | `hasAuthCard` |
| Link with `next=` to preserved destination | ✅ | `hasAuthNextLink` |
| Header + marquee only, empty `main` | ❌ | `isChromeOnly` |
| Skeleton without ready shell or main text | ❌ | `stuck-skeleton` |

## Phase 3B status

**BLOCKED** — do not run `test:phase3b-controlled-multitab` or prod variant. See `docs/PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md`.

**Founder review:** Slice 12 Gate B minimal shell fix merged 2026-06-28 — see [P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md). Gate C browser validation **PENDING**. Phase 3B remains **BLOCKED** until Gate E.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial P0 no-headless guardrail; Phase 3B BLOCKED |
| 2026-06-28 | **Slice 13** — 36 routes (5 hiring-journey added); browser smoke remains gated |
| 2026-06-28 | **Slice 12 founder-review package** — static guard test 10; no shell implementation |
| 2026-06-28 | **Slice 12 Gate B** — minimal shell/gate fix merged; Gate C/E **PENDING**; 36 routes unchanged |

## Merge criteria

Merge only if changes are **tests + route-level fixes** without touching `LightweightRouteShell`, `PersonaWorkspaceGate`, `workspace-route-layout.tsx`, or loading/fallback shells. If those are required → STOP, document exact files + plan, founder review before merge.

## Verdict labels

| Label | Meaning |
| ----- | ------- |
| P0 headless guard **PASS** | All 36 routes pass sequential browser smoke |
| Phase 3B | **BLOCKED** |
| Public launch | **NO-GO** (unchanged) |
