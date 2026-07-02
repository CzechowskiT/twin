# P0 Shell Founder Review — 2026-06-28

**Branch:** `docs/p0-shell-founder-review-2026-06-28`  
**Base:** `cursor/phase1-monorepo-scaffold` @ `9d0f9bc` (PR #324 merged)  
**Owner:** TWIN P0 Performance / Shell Review  
**Purpose:** Founder decision package for Slice 12 — **review only**, not implementation approval.

**Canonical references:**
- [P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md](./P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md)
- [P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md](./P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md)
- [PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md)
- [P0_PERFORMANCE_INVENTORY_2026-06-27.md](./P0_PERFORMANCE_INVENTORY_2026-06-27.md)
- [TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md](./TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md)

---

## 1. Executive Summary

| Gate | Status |
|------|--------|
| **P0 performance** | **OPEN** — no Phase 3B prod proof, no signed Lighthouse budgets |
| **Phase 3B controlled multitab** | **FAIL** — prod **0/20** ([gate-e result](./gate-e-phase3b-result-2026-06-28.md)); post-fix retry **HARD BLOCKED** until [retry checkpoint](./GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md) founder YES |
| **Public launch** | **NO-GO** |
| **This document** | **Gate B + Gate C + Gate D PASS** — local + prod browser **36/36 PASS**; Gate E **YES/FAIL** — Phase 3B prod **0/20** |

**Slice 13 shipped** (PR #324): 5 hiring-journey routes added to `p0-no-headless-final-state` (31 → **36 routes**); static guards 9/9; browser smoke remains **gated**, not default CI.

**Slice 12 remains blocked** until founder explicitly approves implementation gates in §6. This PR prepares the review package and static guards only — **no shell code changes**.

---

## 2. Current Baseline

| Field | Value |
|-------|-------|
| **repo_head** | `62138dccd986bb068e717a9dafee38f822e94c66` (PR #332) |
| **prod_frontend_commit** | `62138dccd986bb068e717a9dafee38f822e94c66` (public-health 2026-06-28) |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (`6d6d1e5`, PR #281) |
| **public-health** | `status=ok`, `db_ok=true` |
| **alignment_status** | **ALIGNED** — prod FE matches scaffold post-#332 |
| **Gate C local browser** | **PASS** — 36/36, workers=1, 44.5s — [evidence](./gate-c-browser-validation-result-2026-06-28.md) |
| **p0-no-headless route inventory** | **36 routes** (public 3, candidate 10, recruiter 11, company 11, board 1) |
| **Hiring Journey in inventory** | ✅ 5 routes — static/gated prep only; browser not run |

### Route lanes (36)

| Lane | Count | Hiring Journey route |
|------|-------|----------------------|
| Public | 3 | — |
| Candidate | 10 | `/dashboard/hiring-journey`, `/profile/hiring-journey` |
| Recruiter | 11 | `/recruiter/hiring-journey` |
| Company | 11 | `/company/hiring-journey` |
| Board | 1 | `/board/hiring-journey` |

Inventory: `frontend/e2e/helpers/p0-no-headless-final-state.ts`

---

## 3. Problem Statement

1. **Shell paint / route performance risk remains unresolved.** Prior founder incident (2026-06-16): 6+ recruiter tabs → blank screens, Chrome renderers 5–7.5 GB each. Root cause implicates `LightweightRouteShell` skeleton deferral, `PersonaWorkspaceGate` redirect churn, and client-heavy layouts.

2. **No Phase 3B prod proof after prior incident.** Phase 3B local run was 21/21 PARTIAL; prod run **FAIL** (context crash + commit mismatch). Phase 3B heuristic allowed `shellReady || mainVisible` to PASS with chrome-only frames — false positive risk documented in [P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md](./P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md).

3. **Browser / default CI remains blocked.** Playwright default CI **DISABLED** since 2026-06-16 CPU storm (`test:e2e` exits 1). All browser smokes require explicit env flags (`PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` or `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`). GitHub `smoke.yml` runs backend pytest + `npm run build` only — no Playwright.

4. **P0 headless guard exists but shell fix not applied.** Static evaluator distinguishes auth card vs chrome-only shell (`isChromeOnly`). Implementation of shell/gate/layout changes is **forbidden** without this founder review.

---

## 4. Proposed Technical Direction

**Review scope only — no code in this slice.**

| Component | File | Intended risk reduction (post-approval) |
|-----------|------|----------------------------------------|
| Paint shell | `frontend/src/components/lightweight-route-shell.tsx` | Ensure hidden tabs and hydration stalls cannot leave skeleton as final state; align with `isChromeOnly` evaluator |
| Auth gate | `frontend/src/components/persona-workspace-gate.tsx` | Preserve auth card as valid final state; eliminate redirect loops on multi-tab open |
| Workspace layout | `frontend/src/components/workspace-route-layout.tsx` | Gate → shell ordering; skeleton only when necessary |
| Loading shells | persona `loading.tsx` files | Server skeleton before hydration without blocking forever |
| Phase 3B evaluator | `frontend/e2e/helpers/phase3b-harness-diagnostics.ts` | Auth tier + classification enum; preflight `frontend_commit` gate (Slice 35) |
| Phase 3B routes | `frontend/e2e/helpers/phase3b-controlled-routes.ts` | 20 routes in 3 batches (7+7+6) |

**Prior fix plan (Phase 2, PR #149 — reference only):** Fixes A–F documented in [P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md](./P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md). Founder must confirm which fixes remain in scope before implementation branch opens.

**Implementation branch naming (suggested):** `fix/p0-shell-lightweight-route-2026-06-XX` — **do not create until Gate B approved (§6).**

---

## 5. Explicit Non-Goals

This review package and any subsequent approved implementation **must not**:

- Change backend, API, auth provider, DB, migrations, or env
- Activate live actions (auto-apply, calendar write, email send, ATS sync, outreach)
- Run Phase 3B, multitab stress, or headless browser in default CI
- Claim P0 **CLOSED** or public launch **GO**
- Enable `test:e2e` or browser scripts without explicit env flags
- Touch hiring-journey workflow engine (remains `readiness_preview`)
- Merge shell/gate/layout changes without founder sign-off on §6 gates

---

## 6. Founder Decision Required

Each gate is a **separate yes/no**. Default for all: **NO / HOLD** until founder responds.

| Gate | Question | Default | If YES → allowed next step |
|------|----------|---------|---------------------------|
| **A** | Approve this static review package (docs + guards)? | HOLD | Merge this PR; no runtime change |
| **B** | Approve opening an **implementation branch** for `LightweightRouteShell` / `PersonaWorkspaceGate` / layout? | **YES** | Minimal fix merged `fix/p0-shell-lightweight-route-2026-06-28`; Gate C required before browser |
| **C** | Approve **gated local browser** validation (`test:p0-no-headless-final-state-browser`, 36 routes)? | **YES** (local only) | **PASS** 36/36 — see [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md); prod still requires Gate D |
| **D** | Approve **gated prod browser** smoke post-deploy? | **PENDING** | Run per [gate-d decision](./gate-d-prod-browser-smoke-decision-2026-06-28.md) §4 — `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1` |
| **E** | Approve **Phase 3B unblock** (controlled multitab, 20 routes)? | **PENDING** | Requires Gate C PASS first; then gated browser per Phase 3B doc |
| **F** | Approve production smoke boundaries (founder JWT, sequential only, workers=1)? | **PENDING** | Document JWT + route list in ops runbook |

**Founder response format (copy-paste):**

```
Slice 12 gates: A=YES|NO B=YES|NO C=YES|NO D=YES|NO E=YES|NO F=YES|NO
Notes: ...
```

---

## 7. Required Static Gates Before Any Implementation

All must pass on implementation PR before merge:

```bash
cd frontend
npm run test:p0-no-headless-final-state      # 10/10 assertions (includes stance guard)
npm run test:p0-route-weight-inventory
npm run test:p0-performance-guardrails
npm run test:hiring-journey
npm run build
npx tsc --noEmit
```

**Additional merge criteria (from P0 no-headless doc):** Changes must be shell/gate/layout fixes only if Gate B approved. Route-level fixes allowed without shell touch. If shell files change → founder Gate B must be YES.

---

## 8. Required Gated Browser Validation After Explicit Unblock Only

**Never default CI.** Requires founder Gate C and/or D.

### Local (Gate C)

```bash
cd frontend
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:p0-no-headless-final-state-browser

PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:hiring-journey-browser
```

### Production (Gate D)

```bash
cd frontend
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:p0-no-headless-final-state-browser
```

### Phase 3B (Gate E — separate, post-shell)

```bash
# DO NOT RUN until Gate E = YES
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:phase3b-controlled-multitab-browser
```

**Env flags summary:**

| Flag | Purpose |
|------|---------|
| `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` | Local browser smokes |
| `PLAYWRIGHT_ENABLE_WEBSERVER=1` | Start local Next.js for browser tests |
| `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` | Prod URL smoke (requires Gate D) |
| `PLAYWRIGHT_SKIP_WEBSERVER=1` | Use prod/staging URL instead of local |

---

## 9. Rollback / Stop Conditions

**STOP immediately and revert if any occur during gated browser work:**

| Condition | Action |
|-----------|--------|
| `chrome-headless-shell` CPU storm / runner hang | Abort; do not merge; document in Phase 3B doc |
| Memory spike (>512 MB JS heap per tab or founder RSS regression) | STOP Phase 3B; keep BLOCKED |
| Route timeout (>900s suite) or stuck skeleton final state | Fix route or shell before retry |
| Hydration/auth-shell regression (lost `next=` deep link) | Revert shell/gate change |
| Production commit mismatch during prod smoke | Wait for Vercel deploy; do not claim PASS |
| False PASS (chrome-only shell passes evaluator) | Tighten evaluator; do not unblock Phase 3B |

**Rollback:** Revert implementation PR; restore Phase 3B **BLOCKED**; P0 remains **OPEN**.

---

## 10. Launch Impact

| Outcome | Launch stance |
|---------|---------------|
| Shell fix merges + local browser PASS | **NO-GO** — P0 still OPEN until Phase 3B prod PASS + multitab RSS validated |
| Phase 3B local PASS | **NO-GO** — prod proof required |
| Phase 3B prod PASS | **NO-GO** — Lighthouse budgets, stress closure, launch gate audit (§5 launch plan) still open |
| All P0 gates closed | Founder sign-off on [PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) required — **not automatic GO** |

**Code constant unchanged:** `LAUNCH_STANCE = "noGo"` in `frontend/src/lib/investor-metrics-reality.ts`

Even perfect shell performance does **not** imply public launch, auto-apply activation, or external recruiter invites (H5c/H5d **HOLD**).

---

## 11. Decision Log

| Date | Decision | Status |
|------|----------|--------|
| 2026-06-17 | Phase 3B multitab — **STOP** until shell fix | **ACTIVE BLOCK** |
| 2026-06-16 | Playwright default CI **DISABLED** | **ACTIVE** |
| 2026-06-28 | Slice 13 — hiring journey → p0-no-headless (36 routes) | **SHIPPED** (#324) |
| 2026-06-28 | Slice 12 — P0 shell founder review package | **PENDING FOUNDER REVIEW** |
| 2026-06-28 | Slice 16 — Phase 3B static guard refresh (20 routes, 8 static guards) | **SHIPPED** |
| 2026-06-28 | **Slice 12 founder sign-off checklist** — [SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md](./SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md); Gates A–F default **PENDING** | **PENDING FOUNDER REVIEW** |
| TBD | Gate A — approve review package | **PENDING** |
| 2026-06-28 | **Gate B — minimal shell fix merged** (`PersonaWorkspaceGateShell`, `hasActiveSession`, lazy `OnboardingGate`) | **SHIPPED** |
| 2026-06-28 | **Gate C — local browser validation PASS** (36/36, workers=1) | **SHIPPED** — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md) |
| 2026-06-28 | **Gate D — prod browser decision package** (docs + static guards; **not executed**) | **PENDING** — [gate-d-prod-browser-smoke-decision-2026-06-28.md](./gate-d-prod-browser-smoke-decision-2026-06-28.md) |
| 2026-06-28 | **Gate E — Phase 3B prerequisites package** (docs + static guards; **not executed**) | **PENDING** — [gate-e-phase3b-prerequisites-decision-2026-06-28.md](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) |
| 2026-06-29 | **Gate D — prod browser PASS** 36/36 | **PASS** — [gate-d-prod-browser-smoke-result-2026-06-28.md](./gate-d-prod-browser-smoke-result-2026-06-28.md) |
| 2026-06-29 | **Gate E — Phase 3B prod FAIL** 0/20 (reattempt); attempt 1 ABORTED_RESOURCE_SAFETY | **FAIL** — [gate-e-phase3b-result-2026-06-28.md](./gate-e-phase3b-result-2026-06-28.md) |
| 2026-07-01 | **Cursor-agent `TWIN_ACCESS_TOKEN` loading harness/tooling fix** (Slice 40) — [CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md](./CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md); no browser run; Gate E remains **PARTIAL/AUTH_TOKEN_REQUIRED** | **SHIPPED** (tooling only) |
| 2026-07-01 | **Gate E with-token retry attempt 5** — token present, browser **executed once**, crashed at module load (`HARNESS_LOAD_FAILURE`); loader defect fixed same PR, unverified by browser | **PARTIAL** — [gate-e-phase3b-attempt5-with-token-result-2026-06-29.md](./gate-e-phase3b-attempt5-with-token-result-2026-06-29.md) |
| 2026-07-02 | **Gate E with-token retry attempt 6** — canonical command **started**, manually interrupted for local resource safety (`chrome-headless-shell` CPU saturation + elevated `kernel_task`); process cleanup confirmed; 0/20 routes evaluated; no automatic retry; attempt 7 **NOT authorized** | **ABORTED_RESOURCE_SAFETY / INCONCLUSIVE** — [gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) |
| TBD | P0 performance **CLOSED** | **BLOCKED** |
| TBD | Public launch **GO** | **BLOCKED** |

---

## Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
test -f docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md
cd frontend && \
  npm run test:p0-no-headless-final-state && \
  npm run test:p0-route-weight-inventory && \
  npm run test:p0-performance-guardrails && \
  npm run test:hiring-journey && \
  npm run build && npx tsc --noEmit
```

**Gate C local browser:** **PASS** 36/36 — [gate-c-browser-validation-result-2026-06-28.md](./gate-c-browser-validation-result-2026-06-28.md).

**Gate D prod browser:** **PASS** 36/36 — [gate-d-prod-browser-smoke-result-2026-06-28.md](./gate-d-prod-browser-smoke-result-2026-06-28.md).

**Gate E Phase 3B prod:** **FAIL** 0/20 — [gate-e-phase3b-result-2026-06-28.md](./gate-e-phase3b-result-2026-06-28.md) (attempt 1 [ABORTED_RESOURCE_SAFETY](./gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md)).

**Gate E founder decision package:** [GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md](./GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md) — historical package (**PENDING** at publish).

**Gate E prerequisites package:** [gate-e-phase3b-prerequisites-decision-2026-06-28.md](./gate-e-phase3b-prerequisites-decision-2026-06-28.md) — historical package (**PENDING** at publish).

**Gate E retry-after-harness-fix checkpoint:** [GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md](./GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md) — founder YES (×4); post-harness retry **PARTIAL/AUTH_TOKEN_REQUIRED** on attempts #1 + #2 — [result doc](./gate-e-phase3b-retry-after-harness-fix-result-2026-06-29.md); with-token retries **PARTIAL/AUTH_TOKEN_REQUIRED** on attempts #3 — [attempt 3 result](./gate-e-phase3b-retry-with-token-result-2026-06-29.md) — and #4 — [attempt 4 result](./gate-e-phase3b-attempt4-with-token-result-2026-06-29.md); browser **NOT RUN** on all four attempts. **Attempt 5** — token present, browser **executed once**, crashed at module load (`HARNESS_LOAD_FAILURE`) — [attempt 5 result](./gate-e-phase3b-attempt5-with-token-result-2026-06-29.md). **Attempt 6** — command **started**, manually interrupted for local resource safety — **ABORTED_RESOURCE_SAFETY/INCONCLUSIVE** — [attempt 6 abort](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md); attempt 7 planned but **NOT authorized** — [attempt 7 safety plan](./GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md).

**Launch evidence index (Slice 25):** [LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md) · [FOUNDER_DEMO_CHECKLIST_2026-06-28.md](./FOUNDER_DEMO_CHECKLIST_2026-06-28.md)

**Not run:** Phase 3B (Gate E) route-level completion (attempts 5-6 both produced zero route-level evidence), multitab, stress. Attempt 7 **not run, not authorized**.

**Public launch: NO-GO · P0 performance: OPEN · Phase 3B: FAIL (0/20 prod) · Gate C: YES (local PASS) · Gate D: YES (prod PASS) · Gate E: YES/FAIL**
