# TWIN — Full application audit brief (for Claude / external auditor)

**Version:** 2026-05-23  
**Repo:** `https://github.com/CzechowskiT/twin`  
**Audit branch:** `cursor/phase1-monorepo-scaffold` (there is **no `main`** on remote — this branch **is** production)

---

## Dla foundera (krótko)

Ten plik to **instrukcja dla Claude** (lub innego audytora AI), żeby bez historii czatu zrobił **pełny audyt** TWIN: kod, produkcja, luki, bezpieczeństwo, czytelność dla Ciebie jako non-tech founder. Wklej cały plik do nowej rozmowy z Claude i napisz: *„Wykonaj audyt według tego briefu; wynik zapisz w sekcjach z §7.”* Nie musisz uruchamiać terminala — audytor może sam klonać repo i robić `curl` na produkcję. Sekrety (Stripe, LinkedIn) **nie są** w git — audytor ma to oznaczyć jako „wymaga founder w Railway”, nie jako brak kodu.

---

## 1. Mission for the auditor

### What TWIN is

**TWIN** is an AI-powered **autonomous career agent** (Phase 1 MVP): it scrapes job boards (primarily Polish boards such as pracuj.pl and rocketjobs.pl, plus a registry of other adapters), matches candidates to roles, supports application tracking and **nightly auto-apply** (with consent), and moves toward **interview scheduling** on the candidate’s calendar. Stack: **FastAPI + PostgreSQL + Celery/Redis** on **Railway**, **Next.js** on **Vercel**, **Anthropic Claude** for CV/profile AI. The product targets candidates, recruiters, employers, and investors — with separate marketing and logged-in surfaces.

### North star: calendar of acceptance

The product is **not** “more volume in your inbox.” Outside TWIN, users return from holiday to **random interview spam** or **thousands of raw CVs**. In TWIN they should return to a **short calendar of pre-qualified moments**: candidates see **slots worth showing up for**; recruiters see **profiles already matched to the bar** — **accept / decline / reschedule**, not blind sifting.

**Build toward:** matching + consent + async work while away → ranked pipeline → **scheduled or batch acceptance UI** → calendar export/sync. Every surface should answer: *does this reduce noise toward acceptance-ready calendar items, or add noise?*

### Phase 1 — in scope vs out of scope

| In scope (Phase 1) | Out of scope or explicitly deferred |
|--------------------|-------------------------------------|
| MVP monorepo: API, dashboard, Celery, scrapers for allowed boards | **100k+ real jobs in one sprint** (scale, portal ToS, infra) |
| Email/password auth, GDPR consents, session via JWT | **Microsoft login** (removed from UX; calendar OAuth may be separate) |
| Job scrape registry, manual + scheduled scrape, matching, applications | **Mass LinkedIn profile scraping** or bulk anonymous LinkedIn harvest |
| Google Calendar OAuth (read busy + write where configured) | Full **Microsoft Graph write** until secrets + product slice shipped |
| Auto-apply pipeline (consent-gated), nightly beat | **LinkedIn jobs scrape at scale** when `robots.txt` disallows (default) |
| Recruiter inbox, employer hub (marketing tabs), investor lane | Production **Stripe** / **LinkedIn OAuth** until founder pastes Railway vars |
| Placement verification **design** + partial implementation | “CS tennis” placement confirmation (manual email ping-pong as default) |
| i18n PL/EN (`t()`, `X-Locale`) | Full E2E Playwright investor suite (backlog) |
| Marketing, waitlist, demo mode, public MVP stats | **Lever OAuth** live (stub in code) |

### What a “good audit” should produce

1. **Gap analysis** — per feature area: shipped / partial / missing, with file paths and API routes as evidence.  
2. **Risks** — security, GDPR, scraping compliance, billing webhooks, multi-tenant isolation.  
3. **Production vs repository drift** — Vercel/Railway commit SHA vs `git log`; health flags vs code expectations.  
4. **Security & privacy** — auth, rate limits, secrets in responses, cookie consent, placement events access control.  
5. **UX for a non-technical founder** — can they demo to an investor in 15 minutes without engineering? Plain-language blockers.  
6. **Prioritized backlog** — P0 blockers vs P1/P2; align with `docs/ROADMAP_100_ACCEPTANCE.md` where useful.  
7. **Do not treat known founder-week items as novel discoveries** — see §6.

---

## 2. How to run the audit (step-by-step)

The auditor should execute these steps **without asking the founder to run terminal commands**, unless a step truly requires founder-only secrets (Railway dashboard, Stripe dashboard).

### 2.1 Clone and branch

```bash
git clone https://github.com/CzechowskiT/twin.git
cd twin
git fetch origin cursor/phase1-monorepo-scaffold
git checkout cursor/phase1-monorepo-scaffold
git log -1 --oneline
```

Record: short SHA, date, author message — compare to production `git_commit` from health (below).

### 2.2 Local build and tests (if environment available)

**Frontend** (matches Vercel root `frontend/`):

```bash
cd frontend
npm ci
npm run build
npx tsc --noEmit
```

**Backend** (Python 3.11+, optional Docker Postgres/Redis for DB tests):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Optional: docker compose up -d postgres redis && alembic upgrade head
pytest backend/tests -q
# Route inventory helper (from repo root):
python3 scripts/audit-list-api-routes.py
```

Note: full `pytest` may take several minutes (~300s reported in prior audit). Skipped DB tests are acceptable if Postgres is unavailable — document what was skipped.

### 2.3 Production smoke (read-only `curl`)

Set:

```bash
API="https://twin-production-bcd9.up.railway.app"
FE="https://twin-sooty.vercel.app"
```

| Check | Command | Expect |
|-------|---------|--------|
| API health | `curl -sS "$API/api/v1/health" \| python3 -m json.tool` | `status: ok`, `git_commit` present or `unknown` |
| DB + ops flags | `curl -sS "$API/api/v1/health?db=1&ops=1" \| python3 -m json.tool` | See §3.3 |
| Celery | `curl -sS "$API/api/v1/health/celery-status" \| python3 -m json.tool` | `worker_active: true`, `celery_task_always_eager: false` on prod |
| Public metrics | `curl -sS "$API/api/v1/public/mvp-stats" \| python3 -m json.tool` | `database_reachable`, job/user counts |
| Demo snapshot | `curl -sS -w "\nHTTP %{http_code}\n" "$API/api/v1/demo/snapshot"` | Document status; **known 500** possible — §6 |
| Frontend proxy health | `curl -sS "$FE/api/v1/health" \| python3 -m json.tool` | Same API via Vercel rewrite |
| Status page | `curl -sS -o /dev/null -w "%{http_code}" "$FE/status"` | `200` |

**Optional scripts** (from repo root, non-destructive):

```bash
./scripts/verify-prod-health.sh
./scripts/verify-investor-demo-ready.sh
./scripts/verify-deploy.sh
```

### 2.4 Key URLs to open or HTTP-check (frontend)

| URL | Purpose |
|-----|---------|
| `https://twin-sooty.vercel.app/` | Marketing home |
| `https://twin-sooty.vercel.app/status` | Founder-facing deploy/integration flags |
| `https://twin-sooty.vercel.app/(marketing)/pricing` | Pricing 4.99 / 9.99 USD narrative |
| `https://twin-sooty.vercel.app/waitlist` | Waitlist |
| `https://twin-sooty.vercel.app/(marketing)/demo` | Public demo |
| `https://twin-sooty.vercel.app/register` | Signup (not `/auth/signup`) |
| `https://twin-sooty.vercel.app/login/candidate` | Candidate login |
| `https://twin-sooty.vercel.app/dashboard` | Candidate dashboard (auth required) |
| `https://twin-sooty.vercel.app/dashboard/calendar` | Calendar |
| `https://twin-sooty.vercel.app/dashboard/billing` | Billing / Stripe UI |
| `https://twin-sooty.vercel.app/investor` | Investor lane |
| `https://twin-sooty.vercel.app/recruiter/inbox` | Recruiter inbox |
| `https://twin-sooty.vercel.app/(marketing)/for-companies` | Employer hub entry |
| `https://twin-sooty.vercel.app/consent/gdpr` | GDPR |

Compare rendered copy (PL/EN) to i18n keys — no hardcoded user strings outside `t()` / `i18n.ts` per `docs/I18N.md`.

### 2.5 Critical files and directories to read

**Governance & product intent**

- `.cursorrules` — north star, phase, calendar, placement economics intent  
- `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md` — founder week truth table  
- `docs/ROADMAP_100_ACCEPTANCE.md` — 100 acceptance tasks  
- `docs/PLACEMENT_VERIFICATION.md` — placement state machine (no CS tennis)  
- `docs/DEPLOY.md`, `docs/VERCEL_PRODUCTION_BRANCH.md`, `docs/RAILWAY_PROD_ENV_CHECKLIST.md`  
- `docs/SCRAPING_COMPLIANCE.md`, `docs/I18N.md`, `docs/COOKIE_CONSENT.md`  
- `docs/AUDIT_RESULTS_2026-05-23.md` — **prior** Cursor audit (do not copy blindly — re-verify live)

**Backend entry points**

- `backend/app/main.py` — FastAPI app, router mounts  
- `backend/app/config.py` — settings / env wiring  
- `backend/app/database/models.py` — schema truth  
- `backend/alembic/versions/` — migration HEAD  
- `backend/app/api/` — routes (auth, jobs, calendar, billing, placement, demo, ops, public)  
- `backend/app/services/` — business logic (incl. `career_assistant/`)  
- `backend/app/tasks/` — Celery tasks and beat schedule  
- `backend/tests/` — behavioral contract

**Frontend entry points**

- `frontend/src/app/` — App Router pages (~77 `page.tsx` files)  
- `frontend/src/components/` — UI including marketing, dashboard, waitlist  
- `frontend/src/lib/i18n.ts` — locales  
- `frontend/src/lib/investor-calculator-model.ts` — placement **25% net take** model  
- `frontend/next.config.ts` — rewrites to API

**Deploy**

- `deploy/railway-api.toml`, `deploy/railway-worker.toml`, `deploy/railway-beat.toml`  
- `docker-compose.yml` — local stack

### 2.6 Compare production to repository

1. `git rev-parse --short HEAD` vs `GET /api/v1/health` → `git_commit`.  
2. Vercel → Deployments → latest **Production** commit vs `git rev-parse origin/cursor/phase1-monorepo-scaffold`.  
3. Railway API service deploy SHA (dashboard) vs same.  
4. If drift: classify as **deploy lag**, **wrong branch**, or **wrong GitHub repo** (`CzechowskiT/twin` not `CzechowskiD/twin`).

---

## 3. Production & infrastructure snapshot (May 2026)

| Surface | URL |
|---------|-----|
| **Frontend (Vercel)** | https://twin-sooty.vercel.app |
| **API (Railway)** | https://twin-production-bcd9.up.railway.app |
| **OpenAPI (local only)** | `http://localhost:8000/docs` when API running |

### 3.1 Vercel branch note

- **Production branch must be:** `cursor/phase1-monorepo-scaffold`  
- Remote has **no `main`** — if Vercel Production Branch is `main`/`master`, deploys fail or stay stale.  
- **Root directory:** `frontend/`  
- **Repo:** `CzechowskiT/twin`  
- See: `docs/VERCEL_PRODUCTION_BRANCH.md`

After each push, verify **Production** deployment (not only Preview) received the commit.

### 3.2 Health endpoints

**Basic**

`GET /api/v1/health`

| Field | Meaning |
|-------|---------|
| `status` | Should be `ok` |
| `service` | `twin-api` |
| `git_commit` | Deploy SHA if `GIT_COMMIT_SHA` / `RAILWAY_GIT_COMMIT_SHA` / `VERCEL_GIT_COMMIT_SHA` set; else `unknown` |

**With database**

`GET /api/v1/health?db=1` → adds `db_ok` (boolean, no DSN leaked).

**Ops / integration wiring (no secrets)**

`GET /api/v1/health?ops=1` — implemented in `backend/app/api/health.py`:

| Field | Meaning |
|-------|---------|
| `mail_configured` | Resend or SMTP env present |
| `google_calendar_configured` | Google OAuth client configured |
| `microsoft_calendar_configured` | Microsoft Graph OAuth configured |
| `google_calendar_redirect_uri` | Effective redirect (verify Google Console whitelist) |
| `microsoft_calendar_redirect_uri` | Effective redirect |
| `stripe_checkout_ready` | Stripe secret + price IDs (+ webhook secret in production when Stripe enabled) |
| `scrape_worker_ready` | Worker + broker + `SCRAPE_WORKER_READY` |
| `scrape_beat_enabled` | Beat schedule for scrapes |
| `celery_task_always_eager` | Should be `false` on prod (real async) |
| `recruiter_inbox_configured` | `RECRUITER_INBOX_TOKEN` set |
| `ops_admin_configured` | `OPS_ADMIN_TOKEN` or `BETA_ADMIN_TOKEN` |
| `partner_export_configured` | `PARTNER_EXPORT_TOKEN` set |

**Celery**

`GET /api/v1/health/celery-status`

| Field | Meaning |
|-------|---------|
| `worker_active` | Worker responded to inspect ping |
| `broker_configured` | Redis/broker URL set |
| `nightly_auto_apply_beat_enabled` | Nightly apply feature flag |
| `beat_schedule_has_nightly` | `"nightly-auto-apply"` in beat schedule |
| `celery_task_always_eager` | Should be `false` on prod |

**Public MVP metrics**

`GET /api/v1/public/mvp-stats` — job counts, users, applications, interviews, placements, boards in registry (no PII).

**Removed / do not expect**

- `GET /api/v1/health/features` — **404** (removed; was OAuth flag leak risk)  
- `GET /api/v1/celery-status` — **404** (use `/health/celery-status`)

### 3.3 Railway environment variables (names only)

Full checklist: `docs/RAILWAY_PROD_ENV_CHECKLIST.md`. **Never commit or log secret values.**

**Core API:** `API_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `ENVIRONMENT`, `SECRET_KEY`, `DATABASE_URL`

**Mail:** `RESEND_API_KEY`, `MAIL_FROM`, `SMTP_*`

**Google Calendar:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`

**Microsoft Calendar:** `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`, `MICROSOFT_TENANT`

**LinkedIn OAuth (login):** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` — see `docs/LINKEDIN_OAUTH.md`

**Celery / scrape:** `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL`, `CELERY_TASK_ALWAYS_EAGER`, `SCRAPE_WORKER_READY`, `SCRAPE_BEAT_ENABLED`, `AUTO_APPLY_HEADLESS`

**Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_PRICE_ID_PRO`, `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES`

**Ops:** `OPS_ADMIN_TOKEN`, `BETA_ADMIN_TOKEN`, `RECRUITER_INBOX_TOKEN`, `PARTNER_EXPORT_TOKEN`

**ATS webhooks (optional):** `GREENHOUSE_WEBHOOK_SECRET`, `LEVER_WEBHOOK_SECRET`, `ASHBY_WEBHOOK_SECRET`

**Greenhouse OAuth (optional):** `GREENHOUSE_CLIENT_ID`, `GREENHOUSE_CLIENT_SECRET`, `GREENHOUSE_OAUTH_REDIRECT_URI`, `GREENHOUSE_OAUTH_SCOPES`

**S3 / data room (optional):** `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION`

**AI:** `ANTHROPIC_API_KEY`

**Demo:** `DEMO_MODE_ENABLED`, `DEMO_USER_EMAIL` (and related — see `docs/DEMO_LOGIN_FOR_FOUNDER.md`, `docs/INVESTOR_DEMO_RUNBOOK.md`)

**Scrape ops gate:** `SCRAPE_OPS_EMAILS` and/or `SCRAPE_OPS_USER_IDS`

**Vercel (frontend):** at minimum `NEXT_PUBLIC_API_URL` → Railway API URL

### 3.4 Placement economics (audit constraint)

Commercial baseline coded in `frontend/src/lib/investor-calculator-model.ts` and related copy:

- Employer fee model assumes **50% of employer fee returned to candidate** → **~25% of monthly salary net to TWIN** (not 50% gross).  
- Annual prepay may show **25% discount** on subscription pricing (separate from placement take).  
- Audits should verify **marketing, investor calculator, and placement docs** tell a **consistent** story — not recommend inventing different fee math without founder approval.

---

## 4. Repository map

```
twin/
├── backend/                 # FastAPI, SQLAlchemy, Alembic, Celery, scrapers
│   ├── app/main.py          # API entry
│   ├── app/api/             # HTTP routers
│   ├── app/services/        # Domain logic
│   ├── app/tasks/           # Celery tasks + beat
│   ├── app/database/        # Models + session
│   ├── alembic/versions/    # Migrations
│   └── tests/               # pytest suite
├── frontend/                # Next.js 16 App Router
│   └── src/app/             # Routes (marketing, dashboard, investor, recruiter)
├── docs/                    # Product + deploy + compliance docs
├── scripts/                 # verify-prod-health, seed, deploy helpers
├── deploy/                  # Railway service configs
├── docker-compose.yml       # Local Postgres, Redis, API, worker
└── .cursorrules             # Agent + product north star for contributors
```

**Linked founder / roadmap docs**

| Document | Role |
|----------|------|
| [FOUNDER_TASK_REPORT_2026-05-16_to_today.md](./FOUNDER_TASK_REPORT_2026-05-16_to_today.md) | 59 grouped tasks, prod snapshot, founder-only steps |
| [ROADMAP_100_ACCEPTANCE.md](./ROADMAP_100_ACCEPTANCE.md) | 100 prioritized acceptance items toward north star |
| [PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md) | Placement state machine, anti-patterns |
| [AUDIT_RESULTS_2026-05-23.md](./AUDIT_RESULTS_2026-05-23.md) | Previous automated audit (re-verify, don’t duplicate as “new”) |

### `.cursorrules` summary (for auditors)

- **Roles:** architecture, backend, automation, frontend — all toward one MVP.  
- **North star:** calendar of acceptance, not inbox volume.  
- **Placement:** machine-assisted, in-product verification; avoid manual email ping-pong as default.  
- **Calendar:** Google shipped; Microsoft Graph next; ICS/WebCal universal fallback; meeting links as event metadata.  
- **Phase 1:** Celery, scrapers (pracuj.pl, rocketjobs.pl + registry), matching — minimal first.  
- **Principles:** autonomous-first, GDPR from day 1, validate scraped data, no secrets in logs.  
- **i18n:** no raw user strings outside locale files; `X-Locale` on API calls.

---

## 5. Feature inventory checklist

For each row: mark **Shipped** / **Partial** / **Missing**, cite evidence (route, page, test, health flag). Cross-check `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md`.

### Auth & identity

| Item | Audit notes |
|------|-------------|
| Email/password register + login | |
| Session persistence (JWT, proxy) | |
| Password reset email | `mail_configured` on prod |
| Email verification | |
| LinkedIn OAuth login | Code vs `LINKEDIN_*` on Railway |
| Microsoft login | Founder declined — confirm absent from UX |
| Recruiter / investor register flows | |
| Demo user / seed | `DEMO_USER_EMAIL`, `docs/DEMO_LOGIN_FOR_FOUNDER.md` |

### Jobs & scraping

| Item | Audit notes |
|------|-------------|
| pracuj.pl + rocketjobs.pl adapters | |
| Scrape-all + board registry | |
| robots.txt respect (LinkedIn blocked by default) | `docs/SCRAPING_COMPLIANCE.md` |
| Scrape for all GDPR-consented users | |
| Celery beat / worker for scrape | `scrape_worker_ready`, `worker_active` |
| Job list + detail on dashboard | |
| “100k jobs in DB” | **Out of scope** — report honestly |

### Matching & pipeline

| Item | Audit notes |
|------|-------------|
| Profile + CV upload | |
| Match scoring / job_matches | |
| Applications tracking | |
| “Why this job” explanation UI | |
| Acceptance / ranked pipeline UI | `dashboard/acceptance` |

### Auto-apply

| Item | Audit notes |
|------|-------------|
| Consent gates | |
| Nightly beat + `auto_apply_runs` | |
| Headless apply path | `AUTO_APPLY_HEADLESS` |
| Last sweep / last run UI | |
| Premium gating | Stripe readiness |

### Calendar

| Item | Audit notes |
|------|-------------|
| Google OAuth connect | `google_calendar_configured` |
| Microsoft OAuth | `microsoft_calendar_configured` |
| Scheduled interviews model + UI | |
| ICS / WebCal export | |
| Meet/Teams/Zoom on events | |

### Billing

| Item | Audit notes |
|------|-------------|
| Stripe Checkout session API | `stripe_checkout_ready` |
| Webhook handling | `STRIPE_WEBHOOK_SECRET` |
| Pricing pages 4.99 / 9.99 USD | marketing + `dashboard/billing` |
| Premium feature gates | |

### Placement & referrals

| Item | Audit notes |
|------|-------------|
| Placement state machine | `docs/PLACEMENT_VERIFICATION.md` |
| Candidate declare / employer confirm | |
| Append-only `placement_events` | |
| Referral + 25% reward narrative | calculator + `candidate-rewards` |
| Cash-out / KYC (Authologic) | likely partial |
| ATS webhooks (Greenhouse, etc.) | secrets optional |

### Recruiter & employer

| Item | Audit notes |
|------|-------------|
| Recruiter inbox | token-gated |
| Recruiter jobs / ATS OAuth | Greenhouse partial, Lever stub |
| Employer hub marketing tabs (9 rich tabs) | `(marketing)/for-companies` |
| Employer placement attestation pages | `placement/employer` |

### Marketing, growth, investor

| Item | Audit notes |
|------|-------------|
| Landing, FAQ (no teasers), how-it-works, case studies | |
| Waitlist + animated counters | |
| First 1000 / founding narrative | |
| Investor metrics + calculator + data room | |
| Public demo page + snapshot API | known fragility §6 |
| Compare pages (LinkedIn, agencies, etc.) | |
| `/status` for founder | |

### Demo mode

| Item | Audit notes |
|------|-------------|
| `DEMO_MODE_ENABLED` | |
| `GET /api/v1/demo/snapshot` | |
| `scripts/seed-investor-demo.py` / runbook | `docs/INVESTOR_DEMO_RUNBOOK.md` |

### i18n & GDPR

| Item | Audit notes |
|------|-------------|
| PL/EN coverage, no stray literals | `docs/I18N.md` |
| `X-Locale` on API | |
| GDPR consent at register | `consent/gdpr` |
| Cookie consent banner | `docs/COOKIE_CONSENT.md` |
| Privacy / terms pages | |

---

## 6. Known issues from founder week (do not rediscover as new)

**Primary source:** [FOUNDER_TASK_REPORT_2026-05-16_to_today.md](./FOUNDER_TASK_REPORT_2026-05-16_to_today.md) (16–23 May 2026, branch `cursor/phase1-monorepo-scaffold`).

**Already documented elsewhere:** [FOUNDER_REPORT_19-22_MAY.md](./FOUNDER_REPORT_19-22_MAY.md), [AUDIT_RESULTS_2026-05-23.md](./AUDIT_RESULTS_2026-05-23.md).

### Founder-visible prod gaps (expected)

| Issue | Status | Auditor action |
|-------|--------|----------------|
| Stripe live keys not in Railway | `stripe_checkout_ready: false` | Confirm code exists; list founder paste steps only |
| LinkedIn OAuth keys not in Railway | Login disabled on prod | Same |
| Microsoft calendar secrets empty | `microsoft_calendar_configured: false` | Same |
| No `main` branch on GitHub | Vercel must use scaffold branch | Verify deploy settings |
| 100k jobs in DB | Not promised for week 1 | Mark out of scope |
| Mass LinkedIn profile download | Rejected (ToS/legal) | **Do not recommend** |

### Code / demo issues (verify if still true)

| Issue | Prior signal | Re-verify live |
|-------|--------------|----------------|
| `GET /api/v1/demo/snapshot` → 500 | AUDIT 2026-05-23 | curl + logs if access |
| Thin demo DB (1 application, 0 interviews) | mvp-stats | After seed runbook |
| `/auth/signup` vs `/register` | 404 vs 200 | Document canonical URL |

### Subagents 23 May (coordination only)

| Agent ID | Task | Outcome |
|----------|------|---------|
| `0b4806fa` | Retry “How it works” + case studies tabs | Session interrupted; **code landed** on branch (`91530db` era) — no duplicate work |
| `edad201f` | — | No separate repo log; no extra push beyond scaffold commits |

### Scraping policy (audit constraint)

- **Do not recommend** mass LinkedIn scraping, bulk profile harvest, or bypassing `robots.txt`.  
- LinkedIn **OAuth for login/profile import** is in scope; **LinkedIn jobs adapter** is blocked when `SCRAPE_RESPECT_ROBOTS_TXT=true` (default). See `docs/SCRAPING_COMPLIANCE.md`.

---

## 7. Audit output template

The auditor **must** fill this template in a **new markdown document** (suggested name: `docs/AUDIT_RESULTS_<YYYY-MM-DD>_claude.md`) or return it inline in chat.

```markdown
# TWIN full audit — <date>
Auditor: <name/model>
Branch audited: cursor/phase1-monorepo-scaffold @ <SHA>
Production git_commit: <from health>
Production checked: yes/no

## Executive summary
(3–6 sentences for a non-technical founder: what works, what blocks investor demo, overall maturity 1–10)

## P0 blockers
| # | Blocker | Evidence | Owner (founder/engineering) | ETA hint |
|---|---------|----------|----------------------------|----------|

## Production drift
| Layer | Expected SHA | Live SHA | Notes |
|-------|--------------|----------|-------|
| GitHub branch | | | |
| Railway API | | | |
| Vercel Production | | | |

## Security & GDPR
- Auth/session:
- Webhooks (Stripe, ATS):
- IDOR / multi-tenant (placement, applications):
- Secrets in API responses:
- Scraping compliance:
- Cookie/consent:

## UX — founder readability
- Can demo in 15 min without terminal? yes/no
- Pages that confuse or expose “teaser”/broken copy:
- i18n gaps (PL/EN):

## Technical debt
| Area | Debt | Severity | Suggested slice |
|------|------|----------|-----------------|

## Feature inventory summary
| Area | Shipped | Partial | Missing |
|------|---------|---------|---------|
| Auth | | | |
| Jobs/scrape | | | |
| Matching | | | |
| Auto-apply | | | |
| Calendar | | | |
| Billing | | | |
| Placement | | | |
| Recruiter | | | |
| Employer hub | | | |
| Marketing | | | |
| Investor | | | |
| Demo | | | |
| i18n/GDPR | | | |

## Recommended next 2 weeks
1.
2.
3.
(Max 10 bullets, ordered by north star impact)

## Appendix
- Commands run:
- Health JSON snapshot (redact nothing — no secrets in ops health):
- Test counts:
```

---

## 8. Constraints for the auditor

1. **Do not ask the founder to run terminal commands** unless unavoidable (e.g. only they can paste Railway variables or click Vercel Promote). Prefer `curl` against public prod URLs and reading the repo.  
2. **Do not recommend mass LinkedIn scraping**, bulk anonymous profile collection, or robots.txt bypass for LinkedIn.  
3. **Placement economics:** baseline **~25% net take** of monthly salary (50% employer fee → 50% to candidate → 25% to TWIN) — flag inconsistencies in copy/code, do not invent new pricing without founder sign-off.  
4. **Do not store or echo secrets** from `.env`, Railway, or Stripe dashboards. Reference **variable names only**.  
5. **Distinguish** “not built” vs “built but gated by missing prod secrets” vs “built but broken on prod”.  
6. **Respect Phase 1 scope** — flag 100k jobs, full KYC live, Lever OAuth as roadmap unless founder explicitly expands scope.  
7. Prior audits ([AUDIT_RESULTS_2026-05-23.md](./AUDIT_RESULTS_2026-05-23.md)) are **inputs**, not substitutes for fresh `curl` and `git` checks.

---

*Brief maintained for external LLM auditors. Update production URLs and founder-report pointers when deploy targets change.*
