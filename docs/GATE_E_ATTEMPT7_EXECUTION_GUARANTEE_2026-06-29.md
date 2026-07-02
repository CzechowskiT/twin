# Gate E Phase 3B — Attempt 7 Execution Guarantee — 2026-06-29

**Status:** **STATIC ANALYSIS + HARNESS PATCH ONLY — NO BROWSER RUN, NO PHASE 3B EXECUTION**
**Purpose:** Answer [`GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md`](./GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md) §5 ("Harness Gap Check — Concurrency Cap Enforcement") from the implementation, not assumptions: prove the exact concurrency ceiling the Phase 3B controlled-multitab harness can produce, patch every gap found, and add static tests that fail if any of those guarantees regress.
**This document does not authorize attempt 7, does not run Playwright, Phase 3B, or any browser/Chrome process, and does not touch backend/API/auth/DB/env/`smoke.yml`.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [attempt 7 safety plan](./GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md) · [attempt 6 resource-safety abort](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## Verdict

**SAFE_TO_RUN** — the harness now enforces its documented concurrency cap in code, verified statically (`tsc`, `playwright test --list`, 23/23 new static guard tests), closing every gap the safety plan's §5 check required to be closed before attempt 7 could be authorized.

**This verdict answers "is the harness capable of enforcing the cap" — it does NOT answer, and does NOT itself grant, "Gate E attempt 7 with resource-safety limits = YES?"**. That founder decision (safety plan §2) is still required, separately, before attempt 7 is executed. This document authorizes nothing and runs nothing.

---

## 1. Scope

| In scope | Out of scope (hard bans honoured) |
|---|---|
| `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Running Playwright, Phase 3B, or any browser/Chrome/chrome-headless-shell process |
| `frontend/playwright.config.ts` | Backend, API, auth, DB, `.env*` files |
| `frontend/e2e/helpers/{browser-lifecycle,load-local-test-env,phase3b-controlled-routes,phase3b-harness-diagnostics}.ts` | `.github/workflows/smoke.yml` |
| `frontend/scripts/playwright-global-teardown.mjs` | Any prod mutation |
| `frontend/package.json` phase3b-related scripts | Authorizing attempt 7 |

---

## 2. Evidence Table (from implementation)

| Dimension | Value | Evidence |
|---|---|---|
| Workers | **1**, hard-coded literal, not env-derived | `playwright.config.ts`: `workers: 1,` (previously `process.env.CI ? 1 : 1`, i.e. already always 1, now also un-ambiguous) |
| `fullyParallel` | `false` | `playwright.config.ts` |
| Playwright projects | **1** (`chromium` only) | `playwright.config.ts` `projects` array |
| Browser processes (theoretical max) | **1** | `browser` fixture is worker-scoped; `workers: 1` ⇒ exactly one Chromium launch for the entire spec file run (preflight test + 3 batch tests share it) |
| Contexts (theoretical max, concurrent) | **1** | Single `withFreshContext(browser, …)` call site, looped once per batch `test()`; `test.describe.configure({ mode: "serial" })` ⇒ batch tests run one after another, never overlapping; new `assertNoLeakedContextsFromPriorBatch()` guard throws if `browser.contexts().length !== 0` before the next batch starts |
| Pages/tabs per batch (max) | **7** (documented cap 8) | `PHASE3B_ROUTE_BATCHES`: public-candidate=7, recruiter=7, company=6 (`phase3b-controlled-routes.ts`); `expect(batch.routes.length).toBeLessThanOrEqual(PHASE3B_MAX_TABS)` plus new `assertTabBudget()` throws before any `context.newPage()` call once `PHASE3B_MAX_TABS` (8) open pages exist |
| Page-open concurrency model | **Sequential**, staggered 500–1000ms | `for (let i = 0; …) { trackers.push(await openRouteStaggered(...)); await sleep(stagger) }` — no `Promise.all` fan-out |
| Batch model | **Sequential** (serial describe mode) | `test.describe.configure({ mode: "serial", retries: 0, … })` |
| Route evaluation after idle | **Sequential** | `for (const tracker of trackers) { … }` — no `Promise.all` fan-out |
| Retries | **0**, pinned at the describe level | `test.describe.configure({ mode: "serial", retries: 0, … })` — independent of `playwright.config.ts`'s global `retries: process.env.CI ? 1 : 0`, so a `CI=1` env leak cannot reintroduce an automatic retry for this spec |
| `Promise.all` occurrences in spec | **1 call site**, scoped only to 3 CDP `client.send()` calls on an already-open single page (`captureCdp`) | Verified: no `Promise.all` wraps `newPage(`, `newContext(`, or `chromium.launch(` anywhere in the file (static-test-enforced) |
| Cleanup guarantee | `withFreshContext` closes **every** `context.pages()` (not just tracked ones) then the context, inside `try { … } finally { … }`, swallowing close errors | `browser-lifecycle.ts` |
| Orphan-process safety net | `globalTeardown` SIGTERM-kills any leftover `ms-playwright`-cached `chrome-headless-shell` process after the **entire** run ends, regardless of pass/fail/crash | `scripts/playwright-global-teardown.mjs` |
| Max theoretical `chrome-headless-shell` OS processes during a batch | **1 main browser process** + up to **7 renderer child processes** (one per open tab, standard Chromium multi-process model) + GPU/utility helper processes Chromium itself spawns | Bounded by the 1-browser/1-context/≤7-page ceiling above; this is normal Chromium process-per-tab architecture, not an application-level leak |
| Timeouts | Per-route `page.goto` 30s; per-route DOM read 8s (race); per-route CDP read 5s (race); per-batch test timeout 900s (prod) / 1,200s (local) | `ROUTE_GOTO_MS`, `readDomState`, `captureCdp`, `test.describe.configure({ timeout })` |

---

## 3. Risky Code Paths Identified — and Disposition

| # | Risky pattern (per task checklist) | Found? | Disposition |
|---|---|---|---|
| 1 | Multiple browsers/contexts | Contexts theoretically bounded to 1 by design, but **no automated proof existed** that a leaked context from a prior batch couldn't silently stack | **PATCHED** — `assertNoLeakedContextsFromPriorBatch(browser)` now runs before every batch, throwing if `browser.contexts().length !== 0` |
| 2 | Orphan processes | `globalTeardown` already existed (post-run safety net) | **Unchanged, sufficient** — kept as final-line defense; primary defense is now the in-test guards below, which fail fast instead of relying on teardown alone |
| 3 | Bypass `workers=1` | `playwright.config.ts` had `workers: process.env.CI ? 1 : 1` (already always 1, but expressed as a CI-conditional, inviting a future edit to diverge the branches); every phase3b npm script already hard-codes `--workers=1` on the CLI, which takes precedence over config regardless | **PATCHED (defense-in-depth)** — simplified to literal `workers: 1,`; static test asserts no `process.env` in that line |
| 4 | Internal retries | `playwright.config.ts` global `retries: process.env.CI ? 1 : 0` would apply to Phase 3B too if `CI=1` were ever set in the runner env — a real path to an unintended automatic retry, which is an explicit hard ban (safety plan §4.5) | **PATCHED** — `test.describe.configure({ retries: 0 })` pinned at the Phase 3B describe block, overriding the global config for this spec regardless of `CI` |
| 5 | `Promise.all` fan-out | One `Promise.all` exists, scoped to 3 CDP metric calls (`Runtime.getHeapUsage`, `Memory.getDOMCounters`, `Performance.getMetrics`) on a single already-open page — **not** a resource-creation fan-out | **No patch needed** — confirmed safe by static test (asserts no `newPage(`/`newContext(`/`chromium.launch(` inside any `Promise.all(...)` block in the file) |
| 6 | Route-batch data could grow past the tab cap in a future edit | `PHASE3B_ROUTE_BATCHES` is static data with no independent runtime enforcement at the page-open call site (only a top-of-test `expect()`, which is a test assertion, not a hard guard at the point pages are actually created) | **PATCHED** — `assertTabBudget(context)` runs immediately before every `context.newPage()` call, independent of the batch data, throwing before any additional tab (and its renderer process) could be created |

---

## 4. Why Attempt 6's Failure Mode Cannot Repeat (and What Remains a Residual Risk)

Attempt 6 observed **multiple `chrome-headless-shell` instances** and **elevated `kernel_task`** during an already-`workers=1`, already-bounded-by-batch-size run. The static evidence above shows the *application-level* concurrency ceiling (1 browser, 1 context, ≤7 pages, sequential batches, zero retries) was already structurally sound going into attempt 6 — the code paths that could cause an actual **fan-out bug** (leaked context, tab-budget bypass, silent retry, `Promise.all` resource creation) are the ones this patch closes and pins with static tests, so a **regression** in any of those specific paths is now caught by `npm run test:gate-e-attempt7-execution-guarantee` before it could ship.

**What this patch does *not*, and cannot, prove or prevent:**

- **Normal Chromium process-per-tab behavior is not a bug.** Up to 7 concurrently open tabs in one context legitimately spawn multiple `chrome-headless-shell` OS processes (one browser + up to 7 renderers + helper/GPU processes) — this is expected Chromium architecture, not evidence of a harness defect, and static code review cannot distinguish "normal multi-process rendering under load" from "runaway" without live process telemetry.
- **Host-level resource conditions** (CPU already elevated before the run, other heavy foreground work, thermal throttling, non-Playwright processes) are outside this spec's control and are exactly what safety plan §3 preconditions and §4.6–§4.7 stop rules exist to catch **during** a live run — this document changes none of that; the manual/automated stop-rule discipline in the safety plan remains the operative safeguard for host-level anomalies.
- **This is static analysis only.** No attempt 7 has been run under this patch; the guarantees above are proven by `tsc`, `playwright test --list` (no browser), and the 23 static assertions in `gate-e-attempt7-execution-guarantee.test.ts` — not by an actual execution. The first real-world confirmation that the patched guards behave as expected can only come from an actual (separately authorized) attempt 7.

---

## 5. Static Verification Performed (exact counts)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | **0 errors** |
| Playwright static listing (no browser) | `npx playwright test e2e/phase3b-controlled-multitab.spec.ts --workers=1 --list` | **4 tests listed** (1 preflight + batches: public-candidate=7 tabs, recruiter=7 tabs, company=6 tabs); **0 browser processes launched** |
| New static guard suite | `npm run test:gate-e-attempt7-execution-guarantee` | **23/23 passed** |
| Pre-existing attempt 6 / safety-plan guard suite | `npm run test:gate-e-attempt6-resource-abort` | unaffected by this patch (docs-only assertions) |
| `smoke.yml` | grep for `playwright test` / `phase3b-controlled-multitab` | **0 matches** — unchanged, browser still disabled by default in CI |

No Playwright browser was launched, no `chrome-headless-shell` process was spawned, and no Phase 3B route was evaluated to produce this document.

---

## 6. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO Playwright run | Confirmed — only `--list` (static enumeration) was used, never a real invocation |
| NO Phase 3B execution | Confirmed — 0 routes evaluated |
| NO browser/Chrome processes | Confirmed — `--list` does not launch a browser |
| NO backend/API/auth/DB/env/`smoke.yml` changes | Confirmed — only `frontend/e2e/*`, `frontend/playwright.config.ts`, `frontend/package.json` (scripts map), `frontend/scripts/gate-e-attempt7-execution-guarantee.test.ts`, and this doc changed |
| NO prod mutation | Confirmed — no network calls to prod were made |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO attempt 7 authorization or execution | **NOT authorized, NOT run** by this document — the founder's exact §2 question ("Gate E attempt 7 with resource-safety limits = YES?") remains open and unanswered by this document |

---

## Explicit Non-Claims

- **Attempt 7:** **NOT authorized, NOT run** by this document
- **Harness concurrency cap:** now **enforced in code and statically verified** — this closes the safety plan §5 gap check, it does not answer the safety plan §2 founder question
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this document adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Default CI browser:** **DISABLED** (`smoke.yml` unchanged)

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · Harness concurrency cap: SAFE_TO_RUN (code-enforced, statically verified) · Attempt 7: NOT AUTHORIZED, NOT RUN**
