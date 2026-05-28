# Production Reality Matrix — 2026-05-27

## Snapshot metadata

- **Branch:** `cursor/phase1-monorepo-scaffold`
- **Branch HEAD (local):** `d5e749a`
- **Production API SHA (read-only):** `a469c36a2779ffbdadad9fa5874a05aff2a215e8`
- **Vercel production SHA:** `8d34404` (frontend alias; refresh via Vercel project checks)
- **Frontend:** `https://twin-sooty.vercel.app` (canonical alias on Vercel project `twin`)
- **API:** `https://twin-production-bcd9.up.railway.app`

## Legend

**LIVE** = verified on prod this session · **PARTIAL** = shipped but gated / degraded · **REPO** = code only · **OFF** = disabled or not configured · **BLOCKED** = policy / gate blocks use

## Capability matrix

| Feature | Evidence | Production |
| ------- | -------- | ---------- |
| Public marketing (`/`, waitlist, first-1000) | HTTP 200 smoke | **LIVE** |
| Status / public-health proxy | `git_commit=76b6df3`, `db_ok=true` in JSON (WS0 check 2026-05-28) | **LIVE** |
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
| Stripe webhook dedup ledger | `050` migration + `billing.py` | **PARTIAL** — Alembic `050` on prod not yet founder-confirmed |
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
| GDPR consent on signup | L1 gate | **LIVE** |
| Cookie consent (PL/EN) | L2 gate | **LIVE** |
| Privacy / Terms pages | smoke / routes | **LIVE** |
| Data subject export/delete | L6 gate | **PARTIAL** |
| Celery worker + broker | celery-status + health | **LIVE** |
| Postgres | `db_ok=true` | **LIVE** |
| Backup restore drill | O7 gate | **BLOCKED** — drill evidence still pending in log |
| Controlled pilot ops | pilot manual + tracker | **LIVE** process |
| Candidate E2E manual smoke | `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` | **LIVE** — PASS (founder-verified, 2026-05-27); "Founder manually verified production candidate flow: dashboard Top 20/feed → Not relevant/Nietrafione → refresh → same offer did not return." Warning kept: "No auto-apply clicked. No real application sent. No scrape triggered." |
| Playwright smoke drift points | `frontend/e2e/smoke.spec.ts` targeted assertions | **STABILIZED** locally (4/4 targeted checks pass) |
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

## Related

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md`
- `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`
- `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md`
