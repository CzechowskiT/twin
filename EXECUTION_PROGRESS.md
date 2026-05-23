# TWIN — 100 tasks execution progress

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Updated:** 2026-05-23

Legend: `[x]` done this sprint · `[ ]` open · `[~]` partial / docs-only · `[—]` skipped (founder secrets)

---

## Phase 0 — Demo blockers

- [x] **0a** Prod demo verified (`live_db`, `demo_user_configured=true`) via `verify-investor-demo-ready.sh`
- [x] **0a** Seed script + runbook reviewed; local seed skipped (no `DATABASE_URL` in workspace `.env`)
- [x] **0b** `docs/RAILWAY_DEMO_ENV_CHECKLIST.md` — Railway `DEMO_USER_EMAIL` + curl verification
- [x] Commit: `fix(demo): investor demo seed docs and verification`

## Phase 1 — Calendar (code-only)

- [x] **10** WebCal regen + copy UX on calendar page (existing + docs)
- [x] **11** ICS one-click download on calendar + dashboard strip
- [x] **12** Meeting link provider badge (Meet / Teams / Zoom stub)
- [x] **13** Mobile calendar strip CSS (dashboard next-interview)

## Phase 2 — Auto-apply & matching

- [x] **19** Last sweep strip improvements (failed count, relative labels)
- [x] **22** Match explanation line in job list (`match_reason` API)

## Phase 3 — Profile & onboarding

- [x] **31** Career assistant PL empty states (i18n parity)
- [x] **33** Onboarding progress bar with %

## Phase 4 — Marketing & waitlist

- [x] **36** Waitlist funnel tracking (`waitlist_signup`, `waitlist_cta_click`)

## Phase 5 — Recruiter inbox

- [x] **45** Inbox filters (status + search)
- [x] **49** Decline internal note → `recruiter_feedback_raw`

## Phase 6 — E2E & infra

- [x] **84** Playwright smoke: `/demo` snapshot + marketing demo page
- [x] `EXECUTION_PROGRESS.md` (this file)
- [x] `docs/EXECUTION_100_TASKS_PLAN.md` (sanitized founder plan)
- [x] `docs/ROADMAP_100_ACCEPTANCE.md` checkmarks updated

## Phase 7–12 — Backlog (not in this session)

- [ ] **01–03** Stripe live, LinkedIn OAuth, Microsoft calendar (founder Railway secrets)
- [ ] **05** Dedicated `twin-worker` service
- [ ] **18** Nightly auto-apply prod verification (02:00 UTC)
- [ ] **44** Recruiter inbox on prod with live token walkthrough
- [ ] **52** ATS OAuth live
- [ ] **76–77** RocketJobs + scrape corpus
- [ ] **91** Data room S3 bytes

---

## Session counters (2026-05-23)

| Metric | Count |
|--------|------:|
| Roadmap items marked ✅ (cumulative) | ~18 |
| Phase 0 prod seed run locally | 0 |
| Phase 0 prod verify | PASS |
| Commits this session | see `git log` on branch |

---

## Founder-only blockers (top 5)

1. Paste **Stripe** live keys + webhooks on Railway API.  
2. Paste **LinkedIn OAuth** client id/secret + redirect URI on prod.  
3. Paste **Microsoft Graph** calendar OAuth on Railway API.  
4. Set **Vercel Production** branch to `cursor/phase1-monorepo-scaffold` and redeploy.  
5. Create **twin-worker** Railway service (Celery beat + scrape) per `docs/RAILWAY_WORKER_PL.md`.
