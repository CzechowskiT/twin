# Production Reality Matrix — 2026-05-27

## Snapshot metadata

- **Branch:** `cursor/phase1-monorepo-scaffold`
- **Branch HEAD (local):** `3631c45` (frontend) / API live `df15618`
- **Production API SHA (read-only):** `df15618f1e2edec635ab868c03dcf736c463c8be` (`GET /api/public-health`, 2026-05-29 UTC)
- **DB incident (2026-05-29):** `INC-DB-2026-05-29-001` — suspected prod Postgres restore from 2026-05-25 backup; dashboard zeros; `mvp-stats` **500** — see `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md`
- **Vercel production deployment:** `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` at frontend `3631c45` (Google Calendar day-mapping fix; founder re-smoke 2026-05-29)
- **Frontend:** `https://twin-sooty.vercel.app` (canonical alias on Vercel project `twin`)
- **API:** `https://twin-production-bcd9.up.railway.app`

## Legend

**LIVE** = verified on prod this session · **PARTIAL** = shipped but gated / degraded · **REPO** = code only · **OFF** = disabled or not configured · **BLOCKED** = policy / gate blocks use

## Capability matrix

| Feature | Evidence | Production |
| ------- | -------- | ---------- |
| Public marketing (`/`, waitlist, first-1000) | HTTP 200 smoke | **LIVE** |
| Status / public-health proxy | `git_commit=df15618`, `db_ok=true` in JSON (read-only check 2026-05-29) | **LIVE** |
| Candidate login (OAuth + email) | health flags `google_oauth`, `github_oauth` | **LIVE** (Apple OAuth **OFF**) |
| Dashboard (candidate) | `/dashboard` 200; auth required for data | **LIVE** |
| Demo snapshot page | `/demo` 200 | **LIVE** |
| Job corpus / matching | `validated_jobs`, market coverage in health | **LIVE** (coverage ⚠️ below target) |
| Scraping (pracuj.pl, rocketjobs.pl) | `scrape_worker_ready`, beat enabled | **LIVE** infra; **BLOCKED** for ops sweep without allowlist |
| Manual scrape UI | `NEXT_PUBLIC_SHOW_SCRAPE` | **OFF** default |
| Auto-apply (nightly) | beat + consent models; sweep gate | **PARTIAL** — consent required; no agent-triggered live apply |
| Calendar Google | `google_calendar_configured`; founder **FULL prod smoke PASS** 2026-05-29 — OAuth + real events + day mapping (`docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`; Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, HEAD `3631c45`) | **LIVE / VERIFIED** — Connect, real events, local week columns (`Europe/Warsaw`) |
| Calendar Microsoft | `microsoft_calendar_configured` | **LIVE** |
| Calendar Apple / CalDAV | docs + ICS patterns | **PARTIAL** — no Apple OAuth |
| ICS / WebCal export | product docs | **REPO** / partial |
| Stripe Checkout | `stripe_checkout_ready` | **LIVE** |
| Stripe webhook signature | tests + billing route | **LIVE** |
| Stripe webhook dedup ledger | `050` migration + `billing.py`; prod SQL `050_stripe_webhook_events` (2026-05-29) | **LIVE / VERIFIED** — Alembic `050` on prod; ledger table `stripe_webhook_events` expected per migration; no agent migration |
| Beta waitlist signup | rate limit + contract tests | **LIVE** |
| CV / voice upload limits | `ff22f3a` | **LIVE** |
| CSP report-only + sink | S1 gate, `/api/v1/csp-report` | **LIVE** |
| CSP enforce | S2 gate | **BLOCKED** — keep REPORT-ONLY, do not flip enforce before burn-in checklist |
| Layer-2 LLM mutation limits | `28a50a0` | **LIVE** |
| Profile / applications mutation limits | `1c731fc` | **LIVE** |
| OAuth callback rate limits | `1efd8b1` | **LIVE** |
| Job save/unsave rate limits | `1efd8b1` | **LIVE** |
| Cookie consent + recruiter inbox rate limits | `67a22dc` | **LIVE** |
| Recruiter inbox | `recruiter_inbox_configured` | **LIVE** |
| Partner export | `partner_export_configured` | **LIVE** |
| Placement verification (machine-assisted) | `PLACEMENT_VERIFICATION.md` | **LIVE** design; pilot-scale |
| Verified candidate readiness gate (`/api/v1/candidates/me/verified-readiness`) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` § S11 + `tests/test_candidate_verified_readiness_gate.py` | **LIVE / VERIFIED** — prod HTTP 200 (founder browser smoke 2026-05-29); readiness card on `/dashboard` |
| GDPR consent on signup | L1 gate | **LIVE** |
| Cookie consent (PL/EN) | L2 gate | **LIVE** |
| Privacy / Terms pages | smoke / routes | **LIVE** |
| Data subject export/delete | L6 gate | **PARTIAL** |
| Celery worker + broker | celery-status + health | **LIVE** |
| Postgres | `db_ok=true` but suspected rollback | **INCIDENT** — `INC-DB-2026-05-29-001`; founder dashboard zeros; `mvp-stats` 500 |
| Backup restore drill | O7 gate | **FAIL / PENDING EVIDENCE** — prod restore ≠ O7 PASS; staging clone drill still required |
| Controlled pilot ops | pilot manual + tracker | **HOLD** — pause new pilot invites until DB recovery clarified |
| Candidate E2E manual smoke | `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` | **LIVE** — PASS (founder-verified, 2026-05-27); Top 20 → Nietrafione → refresh regression. Warning: no auto-apply / real apply / scrape. |
| Founder authenticated route smoke (dashboard subpages, jobs, profile, safety copy) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **LIVE** — **PASS** (founder 2026-05-29); 8/8 routes + safety copy; `/dashboard` layout PASS |
| Playwright smoke drift points | `frontend/e2e/smoke.spec.ts` targeted assertions | **STABILIZED** — status cookie-banner locator fix on branch; 13/14 prod lane PASS (2026-05-29) |
| Public launch announcement | gate checklist | **BLOCKED** |
| Investor demo | `INVESTOR_DEMO_RUNBOOK.md` | **LIVE** stack, curated use |
| Real CAPTCHA bypass / live mass apply | HARD BAN | **BLOCKED** |

---

## URLs (canonical)

| Role | URL |
| ---- | --- |
| Frontend | https://twin-sooty.vercel.app |
| API | https://twin-production-bcd9.up.railway.app |
| Public health (via FE) | https://twin-sooty.vercel.app/api/public-health |

---

## Repo vs live decision table (2026-05-29 refresh)

| Item | Current state | Decision |
| ---- | ------------- | -------- |
| API runtime SHA | `df15618` visible on `public-health` | **LIVE** |
| Frontend Vercel SHA | `3631c45` / `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` (founder re-smoke 2026-05-29) | **LIVE** |
| Branch HEAD | `3631c45` (calendar day-mapping fix) | **LIVE** on Vercel prod for calendar smoke |
| Stripe dedup migration `050` | Prod `alembic_version` = `050_stripe_webhook_events` (founder/operator read-only SQL, 2026-05-29) | **LIVE / VERIFIED** — S5 PASS; no migration run; if ever rolled back to `049` → runbook § Founder-approved action plan |
| CSP mode | `content-security-policy-report-only` on `/` and `/dashboard` (2026-05-29 curl) | **LIVE REPORT-ONLY** |
| CSP enforce | No enforce header; S2 checklist not met | **BLOCKED BY POLICY** |
| Delegated / KYC apply | Product gates | **NOT LIVE** |
| O7 restore drill | Prod restore incident logged as FAIL; no staging PASS row | **FAIL / PENDING EVIDENCE** — recovery + staging clone drill required |
| DB prod restore incident | `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md` | **OPEN** — founder recovery decision A/B/C pending |
| Google Calendar FULL prod smoke (2026-05-29) | `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` | **LIVE / VERIFIED** — OAuth + real events + day mapping; Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, HEAD `3631c45`; no Railway |
| Founder authenticated smoke (2026-05-29) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **LIVE / VERIFIED** — P6 **PASS**; 8/8 routes + safety; `/dashboard` layout founder-confirmed |
| CSP per-route probe (2026-05-29 batch) | `/`, `/dashboard`, `/login/candidate`, `/demo`, `/status` — all report-only | **LIVE REPORT-ONLY** — enforce still blocked (S2) |

---

## Related

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md`
- `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`
- `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md`
