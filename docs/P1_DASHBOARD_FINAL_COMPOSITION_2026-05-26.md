# P1 Dashboard Final Composition Cleanup — 2026-05-26

Phase 1, frontend cleanup pass **5E** (final composition). Caps
the dashboard refactor arc that started with the section split
(`0bfadc2`) and ended at Phase 5D-2 (`8b53e1d`). Extracts the
**match feedback** surface — the `submitMatchFeedback` mutation
plus the three derived `visibleMatches` /
`topHighlightMatches` / `moreRecommendationMatches` memos that
feed `<MatchesSection/>` — out of `frontend/src/app/dashboard/page.tsx`
into a colocated `useDashboardMatchFeedback` hook. No user-facing
behaviour change: same endpoint, same payload, same toast, same
"Nietrafione" hide-the-card rule, same visibility filter
(`applicationByJobId[job_id] !== "rejected"`), same minimum
score gate (`MAIN_RECOMMENDATION_MIN_SCORE`), same top-K split
(`TOP_MATCHES_HIGHLIGHT_COUNT`).

## TL;DR

- `page.tsx`: **473 → 435 LoC** (−38, −8.0%). Now well within
  the 350-450 LoC target the task set, and below the original
  ~514 LoC `564f032` line.
- New hook
  `frontend/src/hooks/dashboard/use-dashboard-match-feedback.ts`
  (138 LoC). One mutation (`submitMatchFeedback`), three derived
  `useMemo`s (`visibleMatches`, `topHighlightMatches`,
  `moreRecommendationMatches`).
- Dead imports removed from `page.tsx`: `toast` (react-hot-toast),
  `apiFetch`, `getToken`, `dashboardFetchUserMessage`,
  `MatchFeedbackValue`, `MAIN_RECOMMENDATION_MIN_SCORE`,
  `TOP_MATCHES_HIGHLIGHT_COUNT`. The matching-quality constants
  and the feedback value type now live inside the new hook.
- `<MatchesSection/>` and `<JobsSection/>` prop bags unchanged.
- Gates: `npm run lint` (0), `npx tsc --noEmit` (0),
  `npm run build` (0 errors). No new behaviour, no copy change,
  no migrations, no env change, no Railway redeploy.
- Hard bans honoured: no live `submitMatchFeedback` POST during
  verification, no auto-apply, no scrape, no `.env` / token /
  JWT in this report.

## Why

Phase 5D-2 left `page.tsx` at 473 LoC, very close to the 350-450
range the overnight TASK 3 brief specified. The remaining slice
worth lifting was the **match-feedback surface**:

1. `submitMatchFeedback(jobId, value)` — the "Trafione" /
   "Nietrafione" / "Apply intent" / "Not now" mutation that
   posts a `MatchFeedbackValue` to
   `/api/v1/candidates/me/match-feedback` and (when
   `value === "not_relevant"`) optimistically filters the matched
   job out of the live list.
2. `visibleMatches` — derived from `matches.items` filtered by
   `applicationByJobId !== "rejected"` and
   `score >= MAIN_RECOMMENDATION_MIN_SCORE`. Used by
   `<MatchesSection/>` to render the recommendations strip and
   by the "Open first" empty-state CTA.
3. `topHighlightMatches` and `moreRecommendationMatches` —
   `visibleMatches.slice(0, TOP_MATCHES_HIGHLIGHT_COUNT)` and
   the tail; feed the "Top picks" vs. "More recommendations"
   visual split.

All three derivations share the same input pair
(`matches`, `applicationByJobId`), and the mutation that drives
the filter (the optimistic `setMatches` on `not_relevant`) is
the same function. Co-locating them in one hook keeps the
"matches view-model" boundary explicit and removes the last
piece of data-layer code from the page.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `<MatchesSection/>` / `<JobsSection/>` prop-shape change.
- No `useDashboardData` core loader change.
- No `useDashboardApplicationActions` change.
- No `useDashboardCalendarActions` change.
- No `useDashboardModals` change.
- No `useDashboardJobApplicationActions` change.
- No `useDashboardJobListActions` change.
- No real `match-feedback` POST during verification.
- No real apply / auto-apply / scrape.
- No env, secrets, migrations, or deploy.
- No section order or CSS change.

In scope:

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-match-feedback.ts`.
- `frontend/src/app/dashboard/page.tsx` imports + wiring only.
- Dead-import cleanup on `page.tsx`.
- This doc.

## What moved

From `page.tsx` → `use-dashboard-match-feedback.ts`:

1. **Mutation** — one async function:
   - `submitMatchFeedback(jobId, value: MatchFeedbackValue)` —
     same `POST /api/v1/candidates/me/match-feedback` body
     `{ job_id, feedback_value: value }`, same toast
     (`dashboard.matchFeedbackSaved`), same optimistic
     `setMatches` filter on `value === "not_relevant"`, same
     `setError(dashboardFetchUserMessage)` error path, same
     `setMatchFeedbackBusyJobId` busy-state transitions, same
     `setMatchFeedbackByJobId` updater shape.
2. **Derived view-model** — three `useMemo`s:
   - `visibleMatches` — `matches.items` filtered by
     `applicationByJobId[job_id] !== "rejected"` and
     `(score ?? 0) >= MAIN_RECOMMENDATION_MIN_SCORE`.
   - `topHighlightMatches` —
     `visibleMatches.slice(0, TOP_MATCHES_HIGHLIGHT_COUNT)`.
   - `moreRecommendationMatches` —
     `visibleMatches.slice(TOP_MATCHES_HIGHLIGHT_COUNT)`.
3. **Imports moved**:
   - `apiFetch`, `getToken`, `toast`,
     `dashboardFetchUserMessage`, `MatchFeedbackValue`,
     `MAIN_RECOMMENDATION_MIN_SCORE`,
     `TOP_MATCHES_HIGHLIGHT_COUNT` — all now imported by the
     hook, removed from `page.tsx`.

`page.tsx` keeps:

- `developmentFocusHasData` — derived only from `devFocus`; it's
  consumed once by `<DevelopmentFocusSection/>`. Bundling it
  with match feedback would couple two unrelated boundaries.
- `pipelineActiveCount` — derived only from `applications`; it
  feeds the Momentum rail. Same boundary argument.
- `hasProfile`, `matchesInitialSkeleton`, `showScrapePanel` —
  trivial derivations that depend on `profile`, `matches`,
  `user`; cheap inline.
- `feedbackOpen` / `setFeedbackOpen` — footer surface; out of
  scope.
- `dashboardBootstrapping` short-circuit + return — the loading
  state is a Shell render branch, not data.
- `<MatchesSection/>` and `<JobsSection/>` call sites — prop
  bags unchanged. `onSubmitFeedback`,
  `visibleMatches`, `topHighlightMatches`,
  `moreRecommendationMatches` resolve to the same identifiers,
  only now they come from the new hook destructure.

## Behaviour guarantees (1:1)

| Concern                              | Before (`8b53e1d`)                                                       | After                                                                                            | Same? |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----- |
| Endpoint                             | `POST /api/v1/candidates/me/match-feedback`                              | `POST /api/v1/candidates/me/match-feedback`                                                      | ✅    |
| Body                                 | `{ job_id, feedback_value }`                                             | `{ job_id, feedback_value }`                                                                     | ✅    |
| Toast (success)                      | `t("dashboard.matchFeedbackSaved")`                                      | `t("dashboard.matchFeedbackSaved")`                                                              | ✅    |
| Error path                           | `setError(dashboardFetchUserMessage(err, t))`                            | identical                                                                                        | ✅    |
| Busy lock                            | `setMatchFeedbackBusyJobId(jobId)` → finally `setMatchFeedbackBusyJobId(null)` | identical                                                                                  | ✅    |
| Hide on `not_relevant`               | `setMatches(prev => filter(m.job_id !== jobId), total: max(0, total-1))` | identical                                                                                        | ✅    |
| Filter on `applicationByJobId`       | `[job_id] !== "rejected"`                                                | identical                                                                                        | ✅    |
| Minimum score                        | `MAIN_RECOMMENDATION_MIN_SCORE` (38)                                     | identical (re-exported constant, not re-defined)                                                 | ✅    |
| Top-K split                          | `TOP_MATCHES_HIGHLIGHT_COUNT` (20)                                       | identical                                                                                        | ✅    |
| `<MatchesSection/>` prop bag         | shape `{ matches, visibleMatches, topHighlightMatches, ..., onSubmitFeedback, ... }` | identical (only identifier resolution moves)                                       | ✅    |

## LoC trajectory (page.tsx, full arc)

| Commit       | `page.tsx` LoC | Δ    | Note                                            |
| ------------ | -------------- | ---- | ----------------------------------------------- |
| `0bfadc2`    | (pre-split)    | —    | Section split start                             |
| `28205ea`    |                | —    | Dashboard state hooks                           |
| `f926741`    | 707            | —    | Application actions hook                        |
| `f49c077`    | 671            | −36  | Calendar actions hook                           |
| `b35dc65`    | 612            | −59  | Modal state hook                                |
| `564f032`    | 514            | −98  | Job list actions hook                           |
| `8b53e1d`    | 473            | −41  | Job application actions hook                    |
| **this pass**| **435**        | −38  | **Match feedback hook (composition cap)**       |

Drop from pre-split (~1.2k) to 435 LoC: roughly **−64%** of the
original page.tsx is now data-layer / hook code; the page is
pure composition + a handful of trivial derived booleans + the
JSX tree.

## Files

- `frontend/src/hooks/dashboard/use-dashboard-match-feedback.ts`
  — new, 138 LoC. One `useCallback` (`submitMatchFeedback`) +
  three `useMemo`s (`visibleMatches`, `topHighlightMatches`,
  `moreRecommendationMatches`). Imports: `useCallback`,
  `useMemo`, `toast`, `dashboardFetchUserMessage`, `apiFetch`,
  `getToken`, `TranslationKey`,
  `MAIN_RECOMMENDATION_MIN_SCORE`,
  `TOP_MATCHES_HIGHLIGHT_COUNT`, `MatchFeedbackValue`,
  `DashboardMatchItem`, `DashboardMatchList`. Pure data-layer;
  no JSX.

- `frontend/src/app/dashboard/page.tsx` — drops:
  - `import toast from "react-hot-toast";`
  - `import { apiFetch } from "@/lib/api";`
  - `import { getToken } from "@/lib/auth";`
  - `import { MAIN_RECOMMENDATION_MIN_SCORE,
    TOP_MATCHES_HIGHLIGHT_COUNT, type MatchFeedbackValue, }
    from "@/lib/matching-quality";`
  - `import { dashboardFetchUserMessage } from
    "@/components/dashboard/dashboard-helpers";`
  - the inline `submitMatchFeedback` async function (25 lines)
  - the three inline `useMemo`s for visibility + top split (18
    lines)
  
  Adds:
  - `import { useDashboardMatchFeedback } from "@/hooks/dashboard/use-dashboard-match-feedback";`
  - one destructure call to the new hook.
  
  `<MatchesSection/>` props are byte-identical aside from
  identifier resolution.

## Out of scope (later passes, if needed)

- `developmentFocusHasData` and `pipelineActiveCount` — cheap
  single-source derivations; not worth a hook of their own
  yet. Move only if a future feature couples them to other
  Momentum-rail derivations.
- `feedbackOpen` / `setFeedbackOpen` — footer surface; keep on
  the page until the help/feedback strip grows.
- The bootstrapping loader (`dashboardBootstrapping` Shell
  branch) — render concern, not data; lives where it's
  rendered.

## Verification

- `npm run lint` — clean (0 problems).
- `npx tsc --noEmit` — clean (0 errors).
- `npm run build` — clean (full Next.js production build,
  every dashboard / candidate / company / recruiter / placement
  route prerendered or marked dynamic as designed).
- `wc -l page.tsx` — 435 LoC. Within target 350-450, below the
  previous 473.
- Hook: 138 LoC.
- No real `match-feedback` POST during verification — only
  lint / tsc / `next build`.
- `rg -n "submitMatchFeedback" frontend/src/app/dashboard/page.tsx`
  returns exactly two hits: the destructure (line 180) and the
  `<MatchesSection onSubmitFeedback={(jobId, value) => void
  submitMatchFeedback(jobId, value)}` call site (line 322).
  No stray references.

No production deploy required by this slice alone — refactor only.
Client-only, additive (new hook file). Safe to ship on the next
regular `vercel deploy --prod` or via the existing Vercel Git
integration on `cursor/phase1-monorepo-scaffold` → preview, then
promote to production with the standard "Promote to Production"
button.
