# TWIN Operating Context — Source of Truth (2026-06-26)

**Purpose:** Single operator-facing snapshot for agents, founders, and CI smoke wrappers. Consolidates launch stance, deploy SHAs, recent PR history, Hiring Journey runtime state, test matrix, gates, blockers, and next steps.

**Branch at capture:** `cursor/phase1-monorepo-scaffold`  
**Captured UTC:** 2026-06-27 (post-#299 verification batch on scaffold HEAD `73ec745`)

**Canonical references:**
- [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md) — Hiring Journey detail (#291–#298); operating context (#299)
- [PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md](./PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md) — SHA drift rules
- [PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) — founder gate rows
- [.cursorrules](../.cursorrules) — product north star, calendar, placement verification

---

## 1. Product stance

| Gate | Status | Meaning |
|------|--------|---------|
| **Public launch** | **NO-GO** | No uncontrolled signup spike, LinkedIn/X/PressOn announcement, or “we’re live” marketing. Pilot/demo/investor flows only. |
| **P0 performance** | **OPEN** | No Phase 3B proof, no signed Lighthouse budgets, no multitab/stress closure. See [P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md](./P0_PERFORMANCE_SAFE_EVIDENCE_2026-06-24.md). |
| **Phase 3B controlled multitab** | **HARD BLOCKED** | Founder STOP. Test harness exists (PR #167) but **must not run** until shell fix + explicit unblock. See [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md). |
| **Controlled pilot / demo** | **GO** (with constraints) | Named users, founder-watched. H5c/H5d recruiter cohort **HOLD**; external invites **0**. |
| **Auto-apply / delegated apply** | **PAUSED / NOT LIVE** | Nightly beat may show OK on health; submission path not live for public. |

**North star (unchanged):** Calendar of acceptance — pre-qualified interview slots, not inbox spam. Every surface must reduce noise toward acceptance-ready calendar items.

---

## 2. Branch, commits, and deploy interpretation

### Checkout snapshot (2026-06-27, post-#299)

| Field | Value |
|-------|-------|
| **Current branch** | `cursor/phase1-monorepo-scaffold` |
| **repo_head / scaffold HEAD** | `73ec745ab12dd151adf05c2c66b67411e6bcf7ec` |
| **prod_frontend_commit** (Vercel) | `73ec745ab12dd151adf05c2c66b67411e6bcf7ec` |
| **prod_api_commit** (Railway) | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` |
| **public-health `status`** | `ok` |
| **public-health `db_ok`** | `true` |
| **hiring-journey routes HTTP** | **5/5 × 200** (curl prod, 2026-06-27) |
| **commit_interpretation** | Frontend (Vercel) and API (Railway) commits differ — expected after docs-only #299; verify Alembic head separately. |

### Alignment classification

| Check | Result |
|-------|--------|
| `frontend_commit` vs `repo_head` | **ALIGNED** — both `73ec745` (PR #299 merge) |
| `api_commit` vs `repo_head` | **EXPECTED DRIFT** — API at `6d6d1e5` (PR #281, 2026-06-24); no backend changes in #287–#299 |
| `alignment_status` | **ALIGNED** |
| `docs_only_drift` | `false` / N/A after post-#299 verification |

### Production health highlights (curl 2026-06-27)

```json
{
  "validated_jobs": 652,
  "market_coverage_progress_pct": 6,
  "microsoft_busy_read_enabled": false,
  "microsoft_oauth_connect_gate_enabled": false,
  "microsoft_calendar_write_enabled": false,
  "scrape_beat_enabled": true,
  "stripe_checkout_ready": true
}
```

**Important:** A newer Vercel `frontend_commit` does **not** prove Railway ran migrations. Alembic verification is separate — see [ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md](./ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md).

Verification command:

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{
  status, db_ok, frontend_commit, api_commit, commit_interpretation, deployment_note
}'
```

---

## 3. PR history (#287 → latest)

Verified via `gh pr list --state merged --limit 20` and `git log` on **2026-06-27**.

### Context PRs (#287–#290)

| PR | Title | Merge SHA | Scope | Safety | Tests | Prod verification |
|----|-------|-----------|-------|--------|-------|-------------------|
| [#287](https://github.com/CzechowskiT/twin/pull/287) | Polish profile pipeline and trust native copy | `389dcaf` | i18n native copy — profile pipeline, trust surfaces (6 files) | Read-only copy; no live workflow | `test:i18n-native-copy-quality`, trust guards | FE-only; no API change expected |
| [#288](https://github.com/CzechowskiT/twin/pull/288) | Improve long-form native copy and locale QA | `bac6334` | Long-form EN/PL copy polish (11 files) | No new live actions | i18n coverage + native copy tests | FE-only |
| [#289](https://github.com/CzechowskiT/twin/pull/289) | Stabilize P0 persona navigation smoke | `5288855` | P0 persona nav smoke script hardening (1 file) | Guard-only | `test:p0-all-persona-navigation-routes` | Static guard; browser optional |
| [#290](https://github.com/CzechowskiT/twin/pull/290) | Add scheduling proposal pack preview | `6c767fa` | Read-only scheduling proposal preview routes + demo data (18 files) | Blocked calendar/invite/email boundaries | Scheduling + read-only guards | FE-only preview |

### Hiring Journey batch (#291–#299)

| PR | Title | Merge SHA | Scope | Safety | Tests | Prod verification |
|----|-------|-----------|-------|--------|-------|-------------------|
| [#291](https://github.com/CzechowskiT/twin/pull/291) | Add hiring journey timeline preview | `6d40ea3` | Core timeline, 5 routes, demo data, component (20 files) | Read-only `readiness_preview`; no backend | `test:hiring-journey` (initial suite) | FE deploy; Vercel SHA advances |
| [#292](https://github.com/CzechowskiT/twin/pull/292) | feat(hiring): add journey inbound cross-links | `0d3fb89` | Inbound links from trust, profile 360, scheduling, placement (7 files) | Safe-route cross-links only | trust + profile inbound tests | FE-only |
| [#293](https://github.com/CzechowskiT/twin/pull/293) | Hiring journey read-only UI polish | `eb864de` | Read-only badge/note copy (6 files) | Reinforces demo-only | hiring-journey read-only markers | FE-only |
| [#294](https://github.com/CzechowskiT/twin/pull/294) | Polish hiring journey route consistency (5 surfaces) | `1eb0b16` | Route surface props, persona labels, alias nav (9 files) | Board blocked semantics preserved | tests 12–16 | FE-only |
| [#295](https://github.com/CzechowskiT/twin/pull/295) | Hiring Journey evidence provenance cards | `349a645` | Provenance cards per step (5 files) | Monitor-only evidence | provenance metadata tests | FE-only |
| [#296](https://github.com/CzechowskiT/twin/pull/296) | Harden hiring journey negative live-action guard | `4be155c` | Negation-window guard for affirmative live-action copy (2 files) | Blocks “scheduled/sent/synced” claims | test 17 | FE-only |
| [#297](https://github.com/CzechowskiT/twin/pull/297) | docs: hiring journey traceability memo (#291–#296) | `a30e28c` | Traceability memo (1 file) | Docs-only | N/A (docs batch) | `acceptable_docs_only_drift` |
| [#298](https://github.com/CzechowskiT/twin/pull/298) | Hiring Journey provenance source-module drill-in (read-only) | `7a88a101` | Source-module drill-in links on provenance cards (5 files) | Board step nav stays blocked; safe hrefs only | test 18 (+ 25 total) | FE deploy; superseded by #299 on prod |
| [#299](https://github.com/CzechowskiT/twin/pull/299) | Refresh operating context snapshot post-#299 | `73ec745` | Operating context source-of-truth doc (1 file) | Docs-only | `test:hiring-journey`, `npm run build` | **Current prod FE SHA**; browser smoke skipped (docs-only); public-health OK |

**Scaffold HEAD after #299:** `73ec745ab12dd151adf05c2c66b67411e6bcf7ec`

### Remote branch note: `cursor/hiring-journey-provenance-drill-in`

- **Status:** **MERGED** into scaffold via PR #298 (`7a88a101`).
- **Unmerged work:** **None** — `git merge-base --is-ancestor origin/cursor/hiring-journey-provenance-drill-in HEAD` confirms full merge.
- Related stale remote: `origin/feature/hiring-journey-provenance-2026-06-25` (superseded by #295/#298).

---

## 4. Hiring Journey runtime state

Full detail: [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md). Summary:

### Routes and personas

| Route | Surface | Persona | Overall status (demo) |
|-------|---------|---------|------------------------|
| `/dashboard/hiring-journey` | `candidate_dashboard` | Candidate | `preview` |
| `/profile/hiring-journey` | `candidate_profile` | Candidate (alias) | `preview` |
| `/recruiter/hiring-journey` | `recruiter` | Recruiter | `ready_for_human_review` |
| `/company/hiring-journey` | `company` | Company | `in_review` |
| `/board/hiring-journey` | `board` | Board | **`blocked`** |

**Eleven steps:** Discovery → Matching → Trust Review → Candidate Readiness → Offer Readiness → Scheduling Proposal → Interview Preparation → Decision Review → Offer Decision → Placement Verification → Onboarding Preview.

### Candidate alias

- Dashboard and profile resolve **identical** journey data (`persona: candidate`).
- Bidirectional nav via `hiringJourneyCandidateAliasNav()` — marker `data-hiring-journey-nav="candidate-alias"`.
- Test **15** asserts alias parity.

### Board blocked

| Aspect | Behavior |
|--------|----------|
| Overall status | `blocked` — badge `hiring-journey-board-blocked` |
| Step nav | **Blocked** — `data-hiring-journey-nav="source-module-blocked"` |
| Provenance | **Monitor-only** on every step |
| Cross-links | Omit self-route; outbound to other readiness surfaces only |

### Read-only / provenance

| Marker | Meaning |
|--------|---------|
| `hiring-journey-read-only-badge` | Visible preview badge |
| `hiring-journey-no-live-action` | No scheduling, invites, calendar write |
| `hiring-journey-source-badge` | `source: readiness_preview` |
| Provenance cards (#295) | Evidence metadata per step — monitor-only |
| Source-module drill-in (#298) | Safe deep-links to originating readiness routes; board drill-in blocked |

**Data origin:** `frontend/src/lib/hiring-journey-demo-data.ts` — no backend writes, no OAuth, no external API.

### Negative live-action guard (#296)

`hiringJourneyHasAffirmativeForbiddenCopy()` with negation window — blocks affirmative “scheduled/sent/synced/invited” copy while allowing explicit negations. Test **17**.

### Explicitly blocked boundaries

Automatic advancement, interview write, invites, email, calendar sync, ATS writeback, payments, external employer confirmation, Microsoft Graph live busy-read. No `<button>`, `<form>`, or primary CTAs on timeline UI.

**Live workflow engine:** **NOT SHIPPED.**

---

## 5. Deployment model (Vercel vs Railway)

| Platform | Hosts | SHA field | Deploy trigger |
|----------|-------|-----------|----------------|
| **Vercel** | Next.js frontend, `/api/public-health` proxy route | `frontend_commit` | Frontend/`frontend/` changes; merges to linked branch |
| **Railway** | FastAPI backend, Celery, Postgres | `api_commit`, `git_commit`, `backend_git_commit` | Backend/app changes, migrations |

### Expected SHA drift patterns

| Scenario | Pattern | Action |
|----------|---------|--------|
| Frontend-only PR (#287–#298) | `frontend_commit` > `api_commit` | **Expected** — verify FE slice only |
| Backend-only PR (#281 scrape beat) | `api_commit` > `frontend_commit` | Verify Alembic + API smoke |
| Docs-only PR | `repo_head` ahead of `frontend_commit`; `docs_only_drift: true` | `acceptable_docs_only_drift` — smoke allowed |
| Full-stack aligned | All short SHAs match scaffold HEAD | Confirm Alembic head separately |

**Prod URL:** https://twin-sooty.vercel.app  
**API (direct):** https://twin-production-bcd9.up.railway.app

---

## 6. Hard bans list

Operator and agent constraints — **do not violate without explicit founder sign-off:**

| # | Ban |
|---|-----|
| H1 | **No public launch GO** — no marketing spike, no “we’re live” claims |
| H2 | **P0 performance remains OPEN** — do not claim fixed or launch-ready performance |
| H3 | **Phase 3B HARD BLOCKED** — do not run multitab/browser stress until founder unblocks |
| H4 | **No live workflow from Hiring Journey layer** — preview/demo only |
| H5 | **No candidate movement, scheduling write, invites, email, calendar sync, ATS writeback, payments** from preview surfaces |
| H6 | **Auto-apply PAUSED / delegated apply NOT LIVE** |
| H7 | **Recruiter calendar sync NOT LIVE** |
| H8 | **Microsoft busy-read prod gates OFF** — staging smoke blocked without operator JWT |
| H9 | **No fake traction** — no invented MAU, MRR, customers, fundraising claims |
| H10 | **External recruiter invites 0** — H5c/H5d **HOLD** until explicit GO SMALL |
| H11 | **No secrets in repo/docs/logs** — never commit `.env`, tokens, API keys |
| H12 | **No agent-initiated prod DB migrations** — Alembic checks read-only unless runbook says otherwise |
| H13 | **No CS tennis placement verification** — self-serve machine-assisted path only ([PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md)) |
| H14 | **No headless multitab e2e by default** — Playwright browser tests require explicit env flags (CPU storm incident 2026-06-16) |
| H15 | **i18n** — no user-facing literals outside `t()` / locale-aware backend copy |

---

## 7. Test matrix

Scripts from `frontend/package.json`. Run from `frontend/` unless noted.

### Hiring Journey and adjacent

| Command | Protects |
|---------|----------|
| `npm run test:hiring-journey` | 25 tests — routes, 11 steps, provenance, board blocked, alias nav, cross-links, i18n EN/PL, forbidden copy guard (#296), drill-in (#298), no secrets |
| `npm run test:hiring-journey-browser` | 5-route Playwright smoke — requires `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` or `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` |
| `npm run test:candidate-trust-overview` | Trust overview inbound link to hiring journey |
| `npm run test:candidate-profile-360` | Profile 360 inbound link by surface |

### Trust, profile, i18n

| Command | Protects |
|---------|----------|
| `npm run test:trust-language-guard` | Trust/safety language guardrails — no overpromise |
| `npm run test:i18n-coverage` | Key parity across locale dictionaries |
| `npm run test:i18n-native-copy-quality` | Native copy quality EN/PL + supported locales |
| `npm run test:i18n-native-copy-quality-browser` | Rendered copy browser guard (optional) |
| `npm run test:i18n-global-chrome-guard` | Global chrome i18n leakage |
| `npm run test:i18n-premium-product` | Premium product overlay keys |

### P0 performance and navigation

| Command | Protects |
|---------|----------|
| `npm run test:p0-all-persona-navigation-routes` | Static P0 persona route registry (#289) |
| `npm run test:p0-all-persona-navigation-browser` | Browser P0 nav smoke (optional/prod) |
| `npm run test:p0-production-stuck-route-regression` | Stuck-route regression guards |
| `npm run test:p0-browser-memory-multitab-performance` | Memory/multitab static guards |
| `npm run test:p0-renderer-memory-bundle-reduction` | Bundle/renderer memory reductions |
| `npm run test:phase3b-controlled-multitab` | Phase 3B static guards (**BLOCKED to run browser variant**) |
| `npm run test:multi-tab-performance-hardening` | Multi-tab perf hardening guards |

### Build / typecheck

| Command | Protects |
|---------|----------|
| `npm run build` | Next.js production build integrity |
| `npx tsc --noEmit` | TypeScript compile safety |

### Backend (representative)

| Command | Protects |
|---------|----------|
| `pytest tests/test_public_health_regression.py -q` | Public health surface regression |
| `pytest tests/test_auto_apply_trigger_sweep_admin_gate.py -q` | Auto-apply sweep gate |

### Docs batch verification (2026-06-27, post-#299)

| Command | Result |
|---------|--------|
| `npm run test:hiring-journey` | **PASS** (25/25) |
| `npm run build` | **PASS** |
| `npm run test:hiring-journey-browser` | **SKIPPED** — docs-only #299; no prod browser smoke |
| Public-health + 5 hiring-journey routes | **PASS** — `status=ok`, `db_ok=true`, HTTP 200 × 5 |

---

## 8. Launch gate matrix

Condensed from [PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) + current prod health.

| Category | Gate | Status | Notes |
|----------|------|--------|-------|
| **Product** | Public launch | **NO-GO** | Founder limited-launch decision pending |
| **Product** | P0 performance | **OPEN** | Phase 3B not cleared |
| **Product** | Phase 3B multitab | **HARD BLOCKED** | Founder STOP |
| **Product** | Hiring Journey live engine | **NOT SHIPPED** | Preview only (#291–#298) |
| **Security** | S2 CSP enforce | **PASS** (2026-06-05) | 72h burn-in complete |
| **Security** | S5 Stripe dedup | **PASS** | Alembic `050` |
| **Operational** | O2 public-health | **PASS** | `status=ok`, `db_ok=true` |
| **Operational** | O5 Calendar | **partial-with-waiver** | Google PASS; Microsoft LIVE; Apple/iCal partial |
| **Operational** | O6 Vercel alias drift | **⚠️ documented** | Workaround in runbook |
| **Legal** | L6 DSR delete | **partial-with-waiver** | Export live; delete manual |
| **Pilot** | P6 founder auth smoke | **PASS** (2026-05-29) | Re-run before external cohort |
| **Pilot** | P7 limited recruiter | **H5b PASS; H5c/H5d HOLD** | 0 external invites |
| **Calendar** | Microsoft busy-read prod | **OFF** | Staging prep docs exist; smoke blocked |
| **Deploy** | FE/API SHA alignment | **ALIGNED** | `frontend_commit` = `repo_head` = `73ec745`; API lag expected |

**Decision matrix:** Any ❌ on Security S2–S5 → hold. Any ❌ on Pilot gates → pilot only, not public launch. Current stance: **pilot/demo GO; public NO-GO.**

---

## 9. Known blockers and risks

### P0 (performance)

- Phase 3B controlled multitab **not executed** — founder STOP.
- No stress/multitab/headless verification batch signed off.
- No Lighthouse budget closure.
- Heavy demo surfaces on dashboard, calendar readiness, placement verification, board monitors — mitigations merged but gate **OPEN**.

### Phase 3B

- Test infra merged (PR #167) but **forbidden to run** until shell fix + founder review.
- Prior session **PARTIAL** (local 21/21; prod not verified).
- Browser scripts disabled by default since 2026-06-16 CPU storm — require explicit env flags.

### Microsoft busy-read staging

- Prod gates: `microsoft_busy_read_enabled=false`, `microsoft_oauth_connect_gate_enabled=false`, `microsoft_calendar_write_enabled=false`.
- Staging operator setup documented ([MICROSOFT_BUSY_READ_STAGING_OPERATOR_SETUP_2026-06-24.md](./MICROSOFT_BUSY_READ_STAGING_OPERATOR_SETUP_2026-06-24.md)) but live smoke **BLOCKED** without operator URL/JWT.
- Board checklist route: `/board/microsoft-busy-read-staging-checklist`.

### API / deploy drift

- `api_commit` (`6d6d1e5`) behind `frontend_commit` (`73ec745`) — **expected** for frontend/docs-only batch; not a deploy failure by itself.
- Alembic head must be verified separately for persistence/backend slices.

### Auth shell for prod visual checks

- Browser smokes may hit auth shell without session — **accepted as non-failure** for read-only route checks.
- Founder JWT required for authenticated persistence smokes ([FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md](./FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md)).

### Other risks

- Market scrape coverage **6%** (`market_coverage_progress_pct`) — ops monitoring, not launch blocker for preview.
- Vercel canonical alias drift (O6) — documented workaround.
- Auto-apply **PAUSED** — do not enable without ops plan.

---

## 10. Recommended next 30 steps

Realistic backlog from current session state — ordered by dependency and safety.

1. Treat this operating context doc as source of truth for agents (merged via #299).
2. Run prod hiring-journey browser smoke after any FE deploy: `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:hiring-journey-browser`.
3. Polish provenance drill-in UX copy (EN/PL) if founder feedback — read-only only.
4. Investor-room i18n parity sweep (`test:investor-room-mvp`, `test:i18n-premium-product`).
5. Long-form native copy QA continuation (#287/#288 pattern) on remaining surfaces.
6. Staging Microsoft busy-read smoke when operator JWT available — **do not flip prod gates**.
7. Document staging smoke evidence in `docs/MICROSOFT_BUSY_READ_STAGING_SMOKE_2026-06-24.md` follow-up.
8. Founder authenticated prod persistence smoke re-run with JWT ([AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md](./AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md)).
9. Alembic prod head read-only re-check (`050_stripe_webhook_events`).
10. P0 persona navigation browser smoke on prod (optional, flagged).
11. Shell fix for Phase 3B blocker — **founder review before any multitab run**.
12. Phase 3B static guards only (`test:phase3b-controlled-multitab`) — no browser until unblocked.
13. Scheduling proposal pack cross-link audit with hiring journey step 6.
14. Offer readiness ↔ scheduling decision context alignment check.
15. Placement verification preview ↔ hiring journey step 10 link audit.
16. Board monitor routes — confirm no accidental live-action CTAs (`test:trust-language-guard`).
17. Recruiter inbox decision rail readability regression (`test:recruiter-decision-rail-readability`).
18. Company hiring command center perf memoization audit.
19. Dashboard lazy-load inventory update in P0 performance doc.
20. `test:p0-performance-guardrails` batch on scaffold HEAD after substantive FE changes.
21. i18n rendered homepage guard (`test:i18n-rendered-homepage-guard`).
22. Cookie consent + analytics consent tests in CI slice.
23. Public health regression pytest on backend after API-touching PRs only.
24. Scrape ops visibility review — `market_coverage_progress_pct` trend.
25. Limited recruiter pilot: founder supplies H5d slot-1 shortlist names.
26. H5c GO SMALL 1/2 decision pack review — **no outbound until explicit GO**.
27. Vercel canonical alias drift check (`scripts/check-vercel-canonical-alias.sh`).
28. Update traceability memo if hiring journey tests exceed 25.
29. Investor demo dry-run against prod with curated accounts.
30. Re-capture this doc’s §2 SHAs after next merged PR batch.

---

## Appendix: key files

| Path | Role |
|------|------|
| `frontend/src/lib/hiring-journey.ts` | Routes, markers, guards, drill-in |
| `frontend/src/lib/hiring-journey-demo-data.ts` | Demo bundle, blocked actions |
| `frontend/src/components/hiring-journey/HiringJourneyTimeline.tsx` | Timeline UI |
| `frontend/scripts/hiring-journey.test.ts` | Unit/guard tests (25) |
| `frontend/e2e/hiring-journey-browser.spec.ts` | Browser smoke |
| `docs/HIRING_JOURNEY_TIMELINE_2026-06-25.md` | Feature spec |
| `docs/HIRING_JOURNEY_TRACEABILITY_2026-06-26.md` | Traceability memo |

---

## Hard bans honoured (this doc)

- Docs-only — no product code changes.
- No deploy, Railway, or Vercel config changes.
- No DB migration.
- No public launch messaging.
- No secrets in this doc.

**Public launch: NO-GO · P0: OPEN · Phase 3B: HARD BLOCKED**
