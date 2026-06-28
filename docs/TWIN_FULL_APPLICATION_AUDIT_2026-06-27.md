# TWIN Full Application Audit — 2026-06-27

**Audience:** Board, CTO, founders — actionable, evidence-based inventory.  
**Scope:** Entire TWIN monorepo (frontend Next.js, backend FastAPI, CI, docs) at scaffold HEAD.  
**Method:** Static code inspection, prod `public-health`, required guard scripts, no runtime mutations.

**Related baselines:**
- [TWIN_OPERATING_CONTEXT_2026-06-26.md](./TWIN_OPERATING_CONTEXT_2026-06-26.md) — canonical operator snapshot (#299–#323)
- [TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md](./TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md) — Slices 4–11 shipped; Slice 12 blocked
- [TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md](./TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md) — persona module / SoR registry (#311–#322)
- [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md) — P0 performance gate (#304)
- [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md) — hiring journey (#291–#298)

**Reconciliation (2026-06-28, PR #314 onto scaffold post-#323):** Original evidence captured at `28d439b` (2026-06-27). Sections below retain that static-inspection baseline; SHA tables, slice status, and resolved truthfulness items are updated to match operating context and launch plan — prod FE `dcacc9d` (Slice 11 / #322), API `6d6d1e5`, scaffold `7ad86c7` (#323), `docs_only_drift: true` acceptable.

---

## 1. Executive Summary

TWIN is a **Phase 1 MVP monorepo** with a large, honest frontend surface (230 routes), a production FastAPI backend on Railway (652 validated jobs, DB healthy), and extensive static guard coverage (~183 frontend test scripts). The product **works in controlled pilot/demo mode** for named users — recruiter inbox, candidate matching, Google Calendar OAuth, Stripe waitlist, placement verification previews — but **public launch remains NO-GO**.

**Headline findings (2026-06-27):**

| # | Finding | Class | Launch impact |
|---|---------|-------|---------------|
| 1 | **Public launch NO-GO** codified in `LAUNCH_STANCE = "noGo"` | **BLOCKED** | Hard gate |
| 2 | **P0 performance OPEN** — no Phase 3B proof, Playwright default OFF | **BLOCKED** | Hard gate |
| 3 | **Phase 3B multitab HARD BLOCKED** (founder STOP) | **BLOCKED** | Hard gate |
| 4 | **Auto-apply / delegated apply PAUSED** — beat may show OK; submission not live | **BLOCKED** | Hard gate |
| 5 | Prod FE **`dcacc9d`** (#322); API **`6d6d1e5`** (expected drift); scaffold **`7ad86c7`** (#323 docs) | **WORKING** | Ops OK; `docs_only_drift` acceptable |
| 6 | SoR registry **reconciled** (#312): 83 entries incl. pipeline/calendar/career compass | **WORKING** | QA improved |
| 7 | **Company SoR token hints** — Slice 3 (#313) **shipped** (`86c8c1b`) | **WORKING** | Resolved post-audit |
| 8 | Recruiter inbox duplicate cards — Slice 4 (#316) **shipped**; marketing bounded (#322) | **WORKING** | Resolved post-audit |
| 9 | **Microsoft calendar write/busy-read disabled** in prod health | **PILOT_LIMITED** | Corporate calendar gap |
| 10 | **Market coverage 6%** — scrape beat OK but thin inventory | **PILOT_LIMITED** | Product depth |

**Verdict:** Ship controlled demos and investor/board evidence surfaces. Do **not** announce public launch, enable auto-apply, or run Phase 3B until explicit founder unblock.

---

## 2. Source of Truth / SHA / Environment Snapshot

### Git capture (2026-06-27 original; reconciled 2026-06-28 post-#323)

| Field | Value |
|-------|-------|
| **Branch** | `cursor/phase1-monorepo-scaffold` (base); audit PR #314 from `docs/full-application-audit-2026-06-27` |
| **repo_head (scaffold)** | `7ad86c7eafc42878726bd643c8fbd50753c3af60` (`7ad86c7`, PR #323 operating-context refresh) |
| **Original audit HEAD** | `28d439b581ff08234dee46ac0c4fcfe9957ce95f` (`28d439b`, 2026-06-27 static inspection) |
| **Working tree** | Clean at reconcile |
| **Recent merges** | #323 operating context; #315–#322 Slices 4–11; #313 Slice 3; #311–#312 feature/SoR audits |

### Production (`GET https://twin-sooty.vercel.app/api/public-health`)

| Field | Value |
|-------|-------|
| **status** | `ok` |
| **db_ok** | `true` |
| **prod_frontend_commit** | `dcacc9d5c7fc30d56593994babd3e50a8d1aa863` (`dcacc9d`, PR #322 Slice 11) |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`) |
| **alignment_status** | **Frontend ALIGNED** with prod at `dcacc9d`; scaffold **`7ad86c7`** docs-only ahead (`docs_only_drift: true`, acceptable); **API expected drift** (#309–#322 frontend-only) |
| **validated_jobs** | 652 |
| **market_coverage_progress_pct** | 6 |
| **stripe_checkout_ready** | true |
| **scrape_beat_enabled** | true |
| **google_oauth_configured** | true |
| **microsoft_oauth_configured** | true |
| **microsoft_busy_read_enabled** | false |
| **microsoft_calendar_write_enabled** | false |
| **apple_oauth_configured** | false |
| **linkedin_oauth_configured** | true |

**Interpretation:** Vercel FE SHA proves frontend deploy; Railway API SHA does **not** prove Alembic head — verify migrations separately ([PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md)).

### Environment topology

| Layer | Host | Stack |
|-------|------|-------|
| Frontend | Vercel (`twin-sooty.vercel.app`) | Next.js App Router |
| API | Railway | FastAPI + PostgreSQL |
| Workers | Railway/Celery + Redis | Scrapers, nightly beats |
| CI | GitHub Actions `.github/workflows/smoke.yml` | Backend pytest subset + frontend build + prod-health on scaffold push |

---

## 3. Product Surface Audit (All Personas)

**Classification legend:** WORKING · READ_ONLY_WORKING · PILOT_LIMITED · PLACEHOLDER · BLOCKED · MISLEADING_OR_RISKY

### Candidate (12 workspace cards + 23 SoR entries)

| Surface | href / scope | Class | Evidence |
|---------|--------------|-------|----------|
| Profile | `/profile` | **WORKING** | API-backed sections |
| Jobs / Matches | `/dashboard/jobs`, `/dashboard/matches` | **WORKING** | Distinct workspace pages (#309 area) |
| Career compass | `/dashboard/career` | **READ_ONLY_WORKING** | In SoR post-#312 as `candidate_career_compass` pilot |
| Calendar | `/dashboard/calendar` | **READ_ONLY_WORKING** | Google OAuth read; no recruiter sync |
| Applications | `/dashboard/applications` | **READ_ONLY_WORKING** | Transparency; auto-apply paused |
| Auto-apply | `/dashboard#auto-apply-readiness` | **BLOCKED** | Ops pause; `paused` badge |
| Trust center (11 routes) | `/dashboard/trust/*`, `/profile/trust/*` | **PILOT_LIMITED** | SoR-only; Slice 7 (#318) adds workspace `trust_center` card |
| Hiring journey | `/dashboard/hiring-journey` | **READ_ONLY_WORKING** | Preview only; 25/25 static tests |

### Recruiter (15 workspace cards + 23 SoR entries)

| Surface | href / scope | Class | Evidence |
|---------|--------------|-------|----------|
| Inbox | `/recruiter/inbox` | **WORKING** | Token auth; accept/decline; prod-smoked historically |
| Pipeline | `/recruiter/pipeline` | **WORKING** | In SoR post-#312 (`recruiter_pipeline` live) |
| Jobs / Search | `/recruiter/jobs`, `/recruiter/search` | **WORKING** | Workspace pool search |
| Calendar | `/recruiter/calendar` | **BLOCKED** | `not_live`; in SoR post-#312 |
| Trust review queue | `/recruiter/trust-review-queue` | **PILOT_LIMITED** | Demo queue |
| Notes / Scheduling / Audit cards | collapsed post-#316 (Slice 4) | **WORKING** | Duplicate inbox cards removed |
| Integrations / Talent radar | various | **PILOT_LIMITED** | `no_ats_sync`, `no_outreach` |

### Company (9 workspace cards + 18 SoR entries)

| Surface | href / scope | Class | Evidence |
|---------|--------------|-------|----------|
| Roles / Pipeline | `/company/roles`, `/company/pipeline` | **WORKING** | Pipeline in SoR post-#312 |
| Hiring cockpit / command center | demo journeys | **PILOT_LIMITED** | `no_ats_sync` |
| Billing | `/company/billing` | **BLOCKED** | Honest `not_live` |
| Dashboard SoR | `company_dashboard` | **WORKING** | `hintKey` on all live company SoR modules post-#313 (Slice 3) |
| Settings card | removed post-#320 (Slice 9) | **WORKING** | Orphan card removed; dashboard via SoR only |

### Investor / Board (6+2 workspace + 19 SoR + 13 board pages)

| Surface | Class | Evidence |
|---------|-------|----------|
| Metrics / Roadmap / Calculator | **READ_ONLY_WORKING** | Doc-backed; forbidden traction patterns guarded |
| Data room / Placement preview | **PILOT_LIMITED** | Gated / preview |
| Board readiness (6 in SoR) | **READ_ONLY_WORKING** / **BLOCKED** | Mix of pilot + `not_live` tags |
| 7 board monitor routes | **READ_ONLY_WORKING** | Not in SoR hub — ops monitors only |

### Demo vs live boundary

- **Live (production API):** auth, jobs/matches, recruiter inbox decisions, Google calendar connect, Stripe waitlist, placement event reads where wired.
- **Preview/demo:** hiring journey, scheduling proposal pack, most company/recruiter collaboration surfaces, ATS import readiness, investor product proof deep-links.
- **Not live:** auto-apply submission, recruiter calendar sync, Microsoft calendar write, external invite campaigns, public launch signup spike.

---

## 4. System of Record / Navigation / Registry Audit

### Architecture (three layers)

1. **`SYSTEM_OF_RECORD_ROUTES`** — `frontend/src/lib/system-of-record-routes.ts` — **83 entries** (23 candidate, 23 recruiter, 18 company, 19 investor).
2. **Workspace module grids** — `*-workspace-modules.ts` (12/15/9/6+2 cards).
3. **Status UX** — `WorkspaceStatusBadge`, `SystemOfRecordBoundaryBadge`, `SystemOfRecordModuleCard`.

### Post-#312 reconcile (Slice 2 — merged)

Added SoR entries aligned with workspace-only routes:

| New SoR id | href | status | boundaryTags |
|------------|------|--------|--------------|
| `candidate_career_compass` | `/dashboard/career` | pilot | draft_only |
| `recruiter_pipeline` | `/recruiter/pipeline` | live | human_decision_required, no_ats_sync |
| `recruiter_calendar` | `/recruiter/calendar` | not_live | not_live |
| `company_pipeline` | `/company/pipeline` | live | human_decision_required, no_ats_sync |

**Static guards:** `test:system-of-record-navigation-hub` — **17/17 PASS** including reconciled workspace-only modules assertion.

### Remaining registry gaps (post-#322)

| Gap | Risk | Class |
|-----|------|-------|
| 7 board monitor routes not in SoR | Ops monitors invisible to SoR QA | **PILOT_LIMITED** (acceptable) |
| Slice **12** (P0 shell founder review) | **BLOCKED** — no Phase 3B until unblock | **BLOCKED** |
| Slice **13** (`p0-no-headless` + hiring-journey routes) | ✅ Shipped — 36 routes, static guards | Done |

### Hub wiring

SoR hub pages wired for all personas (`test:system-of-record-navigation-hub` test 9). Marker: `SYSTEM_OF_RECORD_HUB_MARKER = "system-of-record-navigation-hub"`.

---

## 5. Frontend Architecture Audit

| Area | Status | Evidence |
|------|--------|----------|
| Framework | Next.js App Router | 230 `page.tsx` routes; build PASS |
| Layout shells | `LightweightRouteShell`, `WorkspaceRouteLayout`, `PersonaWorkspaceGate` | P0 memory guards; Phase 3B concern on shell paint |
| Code splitting | `dynamic()` on heavy panels | Dashboard forecast, placement timeline, marketing marquee |
| Middleware | Bot guard + `/auth/signup` → `/register` redirect | `frontend/src/middleware.ts` — minimal, no auth enforcement |
| i18n | Central `i18n.ts` + `t()` | 4 locales; coverage tests PASS |
| Auth token | JWT in localStorage/sessionStorage fallback | `frontend/src/lib/auth.ts` |
| Marketing vs workspace | 89-logo marquee isolated to marketing | `PerformanceSafeMovingLogoMarquee` (~12 brands in workspace) |
| Deprecated chrome | `header.tsx`, `app-header.tsx` | Marked `@deprecated`; legacy imports only |

**Build:** `npm run build` PASS (~90s). **TypeScript:** `npx tsc --noEmit` PASS.

---

## 6. Backend/API Audit

| Area | Status | Evidence |
|------|--------|----------|
| Entry | FastAPI `backend/app/main.py` | CORS, SlowAPI rate limits, production OpenAPI disabled |
| API modules | 45 files under `backend/app/api/` | Jobs, auth, calendar, placement, recruiter inbox, stripe, etc. |
| Migrations | 69 Alembic versions | Latest heads require separate prod verification |
| Health | `/health`, `/public-health` proxy | Prod OK; feature flags exposed |
| Scrapers | pracuj.pl, rocketjobs.pl registry | 652 validated jobs; 6% market coverage |
| Celery | Beat + workers | Scrape beat enabled; auto-apply beat exists but **public path paused** |
| OAuth providers | Google, GitHub, Microsoft, LinkedIn configured | Apple not configured |
| Calendar | Google read/write configured; Microsoft write **disabled** in prod | public-health flags |
| Stripe | Checkout ready | Waitlist/billing pilot |
| Auto-apply | Service + nightly sweep code present | **BLOCKED** for public — readiness gates in tests |
| CI smoke subset | 8 pytest modules in `smoke.yml` | ~subset of full ~547 backend test files |

**API drift:** Backend at `6d6d1e5` while prod FE at `dcacc9d` — expected after frontend-only PRs #309–#322; no evidence of broken contract on audited routes.

---

## 7. Database / Persistence / Data Integrity Audit

| Area | Class | Evidence |
|------|-------|----------|
| PostgreSQL prod | **WORKING** | `db_ok=true` |
| Placement events | **PILOT_LIMITED** | Append-only event model; prod verification docs |
| Work queues / company feedback | **PILOT_LIMITED** | Live persistence docs (#WIRE batches); board monitors |
| Demo vs prod data | **READ_ONLY_WORKING** | Demo IDs (`demo-candidate-001`, `JOB_PIPELINE_DEMO_ID`) scoped in routes |
| Alembic prod head | **BLOCKED** (verification) | Must run separately — SHA drift does not prove migration state |
| Idempotency | **WORKING** | Migration `023_idempotency_auto_apply_partner_billing` |

See [PRODUCTION_PERSISTENCE_STATUS_2026-06-19.md](./PRODUCTION_PERSISTENCE_STATUS_2026-06-19.md), [PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md).

---

## 8. Auth / Authorization / Session Audit (PR #309 / #310)

### Session model

- JWT stored as `twin_access_token` in localStorage → sessionStorage fallback (`auth.ts`).
- Client-side expiry check via `isStoredTokenStale()` — clears malformed/expired tokens (30s skew).
- **No server-side session** in Next.js middleware — API validates JWT per request.

### PR #309 — Landing auth shell reconcile (merged `dbedcf0`)

**Problem:** Stale JWT caused landing to show authenticated chrome (logout) instead of login.  
**Fix:** `hasActiveSession()` clears expired tokens; `prepareForCredentialLogin()` before OAuth/password exchange.  
**Files:** `frontend/src/lib/auth.ts`, landing chrome components.

### PR #310 — Landing auth shell browser hardening (merged `d8dfd1a`)

**Scope:** E2E spec waits for hydration before asserting login vs account links.  
**Static guards:** `test:landing-auth-shell` — **6/6 PASS** (expired JWT cleared, valid JWT keeps account links).

### Persona gates

- `PersonaWorkspaceGate` on investor/workspace surfaces — role allowlist client-side.
- Recruiter inbox uses token-based access (separate from candidate JWT in some flows).

### Gaps

| Gap | Class |
|-----|-------|
| JWT decode without signature verification (client UX only) | **PILOT_LIMITED** — API must enforce |
| No httpOnly cookie session | **PILOT_LIMITED** — XSS surface on token |
| Investor login `/login/investor` | **BLOCKED** (`needs_setup`) |

---

## 9. Security Audit

| Control | Status | Evidence |
|---------|--------|----------|
| Rate limiting | **WORKING** | SlowAPI middleware; auth mutation tests |
| CSP | **PILOT_LIMITED** | Report-only burn-in docs; enforce not signed off |
| Security headers | **WORKING** | `test:security-headers` in package.json |
| Bot guard | **WORKING** | Middleware `shouldBlockLikelyBot` |
| `dangerouslySetInnerHTML` | **WORKING** | Zero matches in `frontend/src` |
| Secrets in repo | **WORKING** | `.env` gitignored; startup validation |
| OpenAPI in prod | **WORKING** | Disabled when `environment == production` |
| PII visibility | **PILOT_LIMITED** | Policy docs + `test:pii-data-visibility` |
| OAuth state | **WORKING** | Provider-specific backend services |

**npm audit (read-only):** 4 vulnerabilities (1 low, 3 moderate, 0 high/critical).

---

## 10. Privacy / Compliance / Legal Boundary Audit

| Area | Class | Evidence |
|------|-------|----------|
| GDPR consent | **PILOT_LIMITED** | Consent receipts, trust center routes |
| Cookie consent | **WORKING** | `cookie-consent.ts` localStorage JSON; default-denied analytics tests |
| DSR / portability | **PILOT_LIMITED** | Trust center export/revoke routes — preview scope |
| Placement verification | **PILOT_LIMITED** | Self-serve state machine; no manual ping-pong default |
| Recruiter compliance audit trail | **PILOT_LIMITED** | MVP docs; demo data |
| Geo jurisdiction | **PILOT_LIMITED** | `backend/app/api/geo.py`, `geo_jurisdiction.py` |
| Terms / Privacy pages | **READ_ONLY_WORKING** | Static legal routes |

North star alignment: reduce noise toward **calendar of acceptance** — most surfaces correctly labeled preview/pilot.

---

## 11. Workflow / Live Action Safety Audit

### Guard rails

| Guard | Scope | Result |
|-------|-------|--------|
| Hiring journey forbidden copy | `HIRING_JOURNEY_FORBIDDEN_LIVE_ACTION_COPY` | test 17 PASS |
| Trust language guard | i18n dictionaries | **4/4 PASS** |
| Verified readiness guard | Dashboard/recruiter trust copy | Automation pause asserted |
| Auto-apply | Backend + frontend | **BLOCKED** — beat OK ≠ live submission |
| Recruiter outreach | Talent radar, integrations | `no_outreach`, `no_ats_sync` boundary tags |
| Scheduling proposal | Read-only preview (#290) | No calendar write from preview |

### Live-action search (`rg live-action`)

Hits confined to hiring-journey negation guards and SoR career compass read-only test — **no unguarded affirmative live-action CTAs** found in audited paths.

### High-risk workflows (explicitly NOT live)

- Autonomous / delegated apply submission
- Recruiter calendar two-way sync
- ATS bidirectional sync
- External invite campaigns (`DEFAULT_EXTERNAL_INVITES_SENT = 0`)
- Microsoft calendar write (disabled in prod)

---

## 12. Performance / P0 Audit

**Gate: OPEN** — do not claim fixed.

| Item | Launch-blocking | Evidence |
|------|-----------------|----------|
| Phase 3B multitab (21 routes) | **YES** | HARD BLOCKED; local ~4.6 min; prod crash history |
| Playwright default OFF | **YES** | `test:e2e` exits 1 — CPU storm 2026-06-16 |
| `LightweightRouteShell` paint heuristic | **YES** | Skeleton could false-PASS Phase 3B |
| 8–12 Chrome tabs founder report | **YES** | 3–6 GB RSS — not re-run this audit |
| Route weight `/dashboard` | **YES** | In `p0-route-weight-inventory` — **7/7 PASS** |
| Hiring journey (5 routes) | Partial | Static 25/25; browser smoke gated |
| Lighthouse budgets | **YES** | Not signed off |
| 89-logo marquee leak | **YES** if regresses | `test:p0-performance-guardrails` — **15/15 PASS** |

Full table: [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md).

---

## 13. Reliability / Error Handling Audit

| Area | Class | Evidence |
|------|-------|----------|
| API error handlers | **WORKING** | HTTPException, ValidationError, DB errors in `main.py` |
| Frontend empty states | **PILOT_LIMITED** | Guided empty state tests |
| Storage degradation | **WORKING** | `safe-storage.ts`, auth storage fallback |
| Stale JWT UX | **WORKING** | #309/#310 fixes |
| Celery worker visibility | **PILOT_LIMITED** | `/health/celery-status`; empty `{}` in prod snapshot |
| Route fallbacks | **WORKING** | LightweightRouteShell skeletons — no blank pages (static guard) |

---

## 14. Observability / Monitoring / Operations Audit

| Surface | Class | Evidence |
|---------|-------|----------|
| `/api/public-health` | **WORKING** | Prod commit SHAs, feature flags, job counts |
| `/status` page | **READ_ONLY_WORKING** | Public status route |
| Board persistence monitor | **READ_ONLY_WORKING** | Multi-channel fetch — P0 fan-out risk |
| Audit event foundation | **PILOT_LIMITED** | Board route + backend API |
| Railway logs / CSP triage | **PILOT_LIMITED** | Runbook docs |
| PostHog / analytics | **PILOT_LIMITED** | Consent-gated; not fully audited here |

CI prod-health job runs on scaffold push after build + backend smoke.

---

## 15. CI/CD / Test Strategy Audit

### GitHub Actions (`smoke.yml`)

| Job | Trigger | Scope |
|-----|---------|-------|
| `backend-smoke` | push/PR (non-docs) | 8 pytest modules |
| `frontend-build` | push/PR (non-docs) | `npm run build` |
| `prod-health` | push to scaffold only | `scripts/verify-prod-health.sh` |

**Docs-only PRs:** `paths-ignore: docs/**` — CI **skipped** for this audit PR (by design).

### Frontend test pyramid

| Tier | Count | Default run |
|------|-------|-------------|
| Static tsx guards | ~183 scripts | Most via individual `npm run test:*` |
| Playwright e2e | ~60 specs | **Gated** — env flags required |
| Phase 3B / multitab | 1 spec + static guard | **BLOCKED** |

### Audit verification batch (this doc)

| Check | Result |
|-------|--------|
| `git diff --check` | PASS |
| Baseline audit exists | PASS |
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| `test:system-of-record-navigation-hub` | 17/17 PASS |
| `test:persona-dashboard-navigation` | 10/10 PASS |
| `test:hiring-journey` | 25/25 PASS |
| `test:p0-route-weight-inventory` | 7/7 PASS |
| `test:p0-performance-guardrails` | 15/15 PASS |
| `test:landing-auth-shell` | 6/6 PASS |
| `test:i18n-native-copy-quality` | 19/19 PASS |
| `test:i18n-coverage` | 4/4 PASS |
| `test:trust-language-guard` | 4/4 PASS |
| `test:e2e` | DISABLED (expected exit 1) |

---

## 16. Accessibility Audit

| Area | Class | Evidence |
|------|-------|----------|
| i18n / locale | **WORKING** | Language provider; rendered homepage guards |
| Focus / keyboard | **PILOT_LIMITED** | Not systematically audited — no dedicated a11y CI |
| Contrast fixes | **PILOT_LIMITED** | Recruiter inbox readability fix docs (#2026-06-11 batch) |
| Screen reader labels | **PILOT_LIMITED** | Component-level; no axe CI gate |
| Reduced motion | **PILOT_LIMITED** | Marquee performance guards; motion prefs not verified |

**Recommendation:** Add axe-playwright spot checks on P0 routes post-Phase 3B unblock — not launch-blocking today vs performance gate.

---

## 17. i18n / Localization / Copy Quality Audit

| Check | Result |
|-------|--------|
| `test:i18n-coverage` | 4/4 PASS — placeholders match EN |
| `test:i18n-native-copy-quality` | 19/19 PASS — no forbidden claims in overlays |
| `test:trust-language-guard` | 4/4 PASS — no live-automation claims |
| `test:i18n-global-chrome-guard` | Exists in package.json |
| Zero English leakage docs | Historical fixes (#287–#288) |

**Policy:** No user-facing literals outside `i18n.ts` / `t()` — enforced by multiple guards.  
**Backend:** `X-Locale` header + `locale_from_request()` per [I18N.md](./I18N.md).

---

## 18. UX / Product Truthfulness Audit

| Pattern | Class | Mitigation |
|---------|-------|------------|
| `LAUNCH_STANCE = "noGo"` on investor metrics | **WORKING** | Honest launch stance marker |
| Workspace status badges | **WORKING** | live/pilot/not_live/paused/planned |
| SoR boundary badges | **WORKING** | pilot, draft_only, not_live, no_outreach, etc. |
| Recruiter duplicate inbox cards | **WORKING** | Collapsed in #316 (Slice 4) |
| Company dashboard live without hint | **WORKING** | #313 (Slice 3) shipped |
| Investor product proof "live" | **WORKING** | Slice 10 (#321) — `sorHubHint` + bounded copy |
| Hiring journey "scheduled/sent" copy | **WORKING** | Negative live-action guard (#296) |
| Marketing north star copy | **WORKING** | Slice 11 (#322) — prepare-only / human-decision language |

---

## 19. Dependency / Supply Chain Audit

| Stack | Manager | Notes |
|-------|---------|-------|
| Frontend | npm (`package-lock.json`) | Next.js, React, Playwright dev |
| Backend | pip (`requirements.txt`) | FastAPI, SQLAlchemy, Celery |
| npm audit | 4 vulns (1 low, 3 mod) | Read-only snapshot 2026-06-27 |
| P1 dependency baseline | docs 2026-05-27 | [P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md](./P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md) |

No automated Dependabot gate verified in this audit.

---

## 20. Business Logic / Domain Audit

| Domain | Class | Prod signal |
|--------|-------|-------------|
| Job matching | **WORKING** | 652 validated jobs; matcher tests |
| Recruiter inbox decisions | **WORKING** | Accept/decline; compliance tests |
| Placement verification | **PILOT_LIMITED** | State machine + events; employer attest path |
| Calendar (Google) | **WORKING** | OAuth configured |
| Calendar (Microsoft) | **BLOCKED** | Write/busy-read disabled |
| Auto-apply | **BLOCKED** | Code present; public path paused |
| Referrals / gamification | **PILOT_LIMITED** | API routes exist; pilot scope |
| Stripe billing | **PILOT_LIMITED** | Checkout ready; company billing not_live |
| Market scrape | **PILOT_LIMITED** | 6% coverage — thin but beat OK |
| Hiring journey | **READ_ONLY_WORKING** | Cross-persona timeline preview |

**North star fit:** Matching + consent + async work → ranked pipeline → acceptance UI → calendar export. Most preview surfaces correctly stop before live outreach/sync.

---

## 21. Launch Readiness Gate Matrix

| Gate | Status | Evidence | Blocker? |
|------|--------|----------|----------|
| Public launch | **NO-GO** | `LAUNCH_STANCE`, operating context | **YES** |
| P0 performance | **OPEN** | P0 inventory, Phase 3B blocked | **YES** |
| Phase 3B multitab | **HARD BLOCKED** | Founder STOP | **YES** |
| Prod health | **PASS** | public-health OK | No |
| FE/API deploy | **PASS** (drift expected) | SHAs above | No |
| Auto-apply | **PAUSED** | Trust guards, ops stance | **YES** |
| External invites | **0 sent** | `DEFAULT_EXTERNAL_INVITES_SENT` | **YES** |
| Microsoft calendar corporate | **NOT READY** | Flags false in prod | Medium |
| Market depth | **6%** | coverage_pct | Medium |
| Legal/compliance sign-off | **NOT AUDITED** | Partial trust center | Medium |
| SoR registry completeness | **IMPROVED** | #312–#322 Slices 2–11 shipped | No (Slice 12 blocked) |
| CI full pytest | **PARTIAL** | Subset in smoke.yml | Low |

**Launch verdict: NO-GO** — multiple hard gates OPEN.

---

## 22. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Phase 3B false PASS via shell skeleton | Medium | High | Founder review shell; keep BLOCKED |
| R2 | Stale JWT UX regression | Low | Medium | #309/#310 tests + e2e |
| R3 | SoR live badge without scope hint | Low | Medium | **Closed** — #313 Slice 3 shipped |
| R4 | Duplicate recruiter inbox cards | Low | Low | **Closed** — #316 Slice 4 shipped |
| R5 | Auto-apply accidental enable | Low | Critical | Readiness gates; ops pause |
| R6 | API/FE SHA drift hides migration lag | Medium | High | Alembic prod verification |
| R7 | XSS token theft (localStorage JWT) | Low | High | Future httpOnly session |
| R8 | Microsoft calendar gap for corporate users | High | Medium | Graph busy-read staging |
| R9 | Thin job inventory (6%) | High | Medium | Scraper scale — post-launch |
| R10 | Marketing over-claim | Medium | High | Trust language guards; investor forbidden patterns |

---

## 23. Recommended Roadmap

### 48 hours (docs + safe guards)

- Merge this full audit (#314) reconciled post-#323.
- Operating context at `7ad86c7`; prod FE remains `dcacc9d` until next deploy (`docs_only_drift` acceptable).
- **Next:** Slice **12** — P0 shell founder review (blocked until explicit unblock).
- ~~Extend `p0-no-headless-final-state` route list with hiring-journey routes (Slice 13).~~ ✅ Shipped — 36 routes.

### 1 week

- Alembic prod head verification runbook execution.

### 2 weeks

- Microsoft busy-read staging checklist → limited pilot.
- Board monitor routes optional SoR entries (ops visibility).
- npm audit moderate fixes.

### 4 weeks

- Founder shell review → Phase 3B static guards only (Slice 12).
- Lighthouse budget draft for P0 routes.
- Candidate trust center discoverability in workspace grid — **shipped** Slice 7 (#318).

### 8 weeks

- Controlled recruiter cohort (H5c) **only after** P0 closure + founder GO.
- ICS/WebCal universal fallback promotion.
- Placement verification employer one-click attest pilot.

### Launch gate (explicit GO required)

All must be true:

1. `LAUNCH_STANCE` flipped in code **with board sign-off**
2. P0 performance **CLOSED** (Phase 3B prod PASS, multitab RSS validated)
3. Auto-apply policy decision documented (likely remains OFF for public)
4. Legal/compliance checklist signed
5. Market coverage threshold agreed (TBD)
6. No P0 OPEN items in risk register

---

## 24. First 10 Implementation Slices

| # | Slice | Type | Status |
|---|-------|------|--------|
| 1 | **This full audit doc** (#314) | Docs | ✅ Reconciled post-#323 |
| 2 | **#313 company SoR token hints** | FE/i18n | ✅ Shipped (`86c8c1b`) |
| 3 | Recruiter inbox card dedup (#316) | FE UX | ✅ Shipped (Slice 4) |
| 4 | Launch readiness plan + inbox truth (#315–#316) | Docs + FE | ✅ Shipped |
| 5 | Alembic prod head verification | Ops | Pending |
| 6 | **`p0-no-headless` + hiring-journey routes** (Slice 13) | Test | ✅ Shipped (36 routes) |
| 7 | Microsoft busy-read staging enable | BE/FE | Checklist docs |
| 8 | Board monitor → optional SoR stubs | FE registry | Low priority |
| 9 | Phase 3B shell fix (Slice 12) | FE perf | **BLOCKED — founder review** |
| 10 | Phase 3B controlled browser (local → prod) | E2E | **HARD BLOCKED** |

---

## 25. Evidence Appendix

### A. Git / branch capture

```
Branch: cursor/phase1-monorepo-scaffold
HEAD:   7ad86c7eafc42878726bd643c8fbd50753c3af60 (post-#323 reconcile)
Original audit HEAD: 28d439b581ff08234dee46ac0c4fcfe9957ce95f (2026-06-27)
Clean:  yes (at reconcile)
```

### B. Production public-health (canonical at reconcile — prod FE `dcacc9d`)

```json
{
  "status": "ok",
  "db_ok": true,
  "frontend_commit": "dcacc9d5c7fc30d56593994babd3e50a8d1aa863",
  "api_commit": "6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa",
  "validated_jobs": 652,
  "market_coverage_progress_pct": 6,
  "microsoft_busy_read_enabled": false,
  "microsoft_calendar_write_enabled": false,
  "stripe_checkout_ready": true,
  "scrape_beat_enabled": true
}
```

### C. Codebase counts

| Artifact | Count |
|----------|-------|
| `frontend/src/app/**/page.tsx` | 230 |
| `backend/app/api/*.py` | 45 |
| `backend/alembic/versions/*.py` | 69 |
| `SYSTEM_OF_RECORD_ROUTES` entries | 83 |
| Frontend static test scripts | ~183 |
| `hintKey` in SoR registry | 29 entries |

### D. SoR persona breakdown (post-#312)

| Persona | SoR entries |
|---------|-------------|
| Candidate | 23 |
| Recruiter | 23 |
| Company | 18 |
| Investor | 19 |

### E. PR trace (#309–#323)

| PR | Title | State | SHA |
|----|-------|-------|-----|
| [#309](https://github.com/CzechowskiT/twin/pull/309) | Landing auth-shell reconcile | MERGED | `4226551` |
| [#310](https://github.com/CzechowskiT/twin/pull/310) | Landing auth-shell browser e2e | MERGED | `ea8c1dc` |
| [#311](https://github.com/CzechowskiT/twin/pull/311) | Feature status audit | MERGED | `57d9c92` |
| [#312](https://github.com/CzechowskiT/twin/pull/312) | SoR registry reconcile Slice 2 | MERGED | `b43b135` |
| [#313](https://github.com/CzechowskiT/twin/pull/313) | Company SoR token hints Slice 3 | MERGED | `86c8c1b` |
| [#315](https://github.com/CzechowskiT/twin/pull/315)–[#322](https://github.com/CzechowskiT/twin/pull/322) | Launch readiness Slices 4–11 | MERGED | `dcacc9d` (prod FE) |
| [#323](https://github.com/CzechowskiT/twin/pull/323) | Operating context refresh | MERGED | `7ad86c7` (scaffold) |
| [#314](https://github.com/CzechowskiT/twin/pull/314) | Full application audit (this doc) | **This PR** | — |

### F. Verification commands (audit run)

```bash
cd /Users/tomek/Projects/twin
git diff --check
test -f docs/TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md
cd frontend && npm run build && npx tsc --noEmit
npm run test:system-of-record-navigation-hub   # 17/17
npm run test:persona-dashboard-navigation      # 10/10
npm run test:hiring-journey                    # 25/25
npm run test:p0-route-weight-inventory         # 7/7
npm run test:p0-performance-guardrails         # 15/15
npm run test:landing-auth-shell                # 6/6
npm run test:i18n-native-copy-quality          # 19/19
npm run test:i18n-coverage                     # 4/4
npm run test:trust-language-guard              # 4/4
npm run test:e2e                               # DISABLED (expected)
curl -sS https://twin-sooty.vercel.app/api/public-health | jq .
```

### G. Key source files

| Purpose | Path |
|---------|------|
| SoR registry | `frontend/src/lib/system-of-record-routes.ts` |
| Launch stance | `frontend/src/lib/investor-metrics-reality.ts` |
| Auth session | `frontend/src/lib/auth.ts` |
| Hiring journey guards | `frontend/src/lib/hiring-journey.ts` |
| Workspace modules | `frontend/src/lib/*-workspace-modules.ts` |
| API entry | `backend/app/main.py` |
| CI smoke | `.github/workflows/smoke.yml` |
| Middleware | `frontend/src/middleware.ts` |

### H. Safe search summary

| Pattern | Hits | Assessment |
|---------|------|------------|
| `live-action` / `LIVE_ACTION` | hiring-journey guards, SoR tests | Guarded |
| `dangerouslySetInnerHTML` | 0 in frontend/src | Clean |
| `localStorage` | auth, consent, onboarding, drafts | Expected; token XSS risk noted |
| `LightweightRouteShell` | layouts + P0 tests | Performance concern documented |

### I. npm audit snapshot

```
vulnerabilities: { info: 0, low: 1, moderate: 3, high: 0, critical: 0, total: 4 }
```

### J. Launch stance constants (code)

```typescript
// frontend/src/lib/investor-metrics-reality.ts
export const LAUNCH_STANCE = "noGo" as const;
export const CONTROLLED_REVIEW_STATUS = "h5cHold" as const;
export const DEFAULT_EXTERNAL_INVITES_SENT = 0;
```

---

## Non-goals (this batch)

- No product / runtime / backend / API / auth / env / workflow changes
- No Phase 3B, prod mutation, or broad browser stress
- No launch GO, P0 closure, or Phase 3B unblock claims
- No Slice 12 execution without founder unblock

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial full application audit at scaffold `28d439b`; prod FE aligned; incorporates #311–#312 baseline + #313 pending |
| 2026-06-28 | **Slice 13** — 5 hiring-journey routes in `p0-no-headless-final-state` (31 → 36); static guards 9/9; P0 **OPEN**; Phase 3B **BLOCKED** |
| 2026-06-28 | **Reconciled post-#323** — SHAs (`dcacc9d` prod FE, `6d6d1e5` API, `7ad86c7` scaffold); Slices 3–11 marked shipped; Slice 12 blocked; Slice 13 next |
