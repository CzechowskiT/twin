# Launch Readiness Evidence Index — 2026-06-28

**Branch at capture:** `docs/gate-d-prod-browser-smoke-result-2026-06-28` @ `1a7acc00` (Gate D prod browser smoke PASS)
**Purpose:** Founder/investor-readable **evidence index** — what is working, what is guarded, what is blocked, and how to demo without overclaims.  
**This is not launch approval.**

**Canonical demo checklist:** [FOUNDER_DEMO_CHECKLIST_2026-06-28.md](./FOUNDER_DEMO_CHECKLIST_2026-06-28.md)

---

## 1. Executive Summary

| Decision | Stance |
|----------|--------|
| **This document** | Evidence organization + static verification only — **not** launch GO |
| **Public launch** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Gate B** | **YES** — minimal `LightweightRouteShell` / `PersonaWorkspaceGate` fix merged (PR #332 @ `62138dc`) |
| **Gate C** | **YES** — local browser **36/36 PASS** (workers=1) — [gate-c result](./gate-c-browser-validation-result-2026-06-28.md) |
| **Gate D** | **YES** — prod browser **36/36 PASS** (54.9s, workers=1) — [gate-d result](./gate-d-prod-browser-smoke-result-2026-06-28.md); [preflight runbook](./gate-d-prod-browser-smoke-preflight-2026-06-28.md) |
| **Gate E** | **PENDING** — Phase 3B controlled multitab **not run** — [gate-e prerequisites](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) |
| **Gate F** | **PENDING** — production smoke boundaries / re-audit |
| **Phase 3B** | **HARD BLOCKED** — founder STOP; no execution claim |
| **Code constant** | `LAUNCH_STANCE = "noGo"` in `frontend/src/lib/investor-metrics-reality.ts` |

Controlled investor/founder demo is **supported** with explicit boundaries (§6–§7). Public launch messaging, uncontrolled signup spikes, and “we’re live” claims remain **forbidden**.

---

## 2. Current Gate Status

| Gate | Question | Status | Evidence |
|------|----------|--------|----------|
| **A** | Static review package confirmed? | **PENDING** | [P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md), [SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md) |
| **B** | Implementation branch approved? | **YES** | PR #332 @ `62138dcc986bb068e717a9dafee38f822e94c66` — shell/gate minimal fix merged |
| **C** | Gated local browser validation? | **YES** | PR #333 + [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) — **36/36 PASS**, 44.5s, workers=1 |
| **D** | Gated prod browser smoke? | **YES** | [gate-d result](./gate-d-prod-browser-smoke-result-2026-06-28.md) — **36/36 PASS** on `https://twin-sooty.vercel.app`, 54.9s, workers=1 |
| **E** | Phase 3B unblock? | **PENDING** | [gate-e-phase3b-prerequisites-decision-2026-06-28.md](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) — **not executed** |
| **F** | Prod smoke boundaries / re-audit? | **PENDING** | Awaits Gate D/E evidence |

**Pilot/demo GO does not imply public launch GO.**

---

## 3. Runtime Alignment Snapshot

Captured **2026-06-29** (Gate D prod browser smoke run, prod read-only). Values reflect **latest known at time of report** — runtime may advance after docs-only merges.

| Field | Value |
|-------|-------|
| **repo_head** | `1a7acc00d9fc5ebfd4416e6f86f48cd5c59837b4` (`1a7acc00`, Gate D result branch) |
| **prod_frontend_commit** | `1a7acc00d9fc5ebfd4416e6f86f48cd5c59837b4` (`1a7acc00`, aligned at Gate D run) |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health** | `status=ok`, `db_ok=true` (10× poll 2026-06-29) |
| **validated_jobs** | 652 |
| **market_coverage_progress_pct** | 6 |
| **stripe_checkout_ready** | true |
| **alignment_status** | **ALIGNED** — prod FE matches repo HEAD at Gate D run |
| **docs_only_drift** | **false** — prod FE `1a7acc00` = repo HEAD `1a7acc00` |
| **HTTP smoke (10 routes)** | **10/10 × 200** (curl, read-only) — see below |

### HTTP smoke (10 routes, prod — curl only)

| # | Route | Status |
|---|-------|--------|
| 1 | `/` | 200 |
| 2 | `/for-investors` | 200 |
| 3 | `/investor` | 200 |
| 4 | `/investor/product-proof` | 200 |
| 5 | `/demo` | 200 |
| 6 | `/how-it-works` | 200 |
| 7 | `/faq` | 200 |
| 8 | `/dashboard/trust` | 200 |
| 9 | `/status` | 200 |
| 10 | `/api/public-health` | 200 |

---

## 4. Implemented Evidence

Concise shipped evidence (static + documented; no new runtime activation in Slice 25):

| Area | Evidence |
|------|----------|
| **P0 shell fix** | `LightweightRouteShell` / `PersonaWorkspaceGate` minimal fix merged (Gate B, PR #332) |
| **Stale JWT / auth chrome** | Landing auth-shell + logged-in chrome protection (#309–#310, `test:landing-auth-shell`) |
| **Local P0 browser** | Gate C **36/36 PASS** on `p0-no-headless-final-state` inventory |
| **Public navigation IA** | Guest header persona lanes (`/for-*`), Explore mega-panel, footer sitemap (Slices 17–19) |
| **Explore TWIN** | Homepage **10-card** panel + mega-panel groups (`public-explore-twin-routes.ts`, `public-explore-mega-panel-routes.ts`) |
| **Investor IA** | `/for-investors` fundraising page **separate** from `/investor` executive room (Slice 20) |
| **Product Proof** | `/investor/product-proof` discoverable from mega-panel, Explore TWIN, fundraising CTAs, crosslinks (Slice 24 guard) |
| **Founder demo crosslinks** | `founder-demo-crosslinks-routes.ts` + `MarketingCrosslinksBand` on demo/how-it-works/faq/investor surfaces (Slice 21) |
| **Mobile static readiness** | `test:mobile-public-readiness`, overflow/tap-target guards (Slices 22–23) |
| **Public route reference** | `test:public-route-reference-guard` — registry uniqueness + investor IA (Slice 24) |
| **Gate D prod browser** | **36/36 PASS** on prod — [gate-d result](./gate-d-prod-browser-smoke-result-2026-06-28.md) + `test:gate-d-prod-browser-smoke-result` (Slice 32) |
| **Gate D preflight** | Runbook + result template + `test:gate-d-preflight-readiness` (Slice 26) |
| **Gate D founder checkpoint** | [GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md](./GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md) + `test:gate-d-founder-decision-checkpoint` (Slice 28) — **not executed** |
| **Gate D founder decision prompt** | [GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md](./GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md) + `test:gate-d-founder-decision-prompt` (Slice 30) — **PENDING**, no browser run |
| **Readiness consistency lock** | `test:readiness-consistency-lock` (Slice 29) — cross-doc gate/launch stance guards |
| **Gate D pending state maintenance** | `test:gate-d-pending-state-maintenance` (Slice 31) — recurring Gate D/E PENDING + NO-GO stance lock |
| **Public marketing copy** | EN/PL label consistency (`test:public-marketing-copy-consistency`, Slice 27) |
| **Gate E prerequisites** | Decision package prepared; Phase 3B inventory **20 routes** (7+7+6) — static only |
| **Launch stance marker** | `LAUNCH_STANCE = "noGo"` unchanged |

---

## 5. P0 / Browser / Phase 3B Evidence

| Item | Status | Evidence |
|------|--------|----------|
| **p0-no-headless static guard** | **PASS** | `test:p0-no-headless-final-state` — **36 routes**, 10 static tests |
| **p0 route weight inventory** | **PASS** | `test:p0-route-weight-inventory` — 7 tests |
| **p0 performance guardrails** | **PASS** | `test:p0-performance-guardrails` — 15 tests |
| **p0 browser memory guard** | **PASS** | `test:p0-browser-memory-multitab-performance` — 18 tests |
| **Gate C local browser** | **PASS** | **36/36** — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) |
| **Gate D prod browser** | **PASS** | **36/36** — [gate-d result](./gate-d-prod-browser-smoke-result-2026-06-28.md); 54.9s, workers=1, `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` |
| **Phase 3B controlled multitab** | **NOT RUN** | **HARD BLOCKED** — `PHASE3B_ALL_ROUTES` = **20 routes** (7+7+6); static guard 11 tests |
| **P0 closure** | **OPEN** | Gate D prod PASS recorded; Gate E Phase 3B (if unblocked) and launch re-audit still required |
| **Default CI browser** | **DISABLED** | `test:e2e` exits 1; `smoke.yml` has no Playwright steps |

Inventory sources:
- P0: `frontend/e2e/helpers/p0-no-headless-final-state.ts`
- Phase 3B: `frontend/e2e/helpers/phase3b-controlled-routes.ts`

---

## 6. Public Demo Journey Evidence

### Recommended route chain

| Step | Route | Role |
|------|-------|------|
| 1 | `/` | Homepage + Explore TWIN anchor (`/#explore-twin`) |
| 2 | `/for-investors` | Fundraising / diligence entry (not executive room) |
| 3 | `/investor` | Executive investor room (read-only preview) |
| 4 | `/investor/product-proof` | Bounded product evidence |
| 5 | `/demo` | Interactive simulation |
| 6 | `/how-it-works` | Product narrative |
| 7 | `/faq` | Bounded FAQ |
| 8 | `/dashboard/trust` | Trust center preview |
| 9 | `/status` | Ops / health surface |

### Static guards covering this journey

| Guard | Tests | Scope |
|-------|-------|-------|
| `test:founder-demo-crosslinks` | 13 | Crosslink band on investor journey surfaces |
| `test:public-marketing-consistency` | 12 | CTA/container + `/for-investors` vs `/investor` separation |
| `test:public-route-reference-guard` | 8 | Registry hrefs, 10-card Explore, product-proof discoverability |
| `test:mobile-public-readiness` | 10 | Mobile overflow/tap-target on demo surfaces |
| `test:homepage-nav` | 17 | Header/footer nav + Explore TWIN |
| `test:launch-readiness-evidence-guard` | 14 | This index + checklist stance guards (Slices 25–31) |
| `test:public-marketing-copy-consistency` | 7 | EN/PL marketing label terminology (Slice 27) |
| `test:gate-d-preflight-readiness` | 9 | Gate D preflight runbook guards (Slices 26–28) |
| `test:gate-d-founder-decision-checkpoint` | 13 | Gate D founder decision checkpoint (Slice 28) |
| `test:gate-d-founder-decision-prompt` | 11 | Gate D founder decision prompt (Slice 30–31) |
| `test:readiness-consistency-lock` | 16 | Cross-doc readiness stance consistency lock (Slice 29–31) |
| `test:gate-d-pending-state-maintenance` | 11 | Gate D pending state maintenance lock (Slice 31) |
| `test:gate-d-prod-browser-smoke-result` | 9 | Gate D prod browser smoke result guards (Slice 32) |

Full step-by-step founder script: [FOUNDER_DEMO_CHECKLIST_2026-06-28.md](./FOUNDER_DEMO_CHECKLIST_2026-06-28.md).

---

## 7. Explicitly Blocked / Not Live

| Item | Status |
|------|--------|
| **Public launch GO** | **NOT approved** |
| **P0 closure** | **NOT approved** — remains **OPEN** |
| **Gate D prod browser** | **EXECUTED PASS** — 36/36 — [result doc](./gate-d-prod-browser-smoke-result-2026-06-28.md) |
| **Gate E Phase 3B** | **NOT run** — **HARD BLOCKED** |
| **Phase 3B pass claim** | **Forbidden** — no prod/local Phase 3B execution signed off |
| **Default CI browser** | **DISABLED** — explicit env flags required |
| **ATS writeback** | **NOT LIVE** |
| **Outreach / email send** | **NOT LIVE** |
| **Calendar write / sync** | **NOT LIVE** in prod (`microsoft_calendar_write_enabled=false`) |
| **Payments / revenue recognition** | **NOT LIVE** for demo claims |
| **Auto-apply / delegated apply** | **PAUSED** |
| **H5c/H5d external recruiter cohort** | **HOLD** — 0 external invites |
| **Placement confirmed / externally verified** | **NOT claimable** in demo |

---

## 8. Required Next Decisions

1. ~~**Gate D = YES**~~ → **DONE** — [gate-d result](./gate-d-prod-browser-smoke-result-2026-06-28.md) records **36/36 PASS** (2026-06-29).
2. **Gate E = YES** → founder review after Gate D **PASS**; then gated Phase 3B per [gate-e prerequisites §7](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) — **separate explicit YES required**.
3. **Gate F / launch re-audit** → only after Gate D/E evidence and P0 performance review.
4. **Public launch GO** → separate founder decision; §5 launch gate matrix must be green; **not implied** by this index.

**Founder response format (Gates A–F):** see [SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md) §7.

---

## 9. Founder Demo Checklist Linkage

Use **[FOUNDER_DEMO_CHECKLIST_2026-06-28.md](./FOUNDER_DEMO_CHECKLIST_2026-06-28.md)** for:

- Pre-demo health checks
- 10-step bounded demo path
- “What to say” / “What not to say”
- Fallback if a route looks wrong

This index summarizes evidence; the checklist is the **operational run sheet** for founder-led demos.

---

## 10. Source Documents

| Document | Role |
|----------|------|
| [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) | Gate C local browser 36/36 PASS |
| [gate-d-prod-browser-smoke-decision-2026-06-28.md](./gate-d-prod-browser-smoke-decision-2026-06-28.md) | Gate D decision package — **PENDING** |
| [GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md](./GATE_D_FOUNDER_DECISION_CHECKPOINT_2026-06-28.md) | Gate D founder decision checkpoint — **PENDING** |
| [GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md](./GATE_D_FOUNDER_DECISION_PROMPT_2026-06-28.md) | Gate D founder decision prompt — **PENDING** |
| [gate-d-prod-browser-smoke-preflight-2026-06-28.md](./gate-d-prod-browser-smoke-preflight-2026-06-28.md) | Gate D preflight runbook — **not executed** |
| [gate-d-prod-browser-smoke-result-2026-06-28.md](./gate-d-prod-browser-smoke-result-2026-06-28.md) | Gate D prod browser **36/36 PASS** |
| [gate-d-prod-browser-smoke-result-template-2026-06-28.md](./gate-d-prod-browser-smoke-result-template-2026-06-28.md) | Gate D result template (blank — execution in dated result doc) |
| [gate-e-phase3b-prerequisites-decision-2026-06-28.md](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) | Gate E prerequisites — **PENDING** |
| [TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md](./TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md) | Launch roadmap + demo boundaries |
| [TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md](./TWIN_FEATURE_STATUS_AUDIT_2026-06-27.md) | Module classification |
| [TWIN_OPERATING_CONTEXT_2026-06-26.md](./TWIN_OPERATING_CONTEXT_2026-06-26.md) | Ops source of truth |
| [P0_SHELL_FOUNDER_REVIEW_2026-06-28.md](./P0_SHELL_FOUNDER_REVIEW_2026-06-28.md) | P0 shell founder review |
| [P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md](./P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md) | P0 headless false-PASS incident |
| [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md) | P0 route inventory |
| [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md) | Phase 3B **BLOCKED** |
| [SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md) | Gates A–F checklist |
| [FOUNDER_DEMO_CHECKLIST_2026-06-28.md](./FOUNDER_DEMO_CHECKLIST_2026-06-28.md) | Bounded demo run sheet (Slice 25) |
| [HIRING_JOURNEY_TRACEABILITY_2026-06-26.md](./HIRING_JOURNEY_TRACEABILITY_2026-06-26.md) | Hiring journey preview traceability |

---

## Hard bans honoured (this doc)

- Gate D prod browser executed once (canonical command); no Phase 3B execution; no default CI browser.
- No backend/API/auth/DB/env/smoke.yml changes.
- No launch GO, no P0 closed claims.

**Public launch: NO-GO · P0: OPEN · Gate D: YES/PASS · Gate E: PENDING · Phase 3B: NOT RUN / HARD BLOCKED**
