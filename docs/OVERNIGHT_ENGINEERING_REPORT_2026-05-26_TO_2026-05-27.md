# Overnight Engineering Report — 2026-05-26 → 2026-05-27

Run summary for the autonomous overnight engineering session
on branch `cursor/phase1-monorepo-scaffold`. Worked through
TASK 0 → TASK 9 sequentially per the brief. Every commit
is small, atomic, and pushed to origin. Production is on the
latest commit at the time of writing.

## Headline numbers

- **9 commits**, all pushed, all green local gates
  (`npm run lint` 0, `npx tsc --noEmit` 0, `npm run build` 0,
  Playwright spec-parse 0 errors).
- **Production at SHA `703efe1`** (canonical alias
  `https://twin-sooty.vercel.app`, Vercel deployment
  `dpl_Ga4KdxDua8d8XcuGXax7TWZz4DZq`, build started
  `2026-05-26T14:43:12Z`, status Ready).
- **Backend at SHA `86176cce`** ("chore(p1): start engineering
  cleanup" — unchanged this run; we touched FE + docs only).
- **All smoke routes 200**: `/`, `/dashboard`, `/login`,
  `/register`, `/waitlist`, `/api/public-health`.
- **`db_ok=true`, `celery worker_active=true`,
  `validated_jobs=652`**.
- **`page.tsx` LoC trajectory**: pre-split ~1.2k → 707
  (`f926741`) → 671 → 612 → 514 (`564f032`) → 473
  (`8b53e1d`, start of overnight) → **435** (`b62a22e`, end of
  overnight). Inside the 350-450 target the brief set.

## Commits (chronological)

| #  | SHA      | Type        | Title                                             | Status                                   |
| -- | -------- | ----------- | ------------------------------------------------- | ---------------------------------------- |
| 0  | `8b53e1d`| `refactor`  | extract job application actions                   | Pre-existing on branch entering the run  |
| 1  | `92a6661`| `docs`      | verify 564f032 and 8b53e1d on prod                | Shipped                                  |
| 2  | `b62a22e`| `refactor`  | finalize dashboard composition                    | Shipped (page.tsx: 473 → 435 LoC)         |
| 3  | `a022f14`| `test`      | add safe dashboard smoke coverage                 | Shipped (8 Playwright tests total)       |
| 4  | `50dedde`| `chore(ci)` | harden p1 release checks (doc only — see below)   | Doc shipped; workflow YAML blocked       |
| 5  | `a03e68a`| `docs`      | document production alias workflow                | Shipped                                  |
| 6  | `ddce6dd`| `docs`      | outline p1 auth and observability next steps      | Shipped                                  |
| 7  | `703efe1`| `docs`      | outline p1 logging metrics tracing plan           | Shipped, currently live on prod          |
| 8  | (this)   | `docs`      | record overnight engineering progress             | Will be shipped after this file lands    |

## TASK-by-TASK verdict

### TASK 0 — Verify `564f032` on prod ✅

Doc: `docs/OVERNIGHT_RELEASE_VERIFY_564F032_2026-05-26.md`.

- Prod alias was already serving deployment
  `dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9` built from commit
  `8b53e1d` (Phase 5D-2), the descendant of `564f032`.
- No redeploy required.
- Smoke routes 200, security headers strong, backend health
  clean, hook wiring verified by grep.

### TASK 1 — Extract job application actions ✅ (pre-existing)

The Phase 5D-2 commit `8b53e1d` was already on branch when the
overnight run started. Per the brief's instruction
("if commit exists on branch, skip duplicate work for TASK 1,
do TASK 2 verify instead"), we skipped re-doing the work and
verified the existing commit was correct (TASK 2).

### TASK 2 — Verify Phase 5D-2 on prod/preview ✅

Doc: `docs/OVERNIGHT_RELEASE_VERIFY_JOB_APPLICATION_ACTIONS_2026-05-26.md`.

- Confirmed prod alias served `8b53e1d` end-to-end.
- Hook wiring (`useDashboardJobApplicationActions` ↔
  `useDashboardJobListActions` mutual-dependency via
  `trackLinkOpenedRef`) grep-verified.
- Endpoints, payloads, idempotency, refresh chain, window.open
  flags byte-identical to `564f032`.
- No real apply / auto-apply / scrape fired during verify.

### TASK 3 — Dashboard final composition cleanup ✅

Commit: `b62a22e refactor(dashboard): finalize dashboard composition`.
Doc: `docs/P1_DASHBOARD_FINAL_COMPOSITION_2026-05-26.md`.

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-match-feedback.ts`
  (138 LoC) owns `submitMatchFeedback` + three derived
  `useMemo`s (`visibleMatches`, `topHighlightMatches`,
  `moreRecommendationMatches`).
- `page.tsx`: 473 → **435 LoC** (−38, −8.0%). Inside target
  350-450. Dead imports cleared (`toast`, `apiFetch`,
  `getToken`, `dashboardFetchUserMessage`,
  `MatchFeedbackValue`, `MAIN_RECOMMENDATION_MIN_SCORE`,
  `TOP_MATCHES_HIGHLIGHT_COUNT`).
- Behaviour byte-identical: same endpoint, same payload, same
  toast, same `not_relevant` optimistic filter, same minimum
  score, same top-K split.

### TASK 4 — Dashboard E2E smoke tests ✅

Commit: `a022f14 test(dashboard): add safe dashboard smoke coverage`.
Doc: `docs/P1_DASHBOARD_E2E_SMOKE_2026-05-26.md`.

- `frontend/e2e/smoke.spec.ts` extended from 4 to **8** tests.
- New `"dashboard smoke (read-only, no live actions)"`
  describe block: unauthenticated `/dashboard` → `/login`,
  `/register/candidate` form visible (no submit), `/privacy`
  + `/terms` render, `/api/public-health` proxy returns
  `status="ok"` + `service="twin-api"`.
- **No real apply / auto-apply / login / password / signup**.
- `npx playwright test --list` enumerates 8 tests cleanly.

### TASK 5 — CI hardening ⚠️ (doc shipped, workflow blocked)

Commit: `50dedde chore(ci): harden p1 release checks` (doc-only).
Doc: `docs/P1_CI_HARDENING_2026-05-26.md`.

- The proposed `.github/workflows/smoke.yml` edit was
  prepared and validated locally (28 new backend tests
  collected, 28 pass in 7.25s; frontend lint / tsc / build /
  spec-list clean).
- Push of the workflow file was **rejected** by GitHub with:
  `refusing to allow a Personal Access Token to create or update
   workflow .github/workflows/smoke.yml without "workflow" scope`.
- Per the brief ("Note: PAT workflow scope may block push of
  workflows - document if so") we stashed the workflow change
  under `ci-hardening-pending-pat-scope` (visible via
  `git stash list` on this machine) and shipped only the doc
  with the full proposed YAML inline for a human with
  `workflow` PAT scope to paste / `git stash pop` and push.

### TASK 6 — Vercel alias drift docs ✅

Commit: `a03e68a docs(vercel): document production alias workflow`.
Doc: `docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md`.

- Confirmed canonical alias `twin-sooty.vercel.app` is owned
  by Vercel project **`twin`** (not `twin-sooty`).
- `frontend/.vercel/project.json` points at the wrong project
  (`twin-sooty`, `projectId
  prj_vN6xFbdufM5rRp86lPVB1rQm2FTp`). Did **not** fix the
  link unilaterally per the brief ("Only fix
  .vercel/project.json if 100% sure"). The existing
  `docs/VERCEL_PRODUCTION_BRANCH.md` runbook still claims
  project=`twin-sooty`; flipping the link would invalidate
  it without a human owner reviewing both runbooks.
- Day-to-day workflow unchanged: push to
  `cursor/phase1-monorepo-scaffold` → `twin`'s Git auto-deploy
  hook ships within ~8s.

### TASK 7 — Security next steps ✅

Commit: `ddce6dd docs(security): outline p1 auth and observability next steps`.
Doc: `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`.

- Captured "what's shipped" (HSTS preload, X-Frame-Options
  DENY, X-Content-Type-Options nosniff, Referrer-Policy,
  Permissions-Policy, CSP report-only, slowapi rate-limits,
  request-id middleware, idempotency keys).
- Captured 10-item priority queue: CSP enforcement, httpOnly
  cookie auth, CSP report ingest, edge rate-limit on
  candidate mutations, placement event audit-log assertion,
  Stripe webhook signature audit, OAuth redirect-URI
  allow-list audit, `npm audit` + `pip-audit` baseline,
  cookie-consent / analytics gating audit, auth rate-limit
  review.

### TASK 8 — Observability plan ✅

Commit: `703efe1 docs(observability): outline p1 logging metrics tracing plan`.
Doc: `docs/P1_OBSERVABILITY_PLAN_2026-05-26.md`.

- Captured "what's shipped" (request-id middleware, slowapi,
  FastAPI exception handlers, Celery task logs,
  `/api/v1/health` probes, `x-vercel-id` + `x-vercel-cache`).
- Captured 10-item observability backlog with three
  drop-in-ready no-op hooks (X-Request-Id header on
  `apiFetch`, `useReportWebVitals` stub,
  `window.onerror` listener) — all gated behind
  cookie-consent, none log PII, none ship a third-party SDK
  into the bundle.

### TASK 9 — Final overnight report ⏳

This document.

## Page.tsx LoC journey

| Commit                     | LoC   | Δ       | Pass                                    |
| -------------------------- | ----- | ------- | --------------------------------------- |
| Pre-split (origin/main era)| ~1.2k | —       | —                                       |
| `f926741`                  | 707   | -       | Application actions hook                |
| `f49c077`                  | 671   | −36     | Calendar actions hook                   |
| `b35dc65`                  | 612   | −59     | Modal state hook                        |
| `564f032`                  | 514   | −98     | Job list actions hook (Phase 5D-1)      |
| `8b53e1d` (overnight in)   | 473   | −41     | Job application actions hook (5D-2)     |
| **`b62a22e` (overnight)**  | **435** | **−38** | **Match feedback hook (5E, this run)**  |

Net drop from pre-split to today: **roughly −64%**. The page is
now pure composition over **eight** data-layer hooks plus a
handful of trivial inline derivations.

## Final production smoke (taken at the end of the run)

```
$ npx vercel inspect twin-sooty.vercel.app
  id     dpl_Ga4KdxDua8d8XcuGXax7TWZz4DZq
  name   twin
  target production
  status ● Ready
  url    https://twin-p6p4skc79-twin.vercel.app
  Build: Commit 703efe1 (cursor/phase1-monorepo-scaffold)

$ for p in / /dashboard /login /register /waitlist /api/public-health; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://twin-sooty.vercel.app${p}")
    echo "${p}: ${code}"
  done

/: 200
/dashboard: 200
/login: 200
/register: 200
/waitlist: 200
/api/public-health: 200

$ curl -s https://twin-sooty.vercel.app/api/public-health | python3 -m json.tool
{
  "status": "ok",
  "service": "twin-api",
  "git_commit": "86176cce024b700f3e3494131e9480686bdbe92c",
  "db_ok": true,
  "celery": {
    "worker_active": true,
    "worker_nodes": ["celery@81fddac7429c"],
    "broker_configured": true,
    "beat_schedule_has_nightly": true,
    "celery_task_always_eager": false
  },
  "validated_jobs": 652
}
```

## Hard bans honoured (full overnight run)

- ❌ No live auto-apply fired.
- ❌ No live `applyToJob` clicked (no real `window.open`
  navigated by the agent to an employer site).
- ❌ No real candidate-side mutation (no
  `setJobApplication`, no `submitMatchFeedback`, no calendar
  OAuth flow exchanged).
- ❌ No live scrape — `SCRAPE_RESPECT_ROBOT=1` already keeps
  LinkedIn boards blocked.
- ❌ No DB migration.
- ❌ No prod fake-job seed.
- ❌ No prod env / secret change.
- ❌ No secret / password / JWT in any report.
- ❌ No Railway redeploy (this overnight was FE + docs only).
- ❌ No UX / copy / "controlled pilot vs investor vs public
  launch" disclaimer change.
- ❌ No force-push.
- ❌ No `.env` / token committed.
- ❌ No public launch messaging — every doc says "controlled
  pilot" or "investor demo" only when explicitly referenced.
- ❌ Workflow file change attempted and **abandoned** (kept
  stashed locally + doc-only) when the PAT scope rejection
  hit.

## Blockers / handoffs for the human follow-up

1. **PAT scope for `.github/workflows/smoke.yml`** — the
   proposed CI hardening change is stashed locally under
   `ci-hardening-pending-pat-scope`. A human with the
   `workflow` PAT scope (or the GitHub web UI) can pop the
   stash + push, or paste the YAML from
   `docs/P1_CI_HARDENING_2026-05-26.md` directly.
2. **Vercel `.vercel/project.json` linkage** — points at the
   wrong project. Safe to fix during a maintenance window
   after reconciling `docs/VERCEL_PRODUCTION_BRANCH.md`.
   Day-to-day push-to-deploy already works via the `twin`
   project's Git hook.
3. **Phase 1 security backlog** — 10-item queue documented
   in `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`. Top
   priority: drop `Content-Security-Policy-Report-Only`
   to enforced CSP, replace `localStorage` token with
   httpOnly cookie. Both require multi-step rollout with a
   human observer.
4. **Phase 1 observability backlog** — 10-item queue
   documented in `docs/P1_OBSERVABILITY_PLAN_2026-05-26.md`.
   Three safe no-op hooks ready to drop in any sprint;
   none committed by this run.

## Final verdicts

| Audience                                  | Verdict      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Controlled pilot (≤50 candidates)**     | **GO**       | Dashboard refactor stabilised at 435 LoC composition over 8 hooks; smoke 200 across `/`, `/dashboard`, `/login`, `/register`, `/waitlist`, `/api/public-health`; backend health green (`db_ok`, `celery worker_active`, `validated_jobs=652`); idempotency + `human_acknowledged` on every auto-apply path; `SCRAPE_RESPECT_ROBOT=1`; documented incident response (Vercel runbook, CI hardening, security + observability backlogs). Hand-on-the-stop button available via Vercel UI. |
| **Investor demo / due diligence**         | **GO with caveats** | All the above, plus: documented LoC trajectory (~1.2k → 435), documented placement-state machine (`docs/PLACEMENT_VERIFICATION.md`), documented matching-quality gate (`docs/MATCHING_QUALITY_GATE.md`), documented audit results (`docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` + `docs/CTO_AUDIT_P0_FOLLOWUP_2026-05-26.md`). Caveats to share: CSP is report-only (Phase 2 lift), JWT is localStorage (Phase 2 lift to httpOnly cookie), no centralized log aggregation yet. |
| **Public launch (open candidate signup)** | **NO-GO**    | Required gates not yet met: (i) CSP must move out of report-only (#1 in security backlog); (ii) auth token must move to httpOnly cookie (#2); (iii) `npm audit` + `pip-audit` baseline must be wired (#8); (iv) cookie-consent / analytics gating audited (#9); (v) edge rate-limit on candidate mutations (#4); (vi) Stripe webhook signature audit (#6). Estimated 1-2 sprints. The pilot tier above is sufficient to keep candidate intake moving while these gates land.            |

— end —
