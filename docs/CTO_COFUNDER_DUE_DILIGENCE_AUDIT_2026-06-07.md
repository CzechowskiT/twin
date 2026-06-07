# TWIN — CTO / Co-Founder Due Diligence Audit — 2026-06-07

**Auditor role:** TWIN CTO / Co-Founder Due Diligence Auditor  
**Branch:** `chore/cto-cofounder-due-diligence-audit-2026-06-07`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Branch HEAD:** `a49a0e2` (audit session)  
**Audit UTC:** `2026-06-07`  
**Mode:** Docs-only · read-only repo evidence · no deploy / env / DB / secrets  
**Audience:** Co-founder, advisor, or technical partner — **not** marketing, pitch deck, or public launch material

**Preserved launch reality (non-negotiable in this audit):**

| Signal | Status |
| ------ | ------ |
| S2 CSP enforce | **PASS** — ON prod (`2026-06-05T16:20:13Z` post-enforce smoke) |
| Recruiter inbox R1–R5 | **PASS** |
| H4 Nova Hiring PL visual smoke | **CLEAN PASS** (`2026-06-06T17:36:25Z`) — **5 canonical rows** |
| H5 founder dry run | **PASS** (`2026-06-07T07:03:13Z`) |
| H5c / H5d packs | **DONE** (created `2026-06-07`) — default **HOLD** |
| Candidate transparency | **DONE** (`2026-06-07`) |
| PII / consent alignment | **DONE** (`2026-06-06`) |
| Recruiter calendar | **NOT LIVE** (placeholder `/recruiter/calendar`) |
| Public launch | **NO-GO** |
| Auto-apply | **PAUSED** (`nightly_auto_apply_beat_enabled=false`) |
| Delegated apply | **NOT LIVE** (`delegated_apply_allowed=false`) |
| External recruiter invites | **0** sent |
| KYC / ATS OAuth / SSO / talent pool (B2B live) | **NOT LIVE** unless separately evidenced |

**Canonical URLs (from gate docs):**

- Frontend: `https://twin-sooty.vercel.app`
- API: `https://twin-production-bcd9.up.railway.app`
- Public health: `https://twin-sooty.vercel.app/api/public-health`

**Status taxonomy used in this audit:**

| Label | Meaning |
| ----- | ------- |
| **LIVE** | Verified on production with cited evidence |
| **PILOT-READY** | Safe for named controlled pilot / demo with disclosed limits |
| **PARTIAL** | Shipped but degraded, gated, or waiver-dependent |
| **DOCS-ONLY** | Design / runbook exists; not evidenced as prod feature |
| **ROADMAP** | Planned; code stub or marketing only |
| **NOT LIVE** | Explicitly off, hard-false, or paused by policy |
| **BLOCKED** | Policy / gate blocks use regardless of code presence |

---

## 1 — Executive summary

TWIN is a **real Phase-1 product** with production infrastructure (FastAPI + PostgreSQL + Celery on Railway; Next.js on Vercel), not a mockup. The stack supports **controlled pilot** and **investor/CTO demo** use today. **Uncontrolled public launch remains NO-GO** — not because CSP is open (S2 **PASS**, enforce **ON**), but because founder limited-launch decision is pending, auto-apply is **PAUSED**, delegated submit is **NOT LIVE**, recruiter GTM is **0 external invites**, and several legal/ops gates (L6 self-service delete, O5 Apple parity) carry pilot-only waivers.

**Co-founder headline:** Credible **candidate-first career agent MVP** with **recruiter-supporting pilot mechanics** (token inbox, match explainability, PII policy). **Not** a two-sided marketplace, **not** autonomous apply-at-scale, **not** revenue-generating at meaningful scale (Stripe live; no evidenced paid subs / MRR in current gate docs).

**Honest ceiling:** 10–20 named founding candidates + **0–2** trusted recruiter reviewers after explicit H5c **GO SMALL** sign-off — not mass GTM.

---

## 2 — Production state snapshot

| Layer | Evidence | Status |
| ----- | -------- | ------ |
| API health | `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — `status=ok`, `db_ok=true` | **LIVE** |
| Frontend alias | `twin-sooty.vercel.app` — gate matrices | **LIVE** |
| Celery worker | `scrape_worker_ready=true`; beat for nightly auto-apply **disabled** on prod | **LIVE** / auto-apply **PAUSED** |
| Job corpus | `validated_jobs` ~652; `market_coverage_active_validated` ~2.6k+ (metric varies by endpoint) | **LIVE** — below marketplace narrative |
| CSP | Enforce header present; post-enforce smoke PASS `2026-06-05T16:20:13Z` | **LIVE** |
| Stripe | Checkout + webhook + dedup migration `050` on prod (founder SQL 2026-05-29) | **LIVE** |
| Recruiter inbox | R1–R5 PASS; H4 **5 rows**; H5b PASS | **LIVE** (pilot token) |
| Recruiter calendar | PR #43 placeholder; **NOT LIVE** copy | **ROADMAP** |
| Public launch | Gate matrices unanimous | **BLOCKED** — **NO-GO** |

**Repo vs prod:** Gate docs reference API SHA `46d8280…` / `6382a91…` on public-health; repo HEAD at audit `a49a0e2`. Drift is documented in `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md` — not re-verified live in this session.

---

## 3 — Capability matrix (product)

| Capability | Status | Evidence |
| ---------- | ------ | -------- |
| Public marketing (`/`, waitlist, compare, first-1000) | **LIVE** | `PRODUCTION_REALITY_MATRIX` — HTTP 200; copy audit `2026-06-04` |
| Candidate OAuth (Google, GitHub) | **LIVE** | Health flags; P6 smoke PASS |
| Apple OAuth | **NOT LIVE** | `apple_oauth_configured: false` in prior audits |
| Candidate dashboard (jobs, profile, applications) | **LIVE** | P6 founder smoke; E2E manual PASS `2026-05-27` |
| CV upload + contextual matching | **LIVE** | README; upload rate limits `ff22f3a` |
| Job scraping (pracuj.pl, rocketjobs.pl) | **LIVE** infra | Ops sweep **BLOCKED** without allowlist |
| LinkedIn scrape | **PARTIAL** | Best-effort; ToS / block risk per README |
| Auto-apply (nightly) | **NOT LIVE** (ops) | `nightly_auto_apply_beat_enabled=false` |
| Per-job auto-apply API | **BLOCKED** | `enforce_autonomous_apply_allowed()` → 403 |
| Delegated apply / KYC submit | **NOT LIVE** | `candidate_readiness.py` hard-false |
| Google Calendar | **LIVE** | FULL prod smoke PASS `2026-05-29` |
| Microsoft Calendar | **LIVE** | Health flag |
| Apple / ICS / WebCal | **PARTIAL** | O5 waiver `2026-06-03` |
| Recruiter inbox (batch accept/decline) | **LIVE** | R1–R5; review_card; decision UX |
| Recruiter calendar sync | **NOT LIVE** | Placeholder only |
| Recruiter marketing SKU (watchlists, HM packets) | **DOCS-ONLY** / marketing | Recruiter alignment audit §5 |
| Stripe billing | **LIVE** | Checkout + webhook dedup |
| Placement verification | **DOCS-ONLY** design | `PLACEMENT_VERIFICATION.md` — pilot-scale |
| ATS OAuth (Greenhouse/Lever) | **NOT LIVE** | Stubs in repo; `FOUNDER_STATUS_LIVE` backlog |
| KYC (Authologic) | **NOT LIVE** for product claims | `backend/app/api/kyc.py` exists; no prod smoke cited |
| Talent pool B2B preview | **NOT LIVE** | `talent_pool_opt_in` column; no prod cohort evidence |
| SSO / employer accounts | **NOT LIVE** | Token pilot only |
| GDPR consent + cookie banner | **LIVE** | L1, L2 gates |
| DSR export | **LIVE** | JSON/CSV/XLSX export routes |
| DSR self-service delete | **NOT LIVE** | Manual via `GDPR_MANUAL_DSR.md`; L6 waiver |
| Candidate application transparency panel | **LIVE** | `CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md` |
| Limited recruiter pilot (external) | **PILOT-READY** — **HOLD** | H5b PASS; H5c/H5d packs; **0 invites** |

---

## 4 — Security & CSP

| Control | Status | Evidence |
| ------- | ------ | -------- |
| S1 CSP report-uri + sink | **LIVE** | Gate checklist S1 ✅ |
| S2 CSP enforce 72h burn-in + post-enforce | **LIVE** | `S2_CSP_BURNIN_WINDOW_2026-06-01.md`; smoke `2026-06-05T16:20:13Z` |
| Mutation rate limits (LLM, auth, profile) | **LIVE** | S3, S10 gates; commits `28a50a0`, `1c731fc`, `1efd8b1` |
| Upload rate limits (CV/voice) | **LIVE** | S4 — `ff22f3a` |
| Stripe webhook dedup | **LIVE** | S5 — migration `050` on prod |
| Auto-apply sweep ops gate | **LIVE** | S6 — 10+ tests |
| Public-health regression freeze | **LIVE** | S7 |
| CSP backend tests | **LIVE** | `pytest tests/test_csp_report*.py` — **9 passed** (audit session) |
| `unsafe-inline` / `unsafe-eval` | **PARTIAL** | R-014 — hardening track open |
| httpOnly auth cookies | **ROADMAP** | `P2_HTTPONLY_AUTH_ROLLOUT_PLAN` |

**S2 verdict:** **PASS** — enforce **ON**. Does **not** alone unlock public launch (founder decision + ops gates).

---

## 5 — Authentication & identity

| Item | Status | Notes |
| ---- | ------ | ----- |
| Email/password + JWT | **LIVE** | 24h expiry per README |
| OAuth (Google, GitHub, LinkedIn) | **LIVE** / **PARTIAL** | LinkedIn OAuth configured per `FOUNDER_STATUS_LIVE`; Apple **OFF** |
| Row-level ownership | **LIVE** | README security section |
| 2FA | **ROADMAP** | README known limitation |
| Recruiter access | **PARTIAL** | Shared token + company slug — not SSO |
| Ops admin token | **LIVE** | Manual rotation only — R-022 open |

---

## 6 — Candidate product surface

| Surface | Status | Evidence |
| ------- | ------ | -------- |
| Registration + GDPR consent | **LIVE** | L1 |
| Dashboard feed / Top 20 / feedback | **LIVE** | E2E manual smoke PASS |
| Applications tracking | **LIVE** | Transparency panel `2026-06-07` |
| Verified-readiness gate API | **LIVE** | S11 prod smoke PASS |
| Career brief / 360 / skill evidence | **ROADMAP** | Direction docs `2026-05-28`; not full prod modules |
| Voice upload | **LIVE** infra | Rate limits shipped; abuse gaps R-007/R-008 in register (verify deploy) |
| Demo `/demo` | **LIVE** | live_db snapshot |

**Candidate north-star alignment:** Product reduces noise toward **acceptance-ready calendar items** — matching + consent + async work. Auto-apply **PAUSED** supports trust posture.

---

## 7 — Recruiter product surface

| Surface | Status | Evidence |
| ------- | ------ | -------- |
| Inbox queue + match % + reasons | **LIVE** | R1–R4 PASS |
| Review card (Match Receipt) | **LIVE** | R5 PASS `2026-06-06T16:38:40Z` |
| Accept / decline / status badges | **LIVE** | R1–R3 PASS |
| PII policy (name visible; email/phone hidden) | **LIVE** | `PII_DATA_VISIBILITY_POLICY_2026-06-06.md` |
| Nova Hiring PL demo seed | **LIVE** | H4 **5 rows**, no legacy row |
| Founder dry run H5b | **PILOT-READY** | PASS `2026-06-07T07:03:13Z` |
| External pilot invites | **BLOCKED** | H5c/H5d **HOLD**; **0 sent** |
| Recruiter calendar | **NOT LIVE** | Placeholder — PR #43 |
| Employer SSO / seats / watchlists | **NOT LIVE** / **DOCS-ONLY** | Alignment audit verdict **C** not **D** |

**Strategic verdict (preserved):** **C) candidate-first, recruiter-supporting** — `TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`.

---

## 8 — Calendar & scheduling

| Provider | Status | Evidence |
| -------- | ------ | -------- |
| Google Calendar OAuth + events | **LIVE** | `GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` |
| Microsoft Graph | **LIVE** | Health surface |
| Apple Calendar OAuth | **NOT LIVE** | — |
| ICS / WebCal export | **PARTIAL** | O5 waiver; copy must not overpromise |
| Recruiter calendar sync | **NOT LIVE** | Placeholder route only |
| Meeting links (Meet/Teams/Zoom) | **PARTIAL** | Metadata on events where configured |

---

## 9 — Auto-apply & delegated apply

| Control | Status | Evidence |
| ------- | ------ | -------- |
| Nightly beat on prod | **NOT LIVE** | `nightly_auto_apply_beat_enabled=false` |
| Per-job `POST /applications/auto-apply` | **BLOCKED** | `autonomous_apply_policy.enforce_autonomous_apply_allowed()` |
| Ops `trigger-sweep` | **LIVE** ops-only | Ops allowlist |
| Consent model in DB | **LIVE** | L5 gate |
| Delegated submit | **NOT LIVE** | `can_submit_delegated_application=False` |
| GAP-04 `AUTO_APPLY_SUBMIT` env | **PARTIAL** | Unset on prod — optional open per launch matrix |
| UI safety guards | **LIVE** | `test:dashboard-ux-safety`, `test:verified-readiness-guard` |

**Policy (preserved):** No mass autonomous apply for launch; audit hard ban honoured.

---

## 10 — Billing & monetization

| Item | Status | Evidence |
| ---- | ------ | -------- |
| Stripe Checkout | **LIVE** | `stripe_checkout_ready: true` |
| Webhook signature verification | **LIVE** | O4 audit |
| Event.id dedup ledger | **LIVE** | Alembic `050` on prod |
| Paid subscriptions / MRR | **NOT LIVE** at scale | `FOUNDER_STATUS_LIVE`: MRR $0 |
| B2B recruiter seat packs | **DOCS-ONLY** | Marketing persona pages |
| Placement success fees | **DOCS-ONLY** | `PLACEMENT_VERIFICATION.md` design |

**Revenue claims:** Do **not** state revenue, paying users, or marketplace liquidity — no evidence in gate docs.

---

## 11 — Data, matching & scraping

| Item | Status | Evidence |
| ---- | ------ | -------- |
| PostgreSQL + Alembic | **LIVE** | `db_ok=true`; head `050` cited |
| Validated jobs corpus | **LIVE** | ~652–2725 depending on metric — explain drift to investors |
| Matching + feedback | **LIVE** | E2E smoke; `MATCHING_QUALITY_GATE.md` |
| Scrapers (PL boards) | **LIVE** infra | pracuj.pl, rocketjobs.pl |
| Scrape ops automation | **BLOCKED** | Allowlist policy |
| LinkedIn | **PARTIAL** | Public scrape; fragile |
| Greenhouse per-board API | **LIVE** code path | Not full ATS OAuth live |

---

## 12 — Legal, GDPR & PII

| Gate | Status | Evidence |
| ---- | ------ | -------- |
| L1 signup consent | **LIVE** | Gate checklist |
| L2 cookie consent PL/EN | **LIVE** | `COOKIE_CONSENT.md` |
| L3 privacy / terms | **LIVE** | Smoke routes |
| L4 scraping compliance | **LIVE** | `SCRAPING_COMPLIANCE.md` |
| L5 auto-apply consent | **LIVE** | DB + tests |
| L6 DSR export | **LIVE** | Export routes |
| L6 DSR delete (self-service) | **NOT LIVE** | Manual DSR; waiver `2026-06-03` |
| L7 placement verification design | **DOCS-ONLY** | Machine-assisted; no CS tennis default |
| PII recruiter/candidate alignment | **LIVE** | `PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md` |
| Candidate transparency copy | **LIVE** | `CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md` |

---

## 13 — Infrastructure & CI/CD

| Item | Status | Evidence |
| ---- | ------ | -------- |
| Railway API deploy | **LIVE** | Git-connected; gate docs |
| Vercel frontend deploy | **LIVE** | Canonical alias `twin-sooty.vercel.app` |
| Docker compose (local/prod) | **LIVE** | `docker-compose.yml`, `docker-compose.prod.yml` |
| GitHub Actions smoke | **LIVE** | `.github/workflows/smoke.yml` — backend subset + prod-health |
| Docs-only PR path | **LIVE** | `paths-ignore: docs/**` in smoke workflow |
| O7 backup/restore drill | **LIVE** | PASS `2026-06-01` staging clone |
| DB incident INC-DB-2026-05-29 | **LIVE** resolved | Stabilization passed |
| Vercel project.json drift | **PARTIAL** | R-017; guard script exists |

**Backend tests:** 158 test files mapped in `BACKEND_TEST_MAP_2026-05-27.md` (138 at map time; repo grew). **Frontend:** 193 test files found at audit. CI smoke runs 7 backend files + frontend checks per `smoke.yml`.

---

## 14 — Observability & operations

| Item | Status | Evidence |
| ---- | ------ | -------- |
| Public health proxy | **LIVE** | S7 regression tests |
| Ops health `?ops=1` | **LIVE** | Celery, scrape flags |
| CSP report sink | **LIVE** | Storage-free POST |
| Incident response runbook | **DOCS-ONLY** → **PILOT-READY** | O8 — `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` |
| Launch-day monitoring runbook | **DOCS-ONLY** | O8b — `LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` |
| Security risk register | **LIVE** doc | O9 — `SECURITY_RISK_REGISTER_2026-05-27.md` |
| Centralized log pipeline | **PARTIAL** | Founder-led CSP triage |

---

## 15 — Architecture & scalability

**Stack (Phase 1):** FastAPI · SQLAlchemy · Alembic · Celery · Redis · PostgreSQL · Playwright · Next.js · Anthropic Claude — per README and `.cursorrules`.

| Dimension | Status | Honest assessment |
| --------- | ------ | ----------------- |
| Monorepo layout (`backend/`, `frontend/`) | **LIVE** | Clear separation |
| 100k-user design intent | **ROADMAP** | Principles in `.cursorrules`; no load test evidence |
| i18n PL/EN | **LIVE** | `X-Locale`; `docs/I18N.md` |
| API route inventory | **DOCS-ONLY** | 175 routes — `BACKEND_ROUTE_INVENTORY_2026-05-27.md` |
| Edge rate limits | **PARTIAL** | App-layer SlowAPI; no CDN WAF evidenced |
| Multi-calendar strategy | **PARTIAL** | Google/Microsoft live; Apple via ICS |

**Scale ceiling today:** Pilot/demo — not 100k users without investment in load testing, abuse edge, support ops, and corpus depth.

---

## 16 — Risk register (co-founder view)

Consolidated from `SECURITY_RISK_REGISTER_2026-05-27.md` + launch matrices + recruiter audit. Severity: H/M/L.

| ID | Risk | Sev | Status | Co-founder note |
| -- | ---- | --- | ------ | --------------- |
| R-001–R-003 | Waitlist spam, sweep authz, CSP blind spot | M | **CLOSED** | Shipped mitigations |
| R-004 | Stripe replay double-count | M | **CLOSED** on prod | `050` verified 2026-05-29 |
| R-007–R-009 | Beta CV/voice/enumeration abuse | H/M | **VERIFY** | Code limits cited S4; register may lag — re-run abuse audit |
| R-013–R-014 | CSP enforce / unsafe-inline | H/M | **PARTIAL→CLOSED enforce** | S2 PASS; nonce track open |
| R-018 | Backup restore unverified | M | **CLOSED** | O7 PASS 2026-06-01 |
| R-019 | DSR delete not self-service | M | **PARTIAL** | L6 waiver — blocks **public** not **pilot** |
| R-020 | Wrong-board auto-apply | H | **PARTIAL** | Mitigated by **PAUSED** beat |
| R-021–R-022 | Token rotation | L/M | **OPEN** | Recruiter + ops tokens manual |
| R-024 | LLM output injection to email/UI | M | **PARTIAL** | No output sanitisation gate |
| **E-001** | Evidence-to-claim drift | H | **OPEN** | Copy audit reduced BLOCKERs; monitor |
| **E-002** | Recruiter marketing vs shipped SKU | M | **OPEN** | Alignment audit §5 |
| **E-003** | Metric inconsistency (job counts) | M | **OPEN** | Multiple endpoints — investor confusion |
| **E-004** | Premature auto-apply re-enable | H | **BLOCKED** | Ops pause + product gates |
| **E-005** | External recruiter invite blast radius | M | **BLOCKED** | H5c HOLD; GO SMALL path documented |

---

## 17 — Co-founder scoring (1–5)

**Scale:** 1 = unacceptable for partnership decision · 3 = pilot-credible · 5 = production-scale ready

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| **Technical honesty** | **4** | Extensive gate docs; explicit NO-GO; paused auto-apply |
| **Production infra** | **4** | Real deploy; health green; O7 drill PASS |
| **Security posture** | **4** | S2 PASS; rate limits; risk register — nonce/DSR gaps remain |
| **Test & CI discipline** | **3.5** | Large pytest suite; smoke subset; docs PRs skip CI paths |
| **Candidate product depth** | **3.5** | Dashboard, matching, calendar, transparency — not full career intelligence vision |
| **Recruiter product depth** | **2.5** | Inbox strong for pilot; calendar/SSO/SKU thin |
| **Data corpus & matching** | **3** | Thousands validated jobs; not marketplace scale |
| **Legal / GDPR readiness** | **3** | Export live; delete manual; pilot waivers signed |
| **GTM / launch discipline** | **4** | Public NO-GO held; H5c HOLD; 0 external invites |
| **Documentation traceability** | **4.5** | Matrices, smokes, runbooks, evidence index |
| **Co-founder alignment risk** | **3** | Vision (autonomous agent) vs reality (paused automation) — must stay explicit |
| **Fundraising narrative safety** | **3.5** | Truthful with caveats; avoid two-sided / revenue / scale claims |

**Weighted co-founder technical maturity:** **~3.5 / 5** — strong **pilot-stage** engineering org, **not** scale-stage.

*Comparison:* CTO delta `2026-05-27` reported **7.4/10** internal maturity on security/ops axis — different scale (1–10 internal vs 1–5 co-founder partnership lens).

---

## 18 — 30 / 60 / 90 roadmap (co-founder)

### 0–30 days (pilot hardening — no public GO)

| Priority | Action | Owner | Status taxonomy target |
| -------- | ------ | ----- | ---------------------- |
| P0 | Complete H5d slot-1 scoring; founder sign H5c **GO SMALL 1** or **HOLD** | Founder | **PILOT-READY** |
| P0 | Maintain S2 enforce monitoring; rollback runbook ready | Founder/Ops | **LIVE** |
| P1 | Invite **≤2** trusted recruiters only after GO SMALL sign-off | Founder | **BLOCKED** until H5c |
| P1 | Re-verify S8/S9 secrets + deps before any wider audience | Engineer | **LIVE** |
| P2 | Close GAP-04 documentation or waiver for public launch narrative | Founder | **DOCS-ONLY** |

### 30–60 days (recruiter trust + candidate loop)

| Priority | Action | Notes |
| -------- | ------ | ----- |
| P1 | Recruiter inbox feedback from slot-1 reviewers | No feature creep without evidence |
| P2 | Self-service account delete (L6) — reduce public launch blocker | Engineering |
| P2 | Recruiter token rotation policy (R-021) | Ops doc |
| P3 | ICS/WebCal founder smoke for O5 full public narrative | **PARTIAL** → **LIVE** |

### 60–90 days (launch gate preparation — not automatic GO)

| Priority | Action | Notes |
| -------- | ------ | ----- |
| P1 | Founder **limited-launch decision** — distinct from public NO-GO | Explicit doc |
| P2 | Load/soak test baseline | **ROADMAP** today |
| P2 | Employer SSO / company accounts — replace token pilot | **NOT LIVE** |
| P3 | Auto-apply re-enable **only** with board allowlist + recruiter-visible controls | **BLOCKED** now |
| P3 | Public launch checklist full green including L6/O5 without waivers | **BLOCKED** |

**Explicit non-goals (90d):** Public LinkedIn launch · mass auto-apply · delegated KYC submit · ATS OAuth live claims · revenue targets.

---

## 19 — Do-not-claim list (co-founder communications)

| Do **not** claim | Say instead |
| ---------------- | ----------- |
| Public launch is live | Controlled pilot / demo; public **NO-GO** |
| Two-sided marketplace | Candidate-first, recruiter-supporting pilot inbox |
| Auto-apply runs while you sleep | Auto-apply **PAUSED**; manual/ops paths only |
| Delegated / KYC apply live | **NOT LIVE**; gateway hard-false |
| Recruiter calendar sync live | Placeholder — **NOT LIVE** |
| 10k+ jobs / full EU coverage | ~652–2.7k validated depending on metric; pilot corpus |
| Paying customers / MRR | Stripe ready; **no evidenced MRR** in gate docs |
| Guaranteed interviews | Ranking + consent; recruiter decides |
| ATS integrations live | Stubs/backlog unless founder verifies credentials |
| Talent pool / SSO for employers | **NOT LIVE** for GTM |
| External recruiter pilot started | **0 invites**; H5c **HOLD** |
| "Invest now" CTO recommendation | See §20 — conditional pilot credibility only |

---

## 20 — Final CTO verdict (honest — not a fake recommendation)

### Verdict matrix

| Question | Answer | Confidence |
| -------- | ------ | ---------- |
| Is there a real product on real infra? | **Yes** | High |
| Safe for controlled candidate pilot (10–20 named)? | **Yes** — with waivers disclosed | High |
| Safe for investor/CTO technical demo? | **Yes** — curated Nova Hiring path | High |
| Safe for uncontrolled public launch? | **No** | High |
| Safe to claim autonomous apply at scale? | **No** — **PAUSED** / **NOT LIVE** | High |
| Safe to start external recruiter cohort without H5c GO? | **No** — **HOLD** | High |
| Ready for co-founder partnership on **scale GTM**? | **Not yet** — pilot proof points first | Medium |

### CTO statement (audit opinion)

TWIN demonstrates **above-average early-stage engineering discipline** for a solo-founder-led MVP: production deploy, security gates, explicit NO-GO documentation, and recruiter inbox smokes are **unusually thorough** for Phase 1. The **product vision** (autonomous career agent) **outpaces live automation** by design — auto-apply and delegated submit are **intentionally off**, which is **trust-positive** but **creates co-founder alignment risk** if either party expects "agent applies while I sleep" in the next quarter without explicit re-enable work.

**This audit does not recommend:** investment, joining as co-founder, public launch, or enabling auto-apply/delegated apply.

**This audit does support:** continued **controlled pilot** execution, **H5c GO SMALL 1** path after slot-1 scoring, and **truthful** technical diligence conversations with disclosed waivers (L6, O5) and blockers (public NO-GO, 0 external invites).

**Single highest-leverage next action:** Founder completes `H5D_SLOT1_REVIEWER_SHORTLIST_PACK` §6 scoring and signs H5c option **HOLD** or **GO SMALL 1** — no code required.

---

## Validation (this session)

| Check | Result |
| ----- | ------ |
| Mode | Docs-only — no source edits |
| `pytest tests/test_csp_report*.py` | **9 passed** |
| Hard bans | No deploy · env · DB · secrets · public GO · invitations |

---

## Related docs

- Briefing: `docs/CTO_COFUNDER_BRIEFING_2026-06-07.md`
- Evidence index: `docs/CTO_COFUNDER_EVIDENCE_INDEX_2026-06-07.md`
- Launch matrices (stance unchanged): `PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`, `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`, `PRODUCTION_REALITY_MATRIX_2026-05-27.md`

---

## Hard bans honoured

- ✅ Docs only
- ✅ No deploy / Railway / Vercel / env / DB / migrations
- ✅ No public launch GO · no auto-apply / delegated enable · no invitations
- ✅ No invented revenue, users, or capabilities
- ✅ No fake "join as co-founder" recommendation
- ✅ Launch stance unchanged in gate matrices
