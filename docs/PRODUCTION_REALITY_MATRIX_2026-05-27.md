# Production reality matrix — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Production API SHA (read-only):** `67a22dc`
**Vercel / GitHub Production deploy:** `8d34404` (docs-only delta vs API)
**Frontend:** `https://twin-sooty.vercel.app` (canonical alias on Vercel project `twin`)
**API:** `https://twin-production-bcd9.up.railway.app`

Legend: **LIVE** = verified on prod this session · **PARTIAL** = shipped but gated / degraded · **REPO** = code only · **OFF** = disabled or not configured · **BLOCKED** = policy / gate blocks use

| Feature | Evidence | Production |
| ------- | -------- | ---------- |
| Public marketing (`/`, waitlist, first-1000) | HTTP 200 smoke | **LIVE** |
| Status / public-health proxy | `git_commit`, `db_ok` in JSON | **LIVE** |
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
| Stripe webhook dedup ledger | `050` migration + `billing.py` | **PARTIAL** — verify `alembic current`; helpers degrade if no table |
| Beta waitlist signup | rate limit + contract tests | **LIVE** |
| CV / voice upload limits | `ff22f3a` | **LIVE** |
| CSP report-only + sink | S1 gate, `/api/v1/csp-report` | **LIVE** |
| CSP enforce | S2 gate | **BLOCKED** — burn-in not complete |
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
| Backup restore drill | O7 gate | **BLOCKED** — runbook only |
| Controlled pilot ops | pilot manual + tracker | **LIVE** process |
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
