# TWIN full audit — 2026-05-23

**Auditor:** Claude (Cursor agent)  
**Branch audited:** `cursor/phase1-monorepo-scaffold` @ `70c9e8ccb81ef3fd2b7efcc3f6a3ac1c441055c5`  
**Production git_commit (Railway API):** `65ff3ece62c6d99f6ed0a0940e6aa7092e6388cd`  
**Production git_commit (Vercel proxy):** `70c9e8ccb81ef3fd2b7efcc3f6a3ac1c441055c5`  
**Production checked:** yes (live curl 2026-05-23 ~12:04 UTC)

---

## Executive summary

**TWIN Phase 1 MVP jest na produkcji i nadaje się do demo inwestorskiego — z kilkoma warunkami.** Silnik działa: API Railway zwraca `status: ok`, baza ma **637 ofert**, worker Celery i beat nightly auto-apply są aktywne, Google Calendar jest skonfigurowany, a strona Vercel buduje się lokalnie bez błędów. **Dobra wiadomość względem audytu z rana:** endpoint `GET /api/v1/demo/snapshot` zwraca teraz **HTTP 200** z danymi demo (wcześniej 500) — publiczna „live feed” na `/demo` powinna działać.

**Co blokuje pełny „wow” bez inżyniera:** (1) **Stripe** i **LinkedIn OAuth** — kod jest w repo, ale na Railway brakuje kluczy (`stripe_checkout_ready: false`, `linkedin_oauth_configured: false`) — to **Twoje wklejenie w panelu Railway**, nie brak produktu. (2) **Railway API jest 2 commity za Vercel/GitHub** — najnowsze slice’y backendu (match reasons, recruiter inbox) nie są jeszcze na API prod; warto **Redeploy API** na `70c9e8c`. (3) Baza demo jest cienka (**1 aplikacja**, **1 interview**) — seed z runbooka wzmocni narrację logged-in.

**Dojrzałość produktu + inżynierii: 8 / 10.** Testy: **326 passed**, 2 failed (PDF font asset, seed idempotency — nie blokuje prod). **Demo readiness: TAK Z WARUNKAMI** — statyczne strony, metryki inwestora, `/demo`, kalendarz Google: tak; płatności kartą i login LinkedIn: dopiero po kluczach.

---

## P0 blockers

| # | Blocker | Evidence | Owner | ETA hint |
|---|---------|----------|-------|----------|
| 1 | **Stripe Checkout wyłączony na prod** | `health?ops=1` → `stripe_checkout_ready: false`; `mvp-stats.stripe_checkout_ready: false` | **Founder** — wkleić `STRIPE_SECRET_KEY`, price IDs, webhook secret w Railway | ~30 min + redeploy |
| 2 | **LinkedIn login wyłączony na prod** | `mvp-stats.linkedin_oauth_configured: false`; kod w `backend/app/api/auth.py` | **Founder** — `LINKEDIN_CLIENT_ID/SECRET` w Railway | ~30 min + redeploy |
| 3 | **Railway API deploy lag** | Repo/Vercel `70c9e8c`; Railway health `65ff3ec` (brakuje `b83bed0`, `70c9e8c`) | **Engineering / Founder** — Redeploy API na Railway | ~15 min |
| 4 | **Cienkie dane demo w DB** | `mvp-stats`: 1 application, 1 interview, 3 users | **Engineering** — `scripts/seed-investor-demo.py` per `docs/INVESTOR_DEMO_RUNBOOK.md` | ~1 h |

*Uwaga: punkty 1–2 są **znane i oczekiwane** (patrz `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md`) — nie traktować jako „niespodzianki”. Nie są P0 dla demo stron statycznych; są P0 dla pełnej ścieżki płatności / LinkedIn.*

---

## Production drift

| Layer | Expected SHA | Live SHA | Notes |
|-------|--------------|----------|-------|
| GitHub `cursor/phase1-monorepo-scaffold` | `70c9e8c` | `70c9e8c` | Remote = local HEAD at audit time |
| Railway API | `70c9e8c` | `65ff3ece…` | **Lag 2 commits** — API behind frontend |
| Vercel Production (proxy health) | `70c9e8c` | `70c9e8c` | Frontend aligned with GitHub |
| Demo snapshot vs prior audit | 200 OK | 200 OK | **Fixed** — was 500 in `AUDIT_RESULTS_2026-05-23.md` |

**Commits on API but not on Railway:** `b83bed0` (match reasons, recruiter inbox), `70c9e8c` (marketing homepage width — frontend-only impact on API).

---

## Security & GDPR

- **Auth/session:** JWT via `get_current_user` on protected routes (`backend/app/core/deps.py`); login/forgot/reset rate limits via `slowapi` + `login_rate_limit.py`. Session proxy through Vercel rewrites — **Shipped**.
- **Webhooks (Stripe, ATS):** Stripe webhook handler in repo; **not live** without `STRIPE_WEBHOOK_SECRET`. ATS secrets optional (`GREENHOUSE_WEBHOOK_SECRET`, etc.) — **Partial**.
- **IDOR / multi-tenant:** Applications, calendar, placement use `current_user` scoping; recruiter inbox token-gated (`RECRUITER_INBOX_TOKEN` configured on prod). Employer placement uses one-time tokens — **Shipped** with tests in `backend/tests/`.
- **Secrets in API responses:** Ops health exposes **boolean flags and redirect URIs only** — no secret values. `GET /api/v1/health/features` correctly absent (404 per brief).
- **Scraping compliance:** LinkedIn jobs blocked when `SCRAPE_RESPECT_ROBOTS_TXT=true` (default); no mass profile harvest in codebase — **Compliant with brief constraints**.
- **Cookie/consent:** `cookie-consent-banner.tsx`, GDPR at register, `consent/gdpr` page — **Shipped**.
- **CORS:** `CORSMiddleware` in `main.py`; origins from `CORS_ORIGINS` env — **Configured** (prod must include `https://twin-sooty.vercel.app`).
- **Repo secrets scan:** No live `sk_live_*` keys in repo — only docs/examples and test fixture `sk_live_test` in `test_startup_validation.py` — **PASS**.

---

## UX — founder readability

- **Can demo in 15 min without terminal?** **Yes with conditions** — marketing, `/demo`, `/investor`, `/status`, hub firmy, FAQ, cennik 4.99/9.99, kalkulator 25% net take: **tak**. Logged-in candidate z pełną historią: **lepiej po seedzie**. Płatności / LinkedIn: **powiedz „wklejam klucze w Railway”**.
- **Pages that confuse or expose broken copy:**
  - `/auth/signup` → **404**; canonical URL is **`/register`** (200) — dokumentować w runbooku, nie naprawiać jako bug.
  - Billing UI shows “Payments launching soon” when Stripe off — **intentional** per founder report.
  - Microsoft login **absent from UX** — intentional (founder declined).
- **i18n gaps (PL/EN):** Core flows use `t()` / `i18n.ts`; match reason strings added (`matchReasonTitle`). No systematic literal scan in this audit — spot-check PASS on dashboard/recruiter inbox.

---

## Technical debt

| Area | Debt | Severity | Suggested slice |
|------|------|----------|-----------------|
| Deploy | Railway API 2 commits behind Vercel | **Medium** | Redeploy API service on push hook |
| Tests | 2 pytest failures (PDF font path, seed idempotency) | **Low** | Fix NotoSans asset check; stabilize seed test |
| Demo data | 1 application / 1 interview on prod | **Medium** | Run investor demo seed on Railway |
| Calendar | Microsoft Graph secrets empty | **Low** (Phase 1) | Founder Azure app + Railway vars |
| Billing | Stripe not wired on prod | **High** for monetization | Founder Stripe dashboard paste |
| OAuth | LinkedIn keys missing | **Medium** | Founder LinkedIn Developers paste |
| Deprecations | `datetime.utcnow()` warnings in tests | **Low** | Migrate to timezone-aware UTC |
| npm | `napi-postinstall` fails without `--ignore-scripts` on some machines | **Low** | Document CI/local install flag |

---

## Feature inventory summary

| Area | Shipped | Partial | Missing |
|------|---------|---------|---------|
| **Auth** | Email/password, JWT session, password reset, recruiter/investor register, demo user | LinkedIn OAuth (code, no prod keys), email verification flow | Microsoft login (removed from UX by design) |
| **Jobs/scrape** | pracuj.pl, rocketjobs.pl, scrape-all, 30-board registry, Celery worker+beat, GDPR scrape gate, dashboard job list | Global boards stability, LinkedIn adapter (robots-blocked) | 100k jobs in DB (out of scope) |
| **Matching** | Profile/CV, job_matches scoring, applications tracking, match_reason UI, acceptance queue page | Live match reasons on prod API until Railway redeploy | — |
| **Auto-apply** | Consent gates, nightly beat, last-run UI, premium gate logic | Headless apply (`AUTO_APPLY_HEADLESS`), users with consent on prod | — |
| **Calendar** | Google OAuth (prod configured), scheduled_interviews, ICS/WebCal, meeting link helpers | Microsoft OAuth (no secrets), Meet/Teams metadata partial | — |
| **Billing** | Checkout API code, pricing pages $4.99/$9.99, billing UI | Stripe prod keys, webhooks, live premium gates | — |
| **Placement** | State machine, placement_events, employer attestation, 25% net narrative in calculator | Cash-out/KYC Authologic, ATS webhooks live | Lever OAuth live (stub) |
| **Recruiter** | Token-gated inbox, batch respond, jobs CRUD | Greenhouse OAuth partial | Lever OAuth prod |
| **Employer hub** | 9 rich tabs on `(marketing)/for-companies`, placement employer pages | — | — |
| **Marketing** | Landing, FAQ (no teasers), waitlist, compare pages, first-1000, careers/partners | — | — |
| **Investor** | Metrics, calculator (25% net), data room (local demo), placement lane | S3 data room (`data_room_s3_enabled: false`) | — |
| **Demo** | `DEMO_MODE_ENABLED`, snapshot API **200**, seed scripts + runbooks | Thin prod DB counts | — |
| **i18n/GDPR** | PL/EN, X-Locale, cookie banner, privacy/terms, GDPR register consent | Full literal audit not run | — |

---

## Recommended next 2 weeks

1. **Founder:** Paste Stripe + LinkedIn env vars in Railway → redeploy API (unblocks billing + social login demo).
2. **Engineering:** Redeploy Railway API to `70c9e8c` — align with Vercel; verify match reasons on prod inbox.
3. **Engineering:** Run `seed-investor-demo.py` on prod DB (password from vault) — richer demo narrative.
4. **Engineering:** Fix 2 failing pytest tests (PDF font asset, seed idempotency) — keep CI green.
5. **Product:** Verify `/demo` cinematic feed with live snapshot in browser (now 200).
6. **Product:** Smoke Playwright `frontend/e2e/smoke.spec.ts` in CI on scaffold branch.
7. **Founder:** Confirm Vercel Production Branch = `cursor/phase1-monorepo-scaffold` (no `main` on remote).
8. **Roadmap:** Microsoft Calendar Azure app + Railway secrets (corporate calendar slice).
9. **Roadmap:** Placement verification happy-path demo with employer one-click attestation.
10. **Do not:** Mass LinkedIn scrape, 100k jobs sprint, or new fee math — per audit brief constraints.

---

## Appendix

### Commands run

```bash
git checkout cursor/phase1-monorepo-scaffold
git log -1 --format='%H %ci %s'
git rev-parse HEAD

# Production (read-only)
API="https://twin-production-bcd9.up.railway.app"
FE="https://twin-sooty.vercel.app"
curl -sS "$API/api/v1/health"
curl -sS "$API/api/v1/health?db=1&ops=1"
curl -sS "$API/api/v1/health/celery-status"
curl -sS "$API/api/v1/public/mvp-stats"
curl -sS -o /dev/null -w "%{http_code}" "$API/api/v1/demo/snapshot"
curl -sS -o /dev/null -w "%{http_code}" "$FE/status"
curl -sS "$FE/api/v1/health"

# Frontend
cd frontend && npm ci --ignore-scripts && npx tsc --noEmit && npm run build

# Backend
cd backend && python3 -m pytest tests -q --tb=line
python3 scripts/audit-list-api-routes.py

# Security grep
rg 'sk_live' --glob '*.{py,ts,tsx,env*}'
```

Reusable helper: `scripts/run-production-audit.sh`

### Health JSON snapshot (sanitized — no secrets)

**`GET /api/v1/health`**

```json
{
  "status": "ok",
  "service": "twin-api",
  "git_commit": "65ff3ece62c6d99f6ed0a0940e6aa7092e6388cd"
}
```

**`GET /api/v1/health?db=1&ops=1`**

```json
{
  "status": "ok",
  "service": "twin-api",
  "git_commit": "65ff3ece62c6d99f6ed0a0940e6aa7092e6388cd",
  "db_ok": true,
  "mail_configured": true,
  "google_calendar_configured": true,
  "microsoft_calendar_configured": false,
  "stripe_checkout_ready": false,
  "scrape_worker_ready": true,
  "scrape_beat_enabled": true,
  "celery_task_always_eager": false,
  "recruiter_inbox_configured": true,
  "ops_admin_configured": true,
  "partner_export_configured": true
}
```

**`GET /api/v1/health/celery-status`**

```json
{
  "celery_task_always_eager": false,
  "broker_configured": true,
  "nightly_auto_apply_beat_enabled": true,
  "beat_schedule_has_nightly": true,
  "worker_active": true,
  "worker_nodes": ["celery@c2dcb22a5bd9"]
}
```

**`GET /api/v1/public/mvp-stats`**

```json
{
  "validated_jobs": 637,
  "registered_users": 3,
  "total_applications": 1,
  "verified_placements": 0,
  "interviews_scheduled": 1,
  "profiles_with_cv": 2,
  "job_boards_in_registry": 30,
  "database_reachable": true,
  "linkedin_oauth_configured": false,
  "stripe_checkout_ready": false,
  "mail_configured": true,
  "google_calendar_configured": true,
  "microsoft_calendar_configured": false
}
```

**Demo snapshot:** HTTP **200** — `demo_mode: true`, `source: live_db`, candidate + top_matches present.

**Vercel proxy health:** `git_commit: 70c9e8ccb81ef3fd2b7efcc3f6a3ac1c441055c5`

### Test counts

| Metric | Value |
|--------|-------|
| Collected | 329 |
| **Passed** | **326** |
| Failed | 2 (`test_application_package_pdf`, `test_investor_demo_seed_idempotent`) |
| Skipped | 1 |
| Duration | ~325 s |

### Build

| Check | Result |
|-------|--------|
| `npm ci --ignore-scripts` | OK |
| `npx tsc --noEmit` | OK |
| `npm run build` (Next.js 16) | **PASS** — 78 routes |

### Route count

**180** FastAPI routes (`scripts/audit-list-api-routes.py`)

### Alembic HEAD

`044_ats_oauth_tokens_data_room_key` (down: `043_data_room_upload_metadata`)

### ORM tables (39)

`users`, `candidates`, `jobs`, `job_matches`, `applications`, `scheduled_interviews`, `placement_events`, `auto_apply_*`, career assistant tables, referrals, recruiter ATS, data room, etc. — full list via `Base.metadata.tables` in audit run.

### Known issues cross-check (§6 brief — not rediscovered)

| Issue | Prior status | Re-verified |
|-------|--------------|-------------|
| Stripe keys not in Railway | Expected | Still `stripe_checkout_ready: false` |
| LinkedIn OAuth not in Railway | Expected | Still `linkedin_oauth_configured: false` |
| Microsoft calendar secrets empty | Expected | Still `microsoft_calendar_configured: false` |
| No `main` branch | Expected | Production uses scaffold branch |
| 100k jobs | Out of scope | 637 jobs — honest |
| Mass LinkedIn profiles | Rejected | Not recommended |
| `demo/snapshot` 500 | Prior audit | **Fixed — HTTP 200** |
| `/auth/signup` 404 vs `/register` 200 | Known | Confirmed |
| Thin demo DB | Known | 1 app, 1 interview (slight improvement vs 0 interviews) |

---

*Generated: 2026-05-23 — autonomous audit per `docs/CLAUDE_FULL_AUDIT_BRIEF.md` and founder execution plan steps 1–10.*
