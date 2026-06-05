# Production Reality Matrix — 2026-05-27

## Snapshot metadata

- **Branch:** `chore/s2-csp-burnin-readiness-2026-06-01` (audit) / prod unchanged
- **Branch HEAD (local):** `9011040`+ (audit branch, 2026-06-03 shift) / API live `6382a91`
- **Production API SHA (read-only):** `6382a918882664df0076d996ca65c08e9138536a` (`GET /api/public-health`, post-merge 2026-06-02 — PR #21; includes `e764e68` safety fix)
- **Launch readiness matrix:** `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
- **Auto-apply safety audit:** `docs/AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md` (2026-06-02)
- **Post-merge sanity:** `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md` (2026-06-02)
- **Ops pause plan:** `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` (2026-06-02)
- **Copy & claims audit:** `docs/PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md` (2026-06-04)
- **Launch-day monitoring / rollback:** `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` (2026-06-04)
- **Recruiter alignment audit:** `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md` (2026-06-04)
- **DB incident (2026-05-29):** `INC-DB-2026-05-29-001` — **RESOLVED** + stabilization PASSED — see `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md`
- **O7 staging drill (2026-06-01):** ✅ **PASS** — pg_dump/pg_restore to `staging-restore-proof-20260529`; prod **`postgres-volume`** untouched — see `docs/BACKUP_RESTORE_DRILL_LOG.md`
- **Vercel production deployment:** `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` at frontend `3631c45` (Google Calendar day-mapping fix; founder re-smoke 2026-05-29)
- **Frontend:** `https://twin-sooty.vercel.app` (canonical alias on Vercel project `twin`)
- **API:** `https://twin-production-bcd9.up.railway.app`

## Legend

**LIVE** = verified on prod this session · **PARTIAL** = shipped but gated / degraded · **REPO** = code only · **OFF** = disabled or not configured · **BLOCKED** = policy / gate blocks use

## Capability matrix

| Feature | Evidence | Production |
| ------- | -------- | ---------- |
| Public marketing (`/`, waitlist, first-1000, `/compare/*`) | HTTP 200 smoke; **final logo smoke PASS** **`2026-06-04T10:29:29Z`**; **copy fixes 2026-06-04** — founding qualified (`1a2eba4` + first-1000 headline); calendar strip + compare i18n aligned (OAuth vs ICS/WebCal; phased auto-apply); public launch still **NO-GO** (S2/ops) | **LIVE** (pilot); **NO-GO** uncontrolled public (gates, not copy alone) |
| Status / public-health proxy | `git_commit=df15618`, `db_ok=true` in JSON (read-only check 2026-05-29) | **LIVE** |
| Candidate login (OAuth + email) | health flags `google_oauth`, `github_oauth` | **LIVE** (Apple OAuth **OFF**) |
| Dashboard (candidate) | `/dashboard` 200; auth required for data | **LIVE** |
| Demo snapshot page | `/demo` 200 | **LIVE** |
| Job corpus / matching | `validated_jobs`, market coverage in health | **LIVE** (coverage ⚠️ below target) |
| Scraping (pracuj.pl, rocketjobs.pl) | `scrape_worker_ready`, beat enabled | **LIVE** infra; **BLOCKED** for ops sweep without allowlist |
| Manual scrape UI | `NEXT_PUBLIC_SHOW_SCRAPE` | **OFF** default |
| Auto-apply (nightly) | `nightly_auto_apply_beat_enabled=false` on prod (2026-06-02) | **PAUSED (ops)** — GAP-03 closed; GAP-04 optional; server gates live |
| Delegated apply | gateway hard-false; no consent migration | **NOT LIVE** |
| Per-job prepare (`POST /applications/auto-apply`) | `enforce_autonomous_apply_allowed()` (403) | **LIVE** infra — FE + server gated |
| Manual trigger (`POST /auto-apply/trigger`) | Ops allowlist only | **OPS ONLY** — not candidate-facing |
| Calendar Google | `google_calendar_configured`; founder **FULL prod smoke PASS** 2026-05-29 — OAuth + real events + day mapping (`docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`; Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, HEAD `3631c45`) | **LIVE / VERIFIED** — Connect, real events, local week columns (`Europe/Warsaw`) |
| Calendar Microsoft | `microsoft_calendar_configured` | **LIVE** |
| Calendar Apple / CalDAV | ICS/WebCal partial; no Apple OAuth | **PARTIAL** — O5 founder waiver `2026-06-03T13:19:53Z` |
| ICS / WebCal export | product docs + dashboard patterns | **PARTIAL** — acceptable for pilot with disclosure |
| Stripe Checkout | `stripe_checkout_ready` | **LIVE** |
| Stripe webhook signature | tests + billing route | **LIVE** |
| Stripe webhook dedup ledger | `050` migration + `billing.py`; prod SQL `050_stripe_webhook_events` (2026-05-29) | **LIVE / VERIFIED** — Alembic `050` on prod; ledger table `stripe_webhook_events` expected per migration; no agent migration |
| Beta waitlist signup | rate limit + contract tests | **LIVE** |
| CV / voice upload limits | `ff22f3a` | **LIVE** |
| CSP report-only + sink | S1 gate, `/api/v1/csp-report` | **LIVE** |
| CSP enforce | S2 gate; 72h burn-in `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z` | **BLOCKED** — REPORT-ONLY; burn-in in progress; do not flip enforce before evidence pack |
| Layer-2 LLM mutation limits | `28a50a0` | **LIVE** |
| Profile / applications mutation limits | `1c731fc` | **LIVE** |
| OAuth callback rate limits | `1efd8b1` | **LIVE** |
| Job save/unsave rate limits | `1efd8b1` | **LIVE** |
| Cookie consent + recruiter inbox rate limits | `67a22dc` | **LIVE** |
| Recruiter inbox | `recruiter_inbox_configured`; token auth; batch accept/decline — audit `2026-06-04` **C) recruiter-supporting**, not two-sided | **LIVE** (pilot) |
| Recruiter marketing SKU (watchlists, HM packets, seat packs) | `persona-pages.ts` recruiters bundle | **REPO / MARKETING** — not evidenced as shipped app beyond inbox/jobs |
| Partner export | `partner_export_configured` | **LIVE** |
| Placement verification (machine-assisted) | `PLACEMENT_VERIFICATION.md` | **LIVE** design; pilot-scale |
| Verified candidate readiness gate (`/api/v1/candidates/me/verified-readiness`) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` § S11 + `tests/test_candidate_verified_readiness_gate.py` | **LIVE / VERIFIED** — prod HTTP 200 (founder browser smoke 2026-05-29); readiness card on `/dashboard` |
| GDPR consent on signup | L1 gate | **LIVE** |
| Cookie consent (PL/EN) | L2 gate | **LIVE** |
| Privacy / Terms pages | smoke / routes | **LIVE** |
| Data subject export/delete | L6 gate — export LIVE; erasure manual; waiver `2026-06-03T13:19:53Z` | **PARTIAL-WAIVER** — pilot OK; self-service delete future |
| Celery worker + broker | celery-status + health | **LIVE** |
| Postgres | `db_ok=true`; **`postgres-volume` active** | **LIVE / STABLE** — stabilization passed; `market_coverage_active_validated=2551` (read-only curl) |
| Backup restore drill | O7 gate | **LIVE / PASS** — staging clone drill 2026-06-01; pg_dump/pg_restore; prod untouched |
| Controlled pilot ops | pilot manual + tracker | **LIVE** — resume after recovery verified (founder dashboard non-zero) |
| Candidate E2E manual smoke | `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` | **LIVE** — PASS (founder-verified, 2026-05-27); Top 20 → Nietrafione → refresh regression. Warning: no auto-apply / real apply / scrape. |
| Founder authenticated route smoke (dashboard subpages, jobs, profile, safety copy) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **LIVE** — **PASS** (founder 2026-05-29); 8/8 routes + safety copy; `/dashboard` layout PASS |
| Playwright smoke drift points | `frontend/e2e/smoke.spec.ts` targeted assertions | **STABILIZED** — status cookie-banner locator fix on branch; 13/14 prod lane PASS (2026-05-29) |
| Public launch announcement | gate checklist + launch matrix | **BLOCKED** — **NO-GO** (S2 primary; L6/O5 waivers pilot-only; GAP-04 optional) |
| Launch-day monitoring / rollback | `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | **LIVE** (docs) — pilot/demo GO with monitoring; public **NO-GO**; auto-apply **PAUSED** |
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
| API runtime SHA | `6382a91` on `public-health` (merge PR #21; contains `e764e68`) | **LIVE** |
| Frontend Vercel SHA | `3631c45` / `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` (founder re-smoke 2026-05-29) | **LIVE** |
| Branch HEAD | `3631c45` (calendar day-mapping fix) | **LIVE** on Vercel prod for calendar smoke |
| Stripe dedup migration `050` | Prod `alembic_version` = `050_stripe_webhook_events` (founder/operator read-only SQL, 2026-05-29) | **LIVE / VERIFIED** — S5 PASS; no migration run; if ever rolled back to `049` → runbook § Founder-approved action plan |
| CSP mode | `content-security-policy-report-only` on `/` and `/dashboard` (2026-05-29 curl) | **LIVE REPORT-ONLY** |
| CSP enforce | No enforce header; S2 checklist not met | **BLOCKED BY POLICY** |
| Delegated / KYC apply | Product gates | **NOT LIVE** |
| O7 restore drill | `docs/BACKUP_RESTORE_DRILL_LOG.md` PASS row 2026-06-01 | **PASS** — staging `staging-restore-proof-20260529`; SQL counts verified |
| DB prod restore incident | `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md` | **RESOLVED / STABLE** — re-mount original volume; retain backups **2026-05-25** + **14:09 UTC** until post-mortem |
| Google Calendar FULL prod smoke (2026-05-29) | `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` | **LIVE / VERIFIED** — OAuth + real events + day mapping; Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, HEAD `3631c45`; no Railway |
| Founder authenticated smoke (2026-05-29) | `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | **LIVE / VERIFIED** — P6 **PASS**; 8/8 routes + safety; `/dashboard` layout founder-confirmed |
| CSP per-route probe (2026-05-29 batch) | `/`, `/dashboard`, `/login/candidate`, `/demo`, `/status` — all report-only | **LIVE REPORT-ONLY** — enforce still blocked (S2) |
| CSP S2 burn-in window (2026-06-02) | `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` — `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z` (~44h 16m / ~61% elapsed at `2026-06-04T10:34:36Z`) | **IN PROGRESS** — S2 PASS **NO**; enforce off |
| CSP founder Railway cadence (~48h, 2026-06-04 `10:34:36Z`) | Founder UI search `csp_report` from window start — **no fresh entries** since `2026-06-02T14:18:33Z` | **CONTINUE** — report-only HOLD |
| CSP founder combined checkpoint (2026-06-04 `08:47:35Z`) | Railway `csp_report` — **no fresh entries** since start; Chrome/Safari/Firefox DevTools core routes — **no CSP violations** | **CONTINUE** (historical combined) — report-only HOLD |
| Marketing logo marquee (non-CSP, 2026-06-04) | Deploy chain `472a6d3` → `bcd23cd` → `4a7c57d`; founder **final logo smoke PASS** `10:29:29Z` — colorful logos + initials, no white plates / broken images, Console clean; Safari/Firefox **PASS** `08:47:35Z` | **VERIFIED** — non-CSP; S2 unchanged |
| CSP founder Railway checkpoint (2026-06-03 `12:23:52Z`) | Founder UI search `csp_report` from window start — **no fresh entries** (historical; superseded by combined row) | **CONTINUE** (historical) |
| CSP agent checkpoint (2026-06-03 `08:00:23Z`) | `audit-csp-headers.sh` + public-health + local CSP tests; Railway logs founder-only | **CONTINUE** (historical) — superseded by founder Railway row above |
| CSP clean checkpoint (2026-06-02 `15:42:41Z`) | Founder Railway `production/twin` deployment `37096ecc`; search `csp_report` — no logs / no fresh reports; dashboard OK | **CONTINUE** (historical) — through `2026-06-02` founder evidence |
| CSP `connect-src` Railway host (2026-06-02) | `frontend/next.config.ts`; founder logs: no fresh violations for `twin-production-bcd9.up.railway.app` after deploy | **LIVE / DEPLOYED** — report-only allowlist; not an outage |

---

## Related

- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`
- `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_CUTOVER_REPORT_2026-05-27.md`
- `docs/API_PRODUCTION_CUTOVER_DECISION_2026-05-27.md`
- `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md`
