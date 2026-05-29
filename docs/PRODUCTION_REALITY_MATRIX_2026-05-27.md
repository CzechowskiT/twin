# Production Reality Matrix — 2026-05-27

## Snapshot metadata

- **Branch:** `cursor/phase1-monorepo-scaffold`
- **Branch HEAD (local):** `89ff454` (frontend) / API live `df15618`
- **Production API SHA (read-only):** `df15618f1e2edec635ab868c03dcf736c463c8be` (`GET /api/public-health`, 2026-05-29 UTC)
- **Vercel production deployment:** `dpl_5SK5YWGzzWtQTDULPm2kAx9qrdB9` at frontend `89ff454` (founder-known; Vercel CLI not on agent PATH)
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
| Calendar Google | `google_calendar_configured` | **LIVE** |
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
| Verified candidate readiness gate (`/api/v1/candidates/me/verified-readiness`) | `docs/VERIFIED_CANDIDATE_GATEWAY_2026-05-28.md` + backend route | **REPO** (not production-verified yet) |
| GDPR consent on signup | L1 gate | **LIVE** |
| Cookie consent (PL/EN) | L2 gate | **LIVE** |
| Privacy / Terms pages | smoke / routes | **LIVE** |
| Data subject export/delete | L6 gate | **PARTIAL** |
| Celery worker + broker | celery-status + health | **LIVE** |
| Postgres | `db_ok=true` | **LIVE** |
| Backup restore drill | O7 gate | **BLOCKED / PENDING EVIDENCE** — PASS criteria + founder checklist in `BACKUP_RESTORE_DRILL_LOG.md`; no PASS row yet (2026-05-29 operator; prod read-only health OK) |
| Controlled pilot ops | pilot manual + tracker | **LIVE** process |
| Candidate E2E manual smoke | `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` | **LIVE** — PASS (founder-verified, 2026-05-27); Top 20 → Nietrafione → refresh regression. Warning: no auto-apply / real apply / scrape. |
| Founder authenticated route smoke (dashboard subpages, jobs, profile, safety copy) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **PENDING** — template received 2026-05-29 with **no filled route rows**; not PASS |
| Playwright smoke drift points | `frontend/e2e/smoke.spec.ts` targeted assertions | **STABILIZED** locally (most recent targeted lane green in prior session) |
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
| Frontend Vercel SHA | `89ff454` / `dpl_5SK5YWGzzWtQTDULPm2kAx9qrdB9` (founder-known) | **LIVE** (not re-queried via CLI) |
| Branch HEAD | `89ff454` | **REPO** may be ahead/behind FE deploy — verify before FE-only claims |
| Stripe dedup migration `050` | Prod `alembic_version` = `050_stripe_webhook_events` (founder/operator read-only SQL, 2026-05-29) | **LIVE / VERIFIED** — S5 PASS; no migration run; if ever rolled back to `049` → runbook § Founder-approved action plan |
| CSP mode | `content-security-policy-report-only` on `/` and `/dashboard` (2026-05-29 curl) | **LIVE REPORT-ONLY** |
| CSP enforce | No enforce header; S2 checklist not met | **BLOCKED BY POLICY** |
| Delegated / KYC apply | Product gates | **NOT LIVE** |
| O7 restore drill | No PASS row in drill log; staging path is Railway UI only (no repo script) | **PENDING EVIDENCE** — founder action required |
| Founder authenticated smoke (2026-05-29) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **PARTIAL** — most routes PASS; dashboard forecast layout fix pending FE deploy; Google OAuth Console fix pending |

---

## Related

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md`
- `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`
- `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md`
