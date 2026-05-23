# TWIN production audit — investor demo readiness

**Date:** 2026-05-22  
**Branch audited:** `cursor/phase1-monorepo-scaffold`  
**Auditor:** autonomous agent (Phases 1–6)  
**Production API:** https://twin-production-bcd9.up.railway.app  
**Production frontend:** https://twin-sooty.vercel.app  

---

## Executive summary

TWIN’s **platform layer is production-healthy**: API `status=ok`, Postgres reachable, Celery worker + nightly auto-apply beat active, scrape worker ready, mail + Google Calendar configured, and **174 REST routes** ship including the full **US-C051–057 career assistant** surface. Frontend **`npm run build` succeeds** with all investor-demo routes present (dashboard, calendar, referrals, investor lane, recruiter inbox, `/demo`, logins).

The **logged-in investor walkthrough is not demo-ready on production without a one-time seed**. Live checks show `GET /demo/snapshot` → `source: static_fallback`, `demo_user_configured: false`, and `mvp-stats` reports **0 applications / 0 interviews / 0 profiles_with_cv** despite **637 validated jobs** and **2 registered users**. That matches an unseeded or misconfigured `DEMO_USER_EMAIL` on the API service—not missing code.

**Overall demo readiness score: 74 / 100** (pre-seed prod) · **~90–95 / 100 after seed** (see below)

| Area | Score | Notes |
|------|------:|-------|
| Backend API & services | 86 | 174 routes; career assistant + placement + auto-apply implemented |
| Database & migrations | 82 | Alembic HEAD `044`; local DB down—verified via prod `db_ok` |
| Demo data (prod) | 42 | Static snapshot; seed script exists but not applied to prod |
| Frontend | 84 | Build green; modals, nightly strip, persona switcher wired |
| Infrastructure / Celery | 90 | `verify-prod-health.sh` all critical flags OK |
| Automated tests | 88 | 288 passed / 0 failed / 1 skipped (full suite ~5m; fixes 2026-05-23) |
| Integrations (calendar, billing, ATS) | 62 | Google ✅; Microsoft ❌; Stripe ❌; GH OAuth env-dependent |

### Go / no-go (one sentence)

**GO** for a **no-login** marketing demo (`/demo` + static snapshot) and **GO-WITH-CONDITIONS** for the **full logged-in script** only after `seed-investor-demo.py` against production `DATABASE_URL` and `DEMO_USER_EMAIL` on Railway API—otherwise **NO-GO** for live DB dashboard/calendar/recruiter steps.

### Score after seed (~95 / 100)

| Area | Post-seed | Notes |
|------|----------:|-------|
| Demo data (prod) | 92 | `verify-investor-demo-ready.sh` exit 0: `live_db`, apps ≥ 1, interviews ≥ 1 |
| Overall | **~95** | Stripe / Microsoft still out of scope for runbook |
| Remaining user-only | — | Seed + optional Google Calendar connect on demo account |

Verify: `./scripts/verify-investor-demo-ready.sh` (after `railway run … seed-investor-demo.py`).

---

## Top 3 blockers

1. **Production demo user not seeded** — `mvp-stats`: `total_applications: 0`, `interviews_scheduled: 0`; `/demo/snapshot` → `static_fallback` (no real IDs).
2. **`DEMO_USER_EMAIL` not configured on prod API** — snapshot field `demo_user_configured: false` (runbook expects `demo@twin.career`).
3. **Secondary integration gaps** (non-fatal for runbook): `microsoft_calendar_configured: false`, `stripe_checkout_ready: false`, `linkedin_oauth_configured: false` — demo explicitly skips Stripe.

---

## Phase 1 — Backend

### Alembic / migrations

| Check | Result |
|-------|--------|
| `alembic current` (local) | **Skipped** — Postgres not running on `127.0.0.1:5433` |
| HEAD from files | `044_ats_oauth_tokens_data_room_key` |
| Migrations 039–044 | Present and chained |

| Rev | File | Tables / purpose |
|-----|------|------------------|
| 039 | `039_company_intelligence_cache.py` | `company_intelligence_cache` (US-C051) |
| 040 | `040_career_assistant_tables.py` | `optimized_cvs`, `interview_prep_sessions`, `salary_negotiations`, `follow_up_emails`, `hiring_insights_cache`, `linkedin_optimizations` |
| 041 | `041_referral_cash_out_requests.py` | `referral_cash_out_requests` |
| 042 | `042_recruiter_ats_oauth_connections.py` | `recruiter_ats_oauth_connections` |
| 043 | `043_data_room_upload_metadata.py` | `data_room_document_metadata` |
| 044 | `044_ats_oauth_tokens_data_room_key.py` | OAuth token columns + data room key fields |

Prod DB reachability: `mvp-stats.database_reachable: true`, health script `db_ok: true`.

### Table inventory vs checklist

Source: `backend/app/database/models.py` + migrations 039–044.

| Checklist table | Model / migration | Status |
|-----------------|-------------------|--------|
| users | `User` | ✅ |
| candidates | `Candidate` | ✅ |
| jobs | `Job` | ✅ |
| job_matches | `JobMatch` | ✅ |
| applications | `Application` | ✅ |
| scheduled_interviews | `ScheduledInterview` | ✅ |
| auto_apply_consents / runs / events | `AutoApplyConsent`, `AutoApplyRun`, `AutoApplyEvent` | ✅ |
| company_intelligence_cache | `CompanyIntelligenceCache` (039) | ✅ |
| referrals | `AccountReferral`, `ReferralPayout`, `ReferralCashOutRequest` | ✅ |
| career assistant tables | 040 + caches | ✅ |
| placement_events | `PlacementEvent` | ✅ |
| recruiter_ats_oauth_connections | 042 | ✅ |
| data_room_document_metadata | 043 | ✅ |

### API routes

- **Count:** 174 method+path pairs (excludes HEAD/OPTIONS).
- **Generator:** `python3 scripts/audit-list-api-routes.py` (from repo root).
- **Career assistant prefix:** `/api/v1/career-assistant/*` + `POST /api/v1/jobs/{job_id}/research`.
- **Demo:** `GET /api/v1/demo/snapshot`.
- **Ops:** `GET /api/v1/ops/auto-apply/last-run` (token).
- **Note:** `GET /api/v1/celery-status` returns **404**; correct path is **`GET /api/v1/health/celery-status`**.

### Production curl (2026-05-22)

| Endpoint | HTTP | Highlights |
|----------|------|------------|
| `/api/v1/health` | 200 | `git_commit`: `eec534db3bcec90e2921fbb3d9ada9024b93abbf` |
| `/api/v1/health?ops=1` | 200 | mail ✅, google cal ✅, MS cal ❌, stripe ❌, scrape worker ✅, beat ✅ |
| `/api/v1/health/celery-status` | 200 | `worker_active: true`, `nightly_auto_apply_beat_enabled: true` |
| `/api/v1/public/mvp-stats` | 200 | 637 jobs, 2 users, **0 apps**, **0 interviews**, data_room_local_demo |
| `/api/v1/demo/snapshot` | 200 | `demo_mode: true`, **`static_fallback`**, `demo_user_configured: false` |

### Targeted pytest

```text
pytest -k "career_assistant or company_intelligence or seed or demo_snapshot or integrations"
25 passed, 264 deselected (~5s)
```

### Full pytest (reference)

```text
288 passed, 0 failed, 1 skipped (~317s)  # 2026-05-23 after admin_metrics / authologic / beat test fixes
```

Previously failing (fixed):

- `test_kyc_authologic.py::test_kyc_start_persists_conversation` — missing `authologic_api_base_url` on Settings
- `test_product_feedback.py::test_feedback_and_admin_flow` — duplicate `Application` import in `admin_metrics.py`
- `test_scrape_all_boards.py::test_celery_beat_has_no_scheduled_scrapes` — assert no scrape beat entries (non-scrape beats OK)

### Services audit (`backend/app/services`)

**88 Python modules** under `services/` (including `career_assistant/`). Summary:

| Category | Implemented (MVP+) | Stub / gated |
|----------|-------------------|--------------|
| Career assistant (7) | `company_intelligence`, `career_assistant/*`, `career_assistant_common` | Claude fallbacks when no API key |
| Auto-apply | `auto_apply_service`, `nightly_auto_apply`, `auto_apply_guards` | Premium gate env-driven |
| Calendar | `google_calendar_*`, `microsoft_calendar_*`, `ics_export`, `calendar_scheduling` | MS needs Railway secrets |
| Placement | `placement_verification`, `placement_retention_mail`, `admin_placement_queue` | — |
| ATS / recruiter | `greenhouse_oauth`, `ats_oauth`, `recruiter_inbox`, `recruiter_jobs` | `lever_oauth` raises `NotImplementedError`; `ats_oauth_stub` alias |
| Demo / metrics | `demo_snapshot`, `investor_demo_seed`, `mvp_public_metrics` | — |
| Billing | `stripe_billing` | `stripe_checkout_ready: false` on prod |
| Scraping / jobs | `job_storage`, `job_matching_v2`, `matching_service` | Board-specific scrapers in tasks |
| Auth / mail | `google_oauth`, `mail`, `email_verification`, etc. | LinkedIn OAuth off on prod |

### Celery tasks (`app/tasks/celery_app.py`)

| Module | Tasks |
|--------|-------|
| `scrape_tasks` | pracuj, rocketjobs, justjoin, praca, linkedin, global boards, `scrape_all_boards_task` |
| `nightly_auto_apply` | `nightly_auto_apply_sweep` (beat 02:00 configurable) |
| `reminder_tasks` | interview reminder email + hourly sweep |
| `placement_tasks` | `placement_retention_sweep` |
| `notification_tasks` | welcome email, weekly digest sweep |

Beat schedule includes nightly auto-apply when `nightly_auto_apply_beat_enabled` (prod: **true** per health).

---

## Phase 2 — Frontend

### Route inventory (`page.tsx`)

**Expected demo routes — all present:**

| Route | Path |
|-------|------|
| Dashboard | `/dashboard` |
| Calendar | `/dashboard/calendar` |
| Referrals | `/dashboard/referrals`, `/dashboard/referrals/cash-out` |
| Auto-apply settings | `/dashboard/settings/auto-apply` |
| Investor | `/investor`, `/investor/metrics`, `/investor/placement`, `/investor/data-room` |
| Recruiter | `/recruiter/inbox`, `/recruiter/integrations/ats`, `/recruiter/jobs` |
| Demo (marketing) | `/(marketing)/demo` → `/demo` |
| Login | `/login/candidate`, `/login/investor`, `/login/recruiter` |

**Build:** `npm run build` — **success** (Next.js 15 app router).

### UI surfaces verified in code

| Surface | Location |
|---------|----------|
| Career assistant modals | `company-intelligence-modal.tsx`, `career-assistant-modals.tsx` (hiring insights, interview prep, follow-up, salary, LinkedIn) |
| Dashboard wiring | `dashboard/page.tsx` — `CompanyIntelligenceModal`, `HiringInsightsModal`, CV optimize hooks |
| Nightly auto-apply strip | `nightly-auto-apply-strip.tsx` on dashboard |
| Persona switcher | `persona-switcher.tsx` + investor/recruiter layouts |

---

## Phase 3 — Infrastructure

### `scripts/verify-prod-health.sh`

**Result:** `Prod health: all critical flags OK`

- `status=ok`, `db_ok=True`
- `celery_task_always_eager=False`, `scrape_worker_ready=True`
- Celery `worker_active=True` via `/health/celery-status`
- Frontend `/status` HTTP 200

### URLs (from docs, no secrets)

| Service | URL |
|---------|-----|
| API (Railway) | https://twin-production-bcd9.up.railway.app |
| Frontend (Vercel) | https://twin-sooty.vercel.app |
| API via proxy | https://twin-sooty.vercel.app/api/v1/… |

### Production env flags (`health?ops=1` / `mvp-stats`)

| Flag | Prod value |
|------|------------|
| `mail_configured` | true |
| `google_calendar_configured` | true |
| `microsoft_calendar_configured` | false |
| `stripe_checkout_ready` | false |
| `scrape_worker_ready` | true |
| `scrape_beat_enabled` | true |
| `celery_task_always_eager` | false |
| `recruiter_inbox_configured` | true |
| `ops_admin_configured` | true |
| `linkedin_oauth_configured` | false (mvp-stats) |
| `data_room_s3_enabled` | false |
| `data_room_local_demo` | true |

Nightly verify doc: `docs/ops/nightly-verify-2026-05-22.md` — beat ran 2026-05-22 with `total_users_processed: 0` (expected without consented users).

---

## Phase 4 — Gap analysis

### Six demo pillars → reality

| Pillar | North-star fit | Prod / code status |
|--------|----------------|-------------------|
| 1. Ranked matching | Fewer noisy apps → acceptance-ready | ✅ Code + 637 jobs; demo matches need **seed** |
| 2. Autonomous apply | Async while away | ✅ API + Celery beat; strip needs seeded consent/run |
| 3. Calendar of moments | Slots worth showing up for | ✅ ICS + Google; seeded interview **missing on prod** |
| 4. Career assistant (7) | Intel reduces spam | ✅ US-C051–057 MVP + tests; needs Claude key for live AI |
| 5. Placement verification | Machine-assisted, not ping-pong | ✅ Events API + investor placement page; seed creates timeline |
| 6. Recruiter / B2B | Batch accept/decline | ✅ Inbox + GH OAuth path; token from `--print-credentials` |

### Runbook 10-step script (logged-in) vs prod

| Step | Runbook | Prod today |
|------|---------|------------|
| 0 Landing `/demo` | Live feed | ✅ `demo_mode` + static snapshot |
| 1 Login `demo@twin.career` | Seeded password | ⚠️ User may exist but **no demo data** |
| 2 Profile / dashboard matches | Match % cards | ⚠️ Empty or thin without seed |
| 3 Optimize CV | Applied row | ⚠️ No applied row in mvp-stats |
| 4 Calendar interview | Seeded +3d | ⚠️ No interviews_scheduled |
| 5 Auto-apply strip | Consent + run | ⚠️ Needs seed + optional manual trigger |
| 6 Investor lane | mvp-stats | ✅ Public metrics page works |
| 7 Recruiter inbox | Token URL | ⚠️ Token only after seed `--print-credentials` |
| 8 Referrals cash-out | Manual copy | ✅ UI (no Stripe Connect) |
| 9 Ops last-run | curl + token | ✅ Beat row exists (0 users processed) |

### Docs alignment

- **`AI_CAREER_ASSISTANT.md`:** All seven stories marked **MVP** — matches code audit.
- **`NEXT_10_STEPS.md`:** Priorities = Railway secrets (MS, Stripe), nightly prod night with real user, ATS OAuth live.
- **North star:** Product reduces noise toward calendar acceptance; unseeded prod **shows marketing fiction** on `/demo`—acceptable only if labeled; logged-in demo must use **live_db**.

### Feature matrix

| Feature | Priority | Status |
|---------|----------|--------|
| Investor seed script | P0 | ✅ Code; ❌ not run on prod |
| Demo snapshot live_db | P0 | ⚠️ static_fallback on prod |
| Career assistant 7 | P0 | ✅ |
| Google Calendar OAuth | P0 | ✅ configured |
| Nightly auto-apply beat | P0 | ✅ worker; 0 users until consent |
| Recruiter batch inbox | P0 | ✅ needs seed token |
| Greenhouse OAuth | P1 | Env-gated |
| Microsoft 365 calendar | P1 | ❌ secrets |
| Stripe checkout | P2 | Skipped in demo |
| Data room S3 uploads | P2 | Local demo mode |
| Lever OAuth live | P2 | Stub |
| LinkedIn OAuth | P2 | Off on prod |

---

## Phase 5 — Testing

| Suite | Result |
|-------|--------|
| Targeted (demo-critical) | **25/25 passed** |
| Full backend | **288 passed, 0 failed, 1 skipped** |

**Coverage gaps (honest):**

- E2E Playwright investor path not run in this audit
- Production seed not exercised against live DB from auditor environment
- Microsoft calendar OAuth flow untested on prod (flag false)
- Stripe webhook/checkout not tested (intentionally out of demo scope)

---

## Phase 6 — Issues / hygiene

### TODO / FIXME

Ripgrep across `*.{py,ts,tsx}`: **no TODO/FIXME markers** in application code (only incidental doc references). Technical debt tracked in `docs/NEXT_10_STEPS.md` and shipping log—not inline tags.

### Shipped features verified (user context)

| Item | Verified |
|------|----------|
| US-C051–057 career assistant | ✅ routes + services + 25 tests |
| `scripts/seed-investor-demo.py` | ✅ + `test_seed_investor_demo.py` |
| `/demo/snapshot` | ✅ prod 200; **not live_db** |
| Nightly verify 2026-05-22 | ✅ doc + beat row |
| Greenhouse OAuth | ✅ code; prod env unknown |
| Data room NDA / demo banner | ✅ `data_room_local_demo` |
| Recruiter inbox | ✅ API + page |
| `git_commit` on health | ✅ `eec534d…` |

### Metrics (API only — no invented DB counts)

From `GET /api/v1/public/mvp-stats` (2026-05-22):

- `validated_jobs`: 637  
- `registered_users`: 2  
- `total_applications`: 0  
- `interviews_scheduled`: 0  
- `verified_placements`: 0  
- `job_boards_in_registry`: 30  

---

## Appendix

- Runbook: [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md)  
- Action plan: [DEMO_PREP_ACTION_PLAN.md](./DEMO_PREP_ACTION_PLAN.md)  
- Script: [INVESTOR_DEMO_SCRIPT.md](./INVESTOR_DEMO_SCRIPT.md)  
- Route helper: `scripts/audit-list-api-routes.py`  
