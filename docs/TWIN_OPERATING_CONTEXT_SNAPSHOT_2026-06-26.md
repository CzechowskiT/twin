# TWIN Operating Context Snapshot — 2026-06-26

**Cel:** Jednorazowy snapshot operacyjny dla agentów, founderów i smoke wrapperów CI. Uzupełnia (nie zastępuje) [TWIN_OPERATING_CONTEXT_2026-06-26.md](./TWIN_OPERATING_CONTEXT_2026-06-26.md).

**Branch capture:** `docs/twin-operating-context-snapshot-2026-06-26`  
**repo_head:** `73ec745ab12dd151adf05c2c66b67411e6bcf7ec`  
**Captured UTC:** 2026-06-27

**Referencje kanoniczne:**
- [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md)
- [PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md)
- [.cursorrules](../.cursorrules)

---

## 1. Product stance

| Gate | Status | Znaczenie |
|------|--------|-----------|
| **Public launch** | **NO-GO** | Brak publicznego spike'u, marketingu „jesteśmy live”, otwartego signupu. Tylko pilot/demo/inwestor z ograniczeniami. |
| **P0 performance** | **OPEN** | Brak podpisanego Phase 3B, budżetów Lighthouse, zamknięcia multitab/stress. |
| **Phase 3B controlled multitab** | **HARD BLOCKED** | Founder STOP. Harness istnieje (PR #167), **nie uruchamiać** do explicit unblock. |
| **Controlled pilot / demo** | **GO** (z ograniczeniami) | Named users, founder-watched. H5c/H5d recruiter cohort **HOLD**; external invites **0**. |
| **Auto-apply / delegated apply** | **PAUSED / NOT LIVE** | Beat może być OK na health; ścieżka submission nie jest live dla publiczności. |

### Deploy SHAs (curl prod 2026-06-27)

| Pole | SHA / wartość |
|------|---------------|
| **Current branch (docs capture)** | `docs/twin-operating-context-snapshot-2026-06-26` |
| **Scaffold HEAD** (`origin/cursor/phase1-monorepo-scaffold`) | `73ec745ab12dd151adf05c2c66b67411e6bcf7ec` (PR #299) |
| **prod_frontend_commit** (Vercel) | `73ec745ab12dd151adf05c2c66b67411e6bcf7ec` — **ALIGNED** ze scaffold |
| **prod_api_commit** (Railway) | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (PR #281, 2026-06-24) |
| **public-health** | `status=ok`, `db_ok=true` |
| **commit_interpretation** | Frontend (Vercel) i API (Railway) różnią się — typowe po frontend-only PR; Alembic head weryfikować osobno. |
| **Hiring Journey routes (prod HTTP)** | **5/5 → 200** |

**North star (niezmienny):** Kalendarz akceptacji — pre-kwalifikowane sloty rozmów, nie spam w skrzynce. Każda powierzchnia musi redukować szum w kierunku acceptance-ready calendar items.

---

## 2. Hard rules

Reguły twarde z konwersacji, `.cursorrules` i dokumentacji operacyjnej — **nie łamać bez explicit founder sign-off:**

| # | Reguła |
|---|--------|
| H1 | **No public launch GO** — brak marketing spike, brak claimów „live” |
| H2 | **P0 performance OPEN** — nie twierdzić, że performance jest zamknięte |
| H3 | **Phase 3B HARD BLOCKED** — zero multitab/browser stress do founder unblock |
| H4 | **No Phase 3B execution** — static guards OK; browser variant **ZAKAZANY** |
| H5 | **No live workflow z Hiring Journey** — preview/demo only (`readiness_preview`) |
| H6 | **No candidate movement, scheduling write, invites, email, calendar sync, ATS writeback, payments** z preview surfaces |
| H7 | **Auto-apply PAUSED / delegated apply NOT LIVE** |
| H8 | **Recruiter calendar sync NOT LIVE** |
| H9 | **Microsoft busy-read prod gates OFF** — `microsoft_busy_read_enabled=false`, connect gate OFF, calendar write OFF |
| H10 | **External recruiter invites 0** — H5c/H5d **HOLD** |
| H11 | **No secrets** w repo/docs/logach — nigdy `.env`, tokeny, API keys |
| H12 | **No agent-initiated prod DB migrations** — Alembic read-only chyba że runbook |
| H13 | **No CS tennis placement verification** — self-serve machine-assisted path ([PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md)) |
| H14 | **No headless multitab e2e by default** — Playwright wymaga explicit env flags (CPU storm 2026-06-16) |
| H15 | **i18n** — zero user-facing literals poza `t()` / locale-aware backend; API wysyła `X-Locale` |
| H16 | **Backend/API constraints** — canonical placement-events: `/api/v1/placement-events` (401/403 unauth OK); `/api/placement-events` bez `/v1` → 404 expected |
| H17 | **Auth constraints** — JWT w localStorage (Phase 2 lift do httpOnly); OAuth server-side redirect; nie osłabiać auth dla smoke |
| H18 | **Workflow/scheduling bans** — Hiring Journey + Scheduling Proposal Pack: brak `<button>`, `<form>`, primary CTA; affirmative live-action copy guardowany (#296) |
| H19 | **Prompt / raport format** — zbiorczy raport PL po zadaniu; launch stance zawsze: NO-GO / P0 OPEN / Phase 3B HARD BLOCKED; SHA drift klasyfikować per [PROD_HEALTH_COMMIT_INTERPRETATION](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md) |
| H20 | **Docs-only batch** — `docs_only_drift: true` → `acceptable_docs_only_drift`; smoke dozwolony |

---

## 3. PR history table

### Hiring Journey batch (#291–#297) — minimum wymagany

| PR | Tytuł | Merge SHA | Scope | Testy | Prod status | Notatki |
|----|-------|-----------|-------|-------|-------------|---------|
| [#291](https://github.com/CzechowskiT/twin/pull/291) | Add hiring journey timeline preview | `6d40ea3` | Core timeline, 5 routes, demo data, component (~20 plików) | `test:hiring-journey` (initial) | FE deploy | Read-only `readiness_preview`; brak backendu |
| [#292](https://github.com/CzechowskiT/twin/pull/292) | feat(hiring): add journey inbound cross-links | `0d3fb89` | Inbound links: trust, profile 360, scheduling, placement, board | trust + profile inbound tests | FE-only | Safe-route cross-links only |
| [#293](https://github.com/CzechowskiT/twin/pull/293) | Hiring journey read-only UI polish | `eb864de` | Read-only badge/note copy (6 plików) | read-only markers | FE-only | Wzmacnia demo-only semantics |
| [#294](https://github.com/CzechowskiT/twin/pull/294) | Polish hiring journey route consistency (5 surfaces) | `1eb0b16` | Route surface props, persona labels, alias nav | tests 12–16 | FE-only | Board blocked preserved |
| [#295](https://github.com/CzechowskiT/twin/pull/295) | Hiring Journey evidence provenance cards | `349a645` | Provenance cards per step (5 plików) | provenance metadata | FE-only | Monitor-only evidence |
| [#296](https://github.com/CzechowskiT/twin/pull/296) | Harden hiring journey negative live-action guard | `4be155c` | Negation-window guard dla affirmative copy | test 17 | FE-only | Scaffold HEAD po #296: `4be155c` |
| [#297](https://github.com/CzechowskiT/twin/pull/297) | docs: hiring journey traceability memo (#291–#296) | `a30e28c` | Traceability memo (1 plik) | N/A (docs) | `acceptable_docs_only_drift` | Kanoniczny memo traceability |

### Kontynuacja batch (#298–#299)

| PR | Tytuł | Merge SHA | Scope | Testy | Prod status | Notatki |
|----|-------|-----------|-------|-------|-------------|---------|
| [#298](https://github.com/CzechowskiT/twin/pull/298) | Hiring Journey provenance source-module drill-in (read-only) | `7a88a101` | Drill-in links na provenance cards (5 plików) | test 18 (25 total) | FE deploy → prod `73ec745` | Branch `cursor/hiring-journey-provenance-drill-in` — **MERGED**; brak `feature/hiring-journey-drill-in` |
| [#299](https://github.com/CzechowskiT/twin/pull/299) | Add TWIN operating context source of truth | `73ec745` | Operating context doc (1 plik) | `test:hiring-journey` PASS, build PASS | FE aligned | Scaffold HEAD; browser smoke skipped (docs-only) |

### Wcześniejsze PR kontekstowe (#287–#290) — z traceability / operating context

| PR | Tytuł | Merge SHA | Scope | Notatki |
|----|-------|-----------|-------|---------|
| [#287](https://github.com/CzechowskiT/twin/pull/287) | Polish profile pipeline and trust native copy | `389dcaf` | i18n native copy — profile, trust | FE-only |
| [#288](https://github.com/CzechowskiT/twin/pull/288) | Improve long-form native copy and locale QA | `bac6334` | Long-form EN/PL polish | FE-only |
| [#289](https://github.com/CzechowskiT/twin/pull/289) | Stabilize P0 persona navigation smoke | `5288855` | P0 persona nav smoke hardening | Guard-only |
| [#290](https://github.com/CzechowskiT/twin/pull/290) | Add scheduling proposal pack preview | `6c767fa` | Read-only scheduling proposal routes | Blocked calendar/invite/email boundaries |

**Backend reference (API lag):** PR #281 → `6d6d1e5` — ostatni backend deploy; #287–#299 nie dotykały API.

---

## 4. Current architecture

### Frontend (Next.js App Router, Vercel)

**Persony i główne trasy (skrót):**

| Persona | Przykładowe trasy |
|---------|-------------------|
| Candidate | `/dashboard`, `/dashboard/calendar`, `/dashboard/jobs`, `/dashboard/trust/*`, `/dashboard/hiring-journey`, `/profile/hiring-journey`, `/dashboard/scheduling-proposal`, `/dashboard/offer-readiness` |
| Recruiter | `/recruiter/*`, `/recruiter/hiring-journey`, `/workspace/recruiter` |
| Company | `/company/*`, `/company/hiring-journey` |
| Board | `/board/*`, `/board/hiring-journey`, `/board/placement-verification`, `/board/production-persistence-status` |
| Investor | `/investor/*`, `/login/investor` |
| Marketing | `/(marketing)/*` — landing, compare, careers, status |
| Auth | `/login`, `/register`, `/auth/callback`, `/forgot-password`, `/reset-password` |
| Admin | `/admin/*` |
| Placement | `/placement/*` |

**Proxy health:** `GET /api/public-health` (Vercel route → Railway `/api/v1/health`).

### Backend / API (FastAPI, Railway)

| Aspekt | Status |
|--------|--------|
| **API base (prod)** | `https://twin-production-bcd9.up.railway.app` |
| **Health** | `/api/v1/health`, `/api/v1/health/celery-status`, ops via `?ops=1` |
| **Auth** | Email/password + OAuth (Google, GitHub, LinkedIn, Microsoft); Apple optional (`apple_oauth_configured=false` na prod) |
| **Celery + Redis** | Worker + beat; scrape beat enabled; auto-apply beat — **PAUSED** dla public |
| **Postgres** | `db_ok=true`; Alembic head weryfikować osobno |
| **Integracje (prod health)** | Mail ✅, Google OAuth/Calendar ✅, GitHub ✅, Microsoft OAuth ✅, MS Calendar configured ✅, MS busy-read/write **OFF**, Stripe checkout ready ✅, scrape worker ✅ |

### Auth model

1. **Email/password** — bcrypt, GDPR consent at signup, forgot/reset/change password flows.
2. **OAuth** — server-side redirect → API callback → JWT → `FRONTEND_URL/auth/callback?token=…`.
3. **Token storage** — localStorage (`twin_access_token`); Bearer JWT na API calls; `X-Locale` header.
4. **Account linking** — `oauth_accounts` table; same email → one user.
5. **Prod smoke** — auth shell bez sesji = non-failure dla read-only route checks; founder JWT dla persistence smokes.

### Deployment model

| Platform | Co hostuje | SHA field | Trigger |
|----------|------------|-----------|---------|
| **Vercel** | Next.js frontend + `/api/public-health` proxy | `frontend_commit` | Zmiany w `frontend/`; merge do linked branch |
| **Railway** | FastAPI, Celery, Postgres | `api_commit`, `git_commit`, `backend_git_commit` | Backend, migracje |

### Interpretacja commitów Vercel/Railway

| Scenariusz | Wzorzec | Akcja |
|------------|---------|-------|
| Frontend-only (#287–#299) | `frontend_commit` > `api_commit` | **Expected** — weryfikuj FE slice |
| Backend-only (#281) | `api_commit` > `frontend_commit` | Weryfikuj Alembic + API smoke |
| Docs-only | `repo_head` ahead; `docs_only_drift: true` | `acceptable_docs_only_drift` |
| Full-stack aligned | Oba SHA = scaffold HEAD | Potwierdź Alembic head osobno |

**Prod URL:** https://twin-sooty.vercel.app

**Ważne:** Nowszy Vercel `frontend_commit` **nie dowodzi** migracji Railway. Hiring Journey (#291–#298) **nie ma zależności backendowej** — wystarczy FE deploy.

---

## 5. Hiring Journey status

Pełny detail: [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md).

### Routes i persony

| Route | Surface | Persona | Status (demo) |
|-------|---------|---------|---------------|
| `/dashboard/hiring-journey` | `candidate_dashboard` | Candidate | `preview` |
| `/profile/hiring-journey` | `candidate_profile` | Candidate (alias) | `preview` |
| `/recruiter/hiring-journey` | `recruiter` | Recruiter | `ready_for_human_review` |
| `/company/hiring-journey` | `company` | Company | `in_review` |
| `/board/hiring-journey` | `board` | Board | **`blocked`** |

**11 kroków:** Discovery → Matching → Trust Review → Candidate Readiness → Offer Readiness → Scheduling Proposal → Interview Preparation → Decision Review → Offer Decision → Placement Verification → Onboarding Preview.

### Moduły i pliki

| Plik | Rola |
|------|------|
| `frontend/src/lib/hiring-journey.ts` | Routes, markers, cross-links, guards, drill-in |
| `frontend/src/lib/hiring-journey-demo-data.ts` | Demo bundle, blocked actions, audit |
| `frontend/src/components/hiring-journey/HiringJourneyTimeline.tsx` | Timeline UI |
| `frontend/src/app/*/hiring-journey/page.tsx` | 5 persona routes |
| `frontend/scripts/hiring-journey.test.ts` | Unit/guard tests (25) |
| `frontend/e2e/hiring-journey-browser.spec.ts` | Browser smoke (optional) |

### Safety boundaries (enforced)

| Boundary | Status |
|----------|--------|
| Automatic candidate advancement | **BLOCKED** |
| Interview scheduled / event write | **BLOCKED** |
| Invite / email sent | **BLOCKED** |
| Calendar sync / write | **BLOCKED** |
| ATS writeback | **BLOCKED** |
| Payment / invoice | **BLOCKED** |
| External employer confirmation | **BLOCKED** |
| Microsoft Graph live busy-read | **NOT SHIPPED** |
| Mutation controls (`<button>`, `<form>`, CTA) | **Forbidden** |
| Affirmative live-action copy | **Guarded** (#296 negation window) |
| Board step nav | **Blocked** — monitor-only provenance |
| Live workflow engine | **NOT SHIPPED** |

### Test coverage (2026-06-27, scaffold `73ec745`)

| Command | Wynik |
|---------|-------|
| `npm run test:hiring-journey` | **PASS** (25/25) |
| `npm run test:hiring-journey-browser` | **NOT RUN** (optional; wymaga env flags) |
| `npm run test:candidate-trust-overview` | **PASS** (inbound link) |
| `npm run test:candidate-profile-360` | **PASS** (inbound link) |
| `npm run test:i18n-native-copy-quality` | **PASS** |
| `npm run test:i18n-coverage` | **PASS** |
| `npm run test:trust-language-guard` | **PASS** |
| Prod HTTP 5 routes | **PASS** (200 × 5) |

### Branch drill-in note

- **`feature/hiring-journey-drill-in`:** **NIE ISTNIEJE** na remote.
- **`cursor/hiring-journey-provenance-drill-in`:** **MERGED** via PR #298 (`7a88a101`); ancestor of scaffold HEAD `73ec745`.
- **Unmerged drill-in work:** **None**.

---

## 6. Open blockers

### P0 (performance)

- Phase 3B controlled multitab **not executed** — founder STOP.
- Brak stress/multitab/headless verification batch sign-off.
- Brak Lighthouse budget closure.
- Heavy demo surfaces — mitigations merged, gate **OPEN**.

### Phase 3B

- Test infra merged (PR #167) — **forbidden to run browser variant**.
- Prior session PARTIAL (local 21/21; prod not verified).
- Browser scripts disabled by default since 2026-06-16 CPU storm.

### Launch gates (skrót)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
| Hiring Journey live engine | **NOT SHIPPED** |
| UI preview (5 routes) | **YES** |
| Unit/guard tests | **YES** |
| Microsoft busy-read prod | **OFF** |
| Auto-apply public | **PAUSED** |
| External recruiter invites | **0** (H5c/H5d HOLD) |
| FE/API SHA | FE **ALIGNED** (`73ec745`); API **lags** (`6d6d1e5`) — expected |

### Ryzyka

- **API drift** — `api_commit` za `frontend_commit`; nie failure sam w sobie; Alembic osobno.
- **Auth shell** — prod browser smoke bez sesji = accepted non-failure.
- **Market scrape coverage 6%** — ops monitoring, nie launch blocker dla preview.
- **Vercel canonical alias drift (O6)** — documented workaround.
- **JWT localStorage** — Phase 2 lift pending (security backlog).

---

## 7. Next 30 steps roadmap

Sensowne autonomiczne batche z traceability + operating context — ordered by dependency and safety:

1. Merge ten snapshot doc; traktuj jako companion do operating context source of truth.
2. Prod hiring-journey browser smoke po każdym FE deploy: `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:hiring-journey-browser`.
3. Polish provenance drill-in UX copy (EN/PL) — read-only only (#298 follow-up polish).
4. Investor-room i18n parity sweep (`test:investor-room-mvp`, `test:i18n-premium-product`).
5. Long-form native copy QA (#287/#288 pattern) na pozostałych surfaces.
6. Staging Microsoft busy-read smoke gdy operator JWT dostępny — **nie flipować prod gates**.
7. Document staging smoke evidence w MICROSOFT_BUSY_READ follow-up.
8. Founder authenticated prod persistence smoke re-run z JWT.
9. Alembic prod head read-only re-check (`050_stripe_webhook_events`).
10. P0 persona navigation browser smoke on prod (optional, flagged).
11. Shell fix dla Phase 3B blocker — **founder review przed multitab run**.
12. Phase 3B static guards only — **no browser** until unblocked.
13. Scheduling proposal pack cross-link audit z hiring journey step 6.
14. Offer readiness ↔ scheduling decision context alignment.
15. Placement verification preview ↔ hiring journey step 10 link audit.
16. Board monitor routes — confirm no live-action CTAs.
17. Recruiter inbox decision rail readability regression.
18. Company hiring command center perf memoization audit.
19. Dashboard lazy-load inventory update w P0 performance doc.
20. `test:p0-performance-guardrails` batch po substantive FE changes.
21. i18n rendered homepage guard.
22. Cookie consent + analytics consent tests w CI slice.
23. Public health regression pytest po API-touching PRs only.
24. Scrape ops visibility — `market_coverage_progress_pct` trend.
25. Limited recruiter pilot: founder supplies H5d slot-1 shortlist names.
26. H5c GO SMALL 1/2 decision pack — **no outbound until explicit GO**.
27. Vercel canonical alias drift check.
28. Update traceability memo jeśli hiring journey tests > 25.
29. Investor demo dry-run against prod z curated accounts.
30. Re-capture §1 SHAs po następnym merged PR batch.

---

## 8. Important prior decisions

| Decyzja | Data / PR | Uzasadnienie |
|---------|-----------|--------------|
| Hiring Journey = read-only preview, nie workflow engine | #291–#298 | Redukcja szumu; human review przed live action; zgodne z north star |
| Board route permanently blocked dla step nav | #294, traceability | Board = evidence/monitor-only; brak advancement CTAs |
| Negative live-action copy guard z negation window | #296 | Blokuje affirmative „scheduled/sent/synced” przy zachowaniu explicit negations |
| Provenance drill-in read-only, board drill-in blocked | #298 | Deep-link do readiness routes bez live mutations |
| Phase 3B HARD BLOCKED po CPU storm | 2026-06-16 | Playwright multitab wyłączony domyślnie; founder STOP |
| Auto-apply PAUSED dla public | launch gates | Nightly beat OK ≠ live submission path |
| Microsoft busy-read prod gates OFF | 2026-06-24 docs | Staging prep first; smoke blocked bez operator JWT |
| Placement verification: no CS tennis | `.cursorrules` | Self-serve machine-assisted; exception queues dla disputes |
| JWT localStorage (Phase 2 → httpOnly) | audit 2026-05-26 | Known security backlog; nie osłabiać dla smoke |
| Frontend/API deploy split Vercel/Railway | PROD_HEALTH doc | SHA drift expected; Alembic separate check |
| Docs-only drift acceptable for smoke | PROD_HEALTH doc | `docs_only_drift: true` → smoke allowed |
| i18n mandatory — no raw literals | `.cursorrules`, I18N.md | `X-Locale` + `t()` everywhere |
| External recruiter invites 0 | LIMITED_RECRUITER_PILOT | H5c/H5d HOLD until founder GO SMALL |
| Canonical placement-events path `/api/v1/...` | persistence smoke | 404 on path without `/v1` is expected |
| Traceability memo as Hiring Journey canonical ops doc | #297 | Single source for routes, tests, gates |
| Operating context as agent source of truth | #299 | Consolidated stance for autonomous agents |

---

## Hard bans honoured (this doc)

- Docs-only — no product code changes.
- No deploy, Railway, or Vercel config changes.
- No DB migration.
- No public launch messaging.
- No secrets in this doc.

**Public launch: NO-GO · P0: OPEN · Phase 3B: HARD BLOCKED**
