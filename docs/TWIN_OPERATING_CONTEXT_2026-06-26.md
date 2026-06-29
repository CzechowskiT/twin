# TWIN Operating Context — Source of Truth (2026-06-26)

**Purpose:** Single operator-facing snapshot for agents, founders, and CI smoke wrappers. Consolidates launch stance, deploy SHAs, recent PR history, Hiring Journey runtime state, test matrix, gates, blockers, and next steps.

**Branch at capture:** `cursor/phase1-monorepo-scaffold`  
**Captured UTC:** 2026-06-28 (post Gate D decision package on scaffold HEAD `2fbda38`)
**Prior refresh:** 2026-06-27 post-#301 (`50ff73d`)

**Canonical references:**
- [TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md](./TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md) — Slices 4–11 shipped (#315–#322); Slice 12 Gate B+C (#332 + Gate C PASS); Gate D decision package prepared
- [TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md](./TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md) — module truthfulness inventory (#311)
- [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md) — Hiring Journey detail (#291–#298); operating context (#299+)
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

### Checkout snapshot (2026-06-28, post Gate D decision package)

| Field | Value |
|-------|-------|
| **Current branch** | `cursor/phase1-monorepo-scaffold` |
| **repo_head / scaffold HEAD** | `2fbda38ab24dc06694ff3f10a01b7c4a2a2bca05` (`2fbda38`, PR #333 Gate C docs merge) |
| **prod_frontend_commit** (Vercel) | `62138dccd986bb068e717a9dafee38f822e94c66` (`62138dc`, PR #332 Gate B) |
| **prod_api_commit** (Railway) | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health `status`** | `ok` |
| **public-health `db_ok`** | `true` |
| **Gate C local browser** | **PASS** 36/36 — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) |
| **Gate D decision package** | **PENDING** — [gate-d-prod-browser-smoke-decision-2026-06-28.md](./gate-d-prod-browser-smoke-decision-2026-06-28.md); prod browser **not executed** |
| **HTTP smoke (14 routes)** | **14/14 × 200** (prod read-only) |
| **commit_interpretation** | Frontend (Vercel) and API (Railway) commits differ — expected; verify Alembic head separately. |

### Alignment classification

| Check | Result |
|-------|--------|
| `frontend_commit` vs `repo_head` | **DRIFT (docs-only)** — prod FE `62138dc`; scaffold `2fbda38` after Gate C/D docs merges |
| `api_commit` vs `repo_head` | **EXPECTED DRIFT** — API at `6d6d1e5` (PR #281); no backend changes in Gate B/C/D batch |
| `alignment_status` | **ALIGNED** (prod FE = Gate B code `62138dc`); scaffold ahead on docs |
| `docs_only_drift` | `true` — **acceptable_docs_only_drift** (prod FE still `62138dc`) |

### Production health highlights (curl 2026-06-28)

```json
{
  "status": "ok",
  "db_ok": true,
  "frontend_commit": "62138dccd986bb068e717a9dafee38f822e94c66",
  "api_commit": "6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa",
  "validated_jobs": 652,
  "market_coverage_progress_pct": 6,
  "market_coverage_last_scrape_at": "2026-06-28T03:10:19Z",
  "market_coverage_feed_stale": false,
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
| [#298](https://github.com/CzechowskiT/twin/pull/298) | Hiring Journey provenance source-module drill-in (read-only) | `7a88a101` | Source-module drill-in links on provenance cards (5 files) | Board drill-in null; safe hrefs only; #296 guard preserved | test 18 (+ 25 total) | **Merged / in prod** — ancestor of scaffold/prod FE `50ff73d` |
| [#299](https://github.com/CzechowskiT/twin/pull/299) | docs: add TWIN operating context source of truth | `73ec745` | Operating context source-of-truth doc (1 file) | Docs-only | `test:hiring-journey`, `npm run build` | Initial operating context snapshot |
| [#300](https://github.com/CzechowskiT/twin/pull/300) | Refresh operating context snapshot post-#299 | `f21e683` | Operating context refresh + 8-section snapshot template (2 files) | Docs-only | `test:hiring-journey`, `npm run build` | `acceptable_docs_only_drift` during partial deploy |
| [#302](https://github.com/CzechowskiT/twin/pull/302) | docs: add PR #298 drill-in to operating context | `65e8488` | PR #298 drill-in section, route mapping, safety (1 file) | Docs-only | `test:hiring-journey` (25/25), full verification batch | Drill-in section reconciled post-#299 |
| [#301](https://github.com/CzechowskiT/twin/pull/301) | Refresh operating context snapshot post-#299 | `50ff73d` | Reconcile operating context with #302 drill-in section (1 file) | Docs-only | `test:hiring-journey`, `npm run build`, `tsc` | Prod FE SHA before #309 batch |

### Operating context + P0 inventory (#302–#308)

| PR | Title | Merge SHA | Scope | Safety | Tests | Prod verification |
|----|-------|-----------|-------|--------|-------|-------------------|
| [#302](https://github.com/CzechowskiT/twin/pull/302) | docs: add PR #298 drill-in to operating context | `65e8488` | PR #298 drill-in section, route mapping (1 file) | Docs-only | `test:hiring-journey` (25/25) | `acceptable_docs_only_drift` |
| [#303](https://github.com/CzechowskiT/twin/pull/303) | docs: reconcile operating context post-#301 | `e60437a` | SHA reconcile to `50ff73d` (1 file) | Docs-only | build + tsc | `acceptable_docs_only_drift` |
| [#304](https://github.com/CzechowskiT/twin/pull/304) | Add P0 performance inventory | `f202745` | `P0_PERFORMANCE_INVENTORY_2026-06-27.md` | Docs-only | N/A | Evidence doc |
| [#305](https://github.com/CzechowskiT/twin/pull/305) | P0 Batch 1: hiring-journey route-weight inventory | `700f92c` | Route-weight guards for hiring-journey routes | Guard-only | `test:p0-route-weight-inventory` | FE-only |
| [#306](https://github.com/CzechowskiT/twin/pull/306) | fix(frontend): landing auth-shell shows login for stale sessions | `6b114f4` | Stale JWT → login entry on landing | No auth weakening | `test:landing-auth-shell` | FE-only |
| [#307](https://github.com/CzechowskiT/twin/pull/307) | *(superseded by #308 on scaffold)* | — | Landing auth fix lineage | — | — | — |
| [#308](https://github.com/CzechowskiT/twin/pull/308) | Fix landing login entry for expired session | `dbedcf0` | Reconcile landing auth-shell onto scaffold | No auth weakening | landing-auth-shell guards | FE-only |

### Launch readiness truthfulness batch (#309–#322)

| PR | Title | Merge SHA | Scope | Safety | Tests | Prod verification |
|----|-------|-----------|-------|--------|-------|-------------------|
| [#309](https://github.com/CzechowskiT/twin/pull/309) | fix(frontend): reconcile landing auth-shell login fix onto scaffold | `4226551` | Header bars, `auth.ts` stale JWT fix | No auth weakening | `test:landing-auth-shell` | FE deploy |
| [#310](https://github.com/CzechowskiT/twin/pull/310) | test(e2e): harden landing-auth-shell browser for stale JWT hydration | `ea8c1dc` | Browser test hardening only | Test-only; gated | e2e landing-auth-shell | No prod browser default |
| [#311](https://github.com/CzechowskiT/twin/pull/311) | Add TWIN feature status audit 2026-06-27 | `57d9c92` | Module classification, SoR drift inventory | Docs-only | N/A | Surfaces MISLEADING_OR_RISKY cards |
| [#312](https://github.com/CzechowskiT/twin/pull/312) | SoR registry reconcile — Slice 2 | `b43b135` | +4 SoR entries: recruiter_pipeline, recruiter_calendar, company_pipeline, candidate_career_compass | FE-only truthfulness | SoR + persona nav tests | FE deploy |
| [#313](https://github.com/CzechowskiT/twin/pull/313) | Company SoR token hints — Slice 3 | `86c8c1b` | `hintKey` on all company **live** SoR modules | Reduces live-badge over-read | SoR hub tests | FE deploy |
| [#315](https://github.com/CzechowskiT/twin/pull/315) | Launch readiness plan + recruiter inbox truthfulness (Slice 4) | `3b547c3` | `TWIN_PUBLIC_LAUNCH_READINESS_PLAN` + inbox collapse prep | Docs + FE boundaries | persona-dashboard, SoR hub | FE + docs |
| [#316](https://github.com/CzechowskiT/twin/pull/316) | fix: clarify recruiter inbox duplicate modules | `b38565d` | Collapse duplicate inbox module cards (Slice 4) | No inbox UI/backend change | persona-dashboard | FE-only |
| [#317](https://github.com/CzechowskiT/twin/pull/317) | fix: clarify company pipeline status boundaries | `b5b2f19` | Company pipeline WS vs SoR align (Slice 6) | `no_ats_sync` boundaries | persona-dashboard | FE-only |
| [#318](https://github.com/CzechowskiT/twin/pull/318) | fix: surface candidate trust center in workspace (Slice 7) | `959deeb` | One pilot `trust_center` workspace card → `/dashboard/trust` | Read-only discoverability | persona-dashboard | FE-only |
| [#319](https://github.com/CzechowskiT/twin/pull/319) | fix: group investor system of record modules (Slice 8) | `1098b10` | Investor SoR hub grouping (product/board/demo/access) | Copy-only grouping | SoR hub tests | FE-only |
| [#320](https://github.com/CzechowskiT/twin/pull/320) | fix: clarify company settings workspace card (Slice 9) | `dcde5ce` | Remove orphan settings card; dashboard via SoR only | UX honesty | persona-dashboard | FE-only |
| [#321](https://github.com/CzechowskiT/twin/pull/321) | fix: clarify investor product proof boundaries (Slice 10) | `5ea8647` | `sorHubHint` + bounded diligence copy on live SoR card | No status downgrade | SoR hub + trust guards | FE-only |
| [#322](https://github.com/CzechowskiT/twin/pull/322) | fix: align marketing copy with launch boundaries (Slice 11) | `dcacc9d` | Homepage, `/how-it-works`, `/demo`, FAQ, onboarding EN/PL | **No live-action claims**; LAUNCH_STANCE unchanged | Safe-lane smoke **11/11** (see §7) | **Current prod FE SHA** |

**Open (not merged at capture):** [#314](https://github.com/CzechowskiT/twin/pull/314) — full application audit (docs-only); merge after review; does not change launch stance.

**Scaffold HEAD after #322:** `dcacc9d5c7fc30d56593994babd3e50a8d1aa863`

### PR #298 — provenance source-module drill-in (reconciled post-#299)

| Field | Value |
|-------|-------|
| **PR** | [#298](https://github.com/CzechowskiT/twin/pull/298) — Hiring Journey provenance source-module drill-in (read-only) |
| **Feature commit** | `c9ba510fe7e2017116a7d18d452781b445d59c9f` — map eight readiness modules to existing safe routes with view/review/open copy |
| **Merge commit** | `7a88a101fb550546783d8fa08326052a4c46a2fc` — merged 2026-06-26 |
| **Scope (5 files)** | `frontend/src/lib/hiring-journey.ts`, `hiring-journey-demo-data.ts`, `HiringJourneyTimeline.tsx`, `i18n.ts`, `hiring-journey.test.ts` |
| **Prod state** | **Merged and live** — drill-in code is ancestor of scaffold/prod FE `50ff73d`; post-#299–#301 docs batches do not alter drill-in runtime |
| **Branch follow-up** | `cursor/hiring-journey-provenance-drill-in` — **merged; no separate branch or follow-up PR needed** |

**Runtime helpers (`frontend/src/lib/hiring-journey.ts`):**

- `SOURCE_MODULE_ROUTES` — persona-scoped href map keyed by `HiringJourneySourceModuleId`.
- `hiringJourneyProvenanceSourceModuleDrillIn(moduleId, persona)` — returns `{ href, labelKey }` or `null` when route or copy key missing, or when board persona blocked.
- `hiringJourneySourceModuleHref()` — lower-level href lookup (board may have href but drill-in still null).

**Route mapping — routable vs non-routable:**

| Category | `HiringJourneySourceModuleId` | Drill-in behavior |
|----------|------------------------------|-------------------|
| **Routable** (link when persona has href + labelKey) | `trust_center`, `profile_360`, `offer_readiness`, `scheduling_proposal`, `calendar_readiness`, `placement_verification` | `<a>` with `data-hiring-journey-nav="provenance-source-module"`; i18n label (`provenanceDrillInReview` / `View` / `Open`) — **not** raw route text |
| **Non-routable** (monitor-only text) | `job_discovery`, `matching`, `scheduling_decision_context`, `onboarding_preview` | Empty `{}` in `SOURCE_MODULE_ROUTES` → `null` drill-in; provenance shows module label as text only |

**UI markers (`HIRING_JOURNEY_MARKERS`):**

| Marker | Role |
|--------|------|
| `stepProvenanceSourceModule` | Provenance source-module block per step |
| `stepProvenanceSourceModuleLink` | Routable drill-in anchor (`→` suffix copy) |
| `stepProvenanceSourceModuleText` | Non-routable or board-blocked — text only, `data-hiring-journey-nav="provenance-source-module-blocked"` |

**Board:** `hiringJourneyBoardStepNavBlocked("board")` forces **null** drill-in on all steps — monitor-only provenance text; step nav remains `source-module-blocked`. Href may exist in `SOURCE_MODULE_ROUTES` (e.g. `offer_readiness` → `/board/offer-readiness`) but drill-in helper returns null.

**Safety (unchanged post-#298):**

- Read-only nav links only — no `<button>`, `<form>`, `<input>`, or `twin-btn-primary` on drill-in UI (test 18 asserts).
- PR **#296** negative live-action guard (`hiringJourneyHasAffirmativeForbiddenCopy()`) remains active — test **17**.
- No live workflow, OAuth, calendar write, or backend calls from drill-in targets.

### Remote branch note: `cursor/hiring-journey-provenance-drill-in`

- **Status:** **MERGED** into scaffold via PR #298 (`7a88a101`); feature commit `c9ba510`.
- **Unmerged work:** **None** — no separate branch needed for drill-in delivery.
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
| Source-module drill-in (#298) | `hiringJourneyProvenanceSourceModuleDrillIn()` — link vs text per routable module; board always text-only |
| `data-hiring-journey-nav="provenance-source-module"` | Allowed drill-in anchor nav |
| `data-hiring-journey-nav="provenance-source-module-blocked"` | Non-routable module or board — no href |

**Drill-in summary (#298):** Each step’s `sourceModuleId` (`HiringJourneySourceModuleId` in demo data) maps through `SOURCE_MODULE_ROUTES`. Six modules are routable for at least one persona; four are intentionally non-routable (discovery/matching/decision-context/onboarding preview). Timeline renders **link + arrow copy** when drill-in non-null, else **module label text** only.

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

### Verification batch (2026-06-28, post-#322 / Slice 11 safe-lane)

| Command | Result |
|---------|--------|
| `npm run test:trust-language-guard` | **PASS** |
| `npm run test:i18n-native-copy-quality` | **PASS** |
| `npm run test:i18n-coverage` | **PASS** |
| `npm run test:system-of-record-navigation-hub` | **PASS** |
| `npm run test:persona-dashboard-navigation` | **PASS** |
| `npm run test:hiring-journey` | **PASS** (25/25) |
| `npm run test:p0-route-weight-inventory` | **PASS** |
| `npm run test:p0-performance-guardrails` | **PASS** |
| `npm run test:landing-auth-shell` | **PASS** |
| `npm run build` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| **Safe-lane total** | **11/11 PASS** |
| `npm run test:hiring-journey-browser` | **SKIPPED** — no default prod browser smoke |
| Public-health + 5 hiring-journey routes | **PASS** — `status=ok`, `db_ok=true`, HTTP 200 × 5 |

### Prior verification batch (2026-06-27, post-#301)

| Command | Result |
|---------|--------|
| `npm run test:hiring-journey` | **PASS** (25/25) — includes test **17** (#296 guard), test **18** (#298 drill-in) |
| `npm run test:candidate-trust-overview` | **PASS** (15) |
| `npm run test:candidate-profile-360` | **PASS** (10) |
| `npm run test:i18n-coverage` | **PASS** (19) |
| `npm run test:i18n-native-copy-quality` | **PASS** (4) |
| `npm run test:trust-language-guard` | **PASS** (4) |
| `npm run build` | **PASS** |
| `npx tsc --noEmit` | **PASS** |

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
| **Deploy** | FE/API SHA alignment | **ALIGNED** | `frontend_commit` = `repo_head` = `dcacc9d`; API lag `6d6d1e5` expected |

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

- `api_commit` (`6d6d1e5`) behind `frontend_commit` (`dcacc9d`) — **expected** for frontend/docs-only batch #309–#322; not a deploy failure by itself.
- Alembic head must be verified separately for persistence/backend slices.

### Auth shell for prod visual checks

- Browser smokes may hit auth shell without session — **accepted as non-failure** for read-only route checks.
- Founder JWT required for authenticated persistence smokes ([FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md](./FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md)).

### Other risks

- Market scrape coverage **6%** (`market_coverage_progress_pct`) — ops monitoring, not launch blocker for preview.
- Vercel canonical alias drift (O6) — documented workaround.
- Auto-apply **PAUSED** — do not enable without ops plan.

---

## 10. Recommended next steps

### Blocked — requires founder unblock

| Slice | Item | Blocker |
|-------|------|---------|
| **12** | P0 shell fix (`LightweightRouteShell`) | **Founder review required** before any Phase 3B or multitab browser work |
| **14** | Investor room i18n parity | ✅ Shipped — copy-only EN/PL + overlays |
| **15** | Public nav investor entrypoint | ✅ Shipped — header persona lane adds `/investor` (desktop + mobile) |
| **16** | Phase 3B static guard refresh | ✅ Shipped — `PHASE3B_ALL_ROUTES` = 20 routes; static guards 8; P0 36 unchanged |
| **Phase 3B browser** | `test:phase3b-controlled-multitab-browser` | **HARD BLOCKED** — founder STOP |

### Safe fallback next items (no live-action, no Phase 3B)

Ordered by dependency and safety — autonomous batches allowed:

1. **Merge PR #314** — full application audit (docs-only); complements launch readiness plan.
2. Re-capture §2 SHAs after this operating context refresh merges (`docs_only_drift: true` → acceptable).
3. Prod hiring-journey browser smoke after FE deploy: `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:hiring-journey-browser`.
4. ~~**Slice 13** (prep only) — add 5 hiring-journey routes to `p0-no-headless` list; gated browser, no default CI.~~ ✅ Shipped — 36 routes.
5. Staging Microsoft busy-read smoke when operator JWT available — **do not flip prod gates**.
6. Founder authenticated prod persistence smoke re-run with JWT ([AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md](./AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md)).
7. Alembic prod head read-only re-check (`050_stripe_webhook_events` / `068_placement_events_foundation`).
8. ~~Investor-room i18n parity sweep (`test:investor-room-mvp`, `test:i18n-premium-product`).~~ ✅ Shipped — Slice 14.
9. Long-form native copy QA continuation (#287/#288 pattern) on remaining surfaces.
10. Scheduling proposal pack cross-link audit with hiring journey step 6.
11. Offer readiness ↔ scheduling decision context alignment check.
12. Placement verification preview ↔ hiring journey step 10 link audit.
13. Board monitor routes — confirm no accidental live-action CTAs (`test:trust-language-guard`).
14. Recruiter inbox decision rail readability regression (`test:recruiter-decision-rail-readability`).
15. `test:p0-performance-guardrails` batch on scaffold HEAD after substantive FE changes.
16. Vercel canonical alias drift check (`scripts/check-vercel-canonical-alias.sh`).
17. Limited recruiter pilot: founder supplies H5d slot-1 shortlist names.
18. H5c GO SMALL 1/2 decision pack review — **no outbound until explicit GO**.
19. Investor demo dry-run against prod with curated accounts (§16 boundaries in launch readiness plan).
20. Lighthouse budget definition doc — post-Phase 3B; docs-only prep OK now.

### No-live-action boundaries (unchanged post-#322)

All preview surfaces — Hiring Journey, Scheduling Proposal Pack, marketing copy, investor/company/recruiter workspace cards — remain **read-only or bounded**:
- No automatic candidate advancement, scheduling write, invites, email, calendar sync, ATS writeback, or payments.
- Auto-apply **PAUSED**; recruiter calendar sync **NOT LIVE**; Microsoft busy-read prod gates **OFF**.
- Affirmative live-action copy guarded (#296); marketing copy bounded to prepare-only / human-decision language (#322).
- `LAUNCH_STANCE = "noGo"` unchanged in `frontend/src/lib/investor-metrics-reality.ts`.
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

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-26 | Initial source of truth via PR #299 |
| 2026-06-27 | Refreshed post-#301; prod FE `50ff73d`; PR tables through #301 |
| 2026-06-28 | **Refresh post-PR #322** — prod FE/API SHAs (`dcacc9d` / `6d6d1e5`); PR history #302–#322; Slices 4–11 shipped; safe-lane smoke **11/11**; Slice **12 blocked** (P0 shell founder review); `docs_only_drift` note for this docs batch |
| 2026-06-28 | **Slice 13 shipped** (#324) — p0-no-headless 36 routes; prod FE `9d0f9bc`; **Slice 12 founder-review package prepared** — [P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md); implementation remains blocked pending §6 gates |
| 2026-06-28 | **Slice 12 founder sign-off checklist added** — [SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md); Gates A–F **PENDING**; shell implementation still **BLOCKED** |
| 2026-06-28 | **Slice 17** — homepage Explore TWIN / Poznaj TWIN panel (7 existing-route cards); `public-explore-twin-routes.ts` registry; Gate B / Phase 3B / shell **unchanged BLOCKED** |
| 2026-06-28 | **Slice 18** — footer secondary nav aligned with header + Explore TWIN model: stable 9-link sitemap (`public-footer-sitemap-routes.ts`); `/investor` vs `/for-investors` semantically distinct; Gate B / Phase 3B / shell **unchanged BLOCKED** |
| 2026-06-28 | **Slice 19** — header Explore TWIN mega-panel + homepage 10-card panel; guest lane preserves #335 IA (`/for-*`, `/faq`, `/demo`); padding #336 verified; static tests only; Gate D/E **PENDING**; Gate B / Phase 3B / shell **unchanged BLOCKED** |
| 2026-06-28 | **Slice 20** — public marketing consistency hardening: `/for-investors` → fundraising page (distinct from `/investor` executive room); CTA links to investor room + product proof + demo; FAQ/how-it-works → demo + Explore TWIN; container rhythm on product-proof; `test:public-marketing-consistency`; Gate D/E **PENDING**; Launch **NO-GO**; P0 **OPEN**; Phase 3B **BLOCKED** |
| 2026-06-28 | **Slice 21** — founder-led demo cross-links (`founder-demo-crosslinks-routes.ts` + `MarketingCrosslinksBand`) on `/demo`, `/how-it-works`, `/faq`, `/investor`, `/investor/product-proof`; mobile spacing polish (header wrap, Explore trigger/panel, Explore TWIN grid, fundraising CTAs, footer gaps); `test:founder-demo-crosslinks`; Gate D/E **PENDING**; Launch **NO-GO**; P0 **OPEN**; Phase 3B **BLOCKED** |
| 2026-06-28 | **Slice 12 Gate C executed** — local browser **36/36 PASS** ([gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md)); prod FE `62138dc`; Gate D/E/F **PENDING**; P0 **OPEN**; Phase 3B **BLOCKED** |
| 2026-06-28 | **Slice 12 Gate D decision package** — [gate-d-prod-browser-smoke-decision-2026-06-28.md](./gate-d-prod-browser-smoke-decision-2026-06-28.md); prod browser **not executed**; Gate D/E/F **PENDING**; `docs_only_drift` acceptable |
