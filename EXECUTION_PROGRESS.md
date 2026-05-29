# TWIN — 100 tasks execution progress

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Updated:** 2026-05-23 (night autonomous slice)

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

- [~] **01** Stripe live — MCP sandbox has prices; Railway still missing `STRIPE_SECRET_KEY`; **`docs/STRIPE_RAILWAY_SETUP.md`** + **`scripts/railway-apply-stripe-env.sh`** added
- [x] **02** LinkedIn OAuth on prod — applied via Railway CLI 2026-05-23; `linkedin_oauth_configured: true`
- [—] **03** Microsoft calendar — `MICROSOFT_CLIENT_*` empty in `.env.railway`; skipped
- [x] **05** Celery worker + beat — service `enthusiastic-encouragement`; `worker_active: true` on prod
- [x] **07** Health dashboard `/status` — LinkedIn, Celery, beat, recruiter inbox flags (2026-05-23)
- [x] **44** Recruiter inbox batch accept/decline — multi-select UI + `respond-batch` API
- [x] **59** Placement verification UI stepper on dashboard applications
- [x] Investor metrics — `paid_subscribers`, `subscription_mrr_usd` stub when Stripe off
- [x] WebCal regeneration polish — expiry + HTTPS preview on calendar page
- [ ] **18** Nightly auto-apply prod verification (02:00 UTC)
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

## Evening ops (2026-05-23)

| Check | Result |
|-------|--------|
| API `git_commit` | `c5ae7b9` (matches scaffold HEAD) |
| Vercel proxy `git_commit` | `6960c83` → **pending redeploy** after this push |
| `linkedin_oauth_configured` | **true** (Railway vars set + redeploy) |
| `stripe_checkout_ready` | **false** (no `STRIPE_*` on Railway; setup doc + apply script shipped) |
| Celery | `worker_active: true`, beat schedules firing |
| Demo verify script | **PASS** (`live_db`, 5 top matches in snapshot) |
| pytest fixes | PDF locale `pl`; seed idempotent expects 7 demo jobs |
| Audit branch merge | **N/A** — scaffold ahead of `cursor/audit-and-mvp-slices-may23` by `c5ae7b9` |

## Founder-only blockers (remaining)

1. Paste **Stripe** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + price IDs on Railway (test: `price_1TZtVB…` Premium, `price_1TZtVf…` Pro in sandbox).  
2. Paste **Microsoft Graph** calendar OAuth on Railway API.  
3. **Vercel** production branch + redeploy (`vercel`/`gh` CLI not on agent host — use dashboard or add token).  
4. **Demo password** for re-seed: set `INVESTOR_DEMO_PASSWORD` on Railway, then `railway run python3 scripts/seed-investor-demo.py --reset-password`.  
5. Optional: rename worker service `enthusiastic-encouragement` → `twin-worker`; set **S3** vars for data room bytes on prod.
