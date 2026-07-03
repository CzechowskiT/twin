# Phase 3B Resource Watchdog — 2026-07-03

**Status:** **HARNESS PATCH + STATIC TESTS ONLY — NO BROWSER RUN, NO PHASE 3B EXECUTION, NO PROD MUTATION**
**Purpose:** Close the residual risk explicitly flagged (but never resolved) by [`GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md`](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) §4 — host-level `chrome-headless-shell` process/resource runaways were only ever caught by **manual operator observation** (attempts 1 and 6), never by code. [Attempt 9](./gate-e-phase3b-attempt9-result-2026-07-02.md) was manually aborted **before any Playwright invocation** specifically because this gap was still open. This document and its accompanying code close it.
**This document does not authorize attempt 10, does not run Playwright, Phase 3B, or any browser/Chrome process, and does not touch backend/API/auth/DB/env/`smoke.yml`.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [attempt 9 result](./gate-e-phase3b-attempt9-result-2026-07-02.md) · [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) · [attempt 7 safety plan](./GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md) · [attempt 6 resource-safety abort](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why This Exists

Two of nine chronological Gate E Phase 3B prod attempts have been aborted for **local resource safety**, and a third (attempt 9) was aborted **pre-emptively** for the same underlying reason:

- **Attempt 1** — [ABORTED_RESOURCE_SAFETY](./gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md) — elevated CPU during static preflight, stopped before the prod command ran at all.
- **Attempt 6** — [ABORTED_RESOURCE_SAFETY](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) — multiple `chrome-headless-shell` instances saturated CPU with elevated `kernel_task` **during** the run, stopped mid-execution, caught only by manual observation.
- **Attempt 9** — [ABORTED_RESOURCE_SAFETY / MANUAL_ABORT](./gate-e-phase3b-attempt9-result-2026-07-02.md) — AC power precondition passed, but the operator manually aborted **before** invoking Playwright, because the automated watchdog this document describes did not exist yet.

The [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) proved the harness's *application-level* concurrency ceiling (1 browser, 1 context, ≤7 pages, serial batches, 0 retries) is sound and code-enforced — but its §4 explicitly said this "does not, and cannot, prove or prevent" **host-level resource conditions during a live run**, and left that as a manual-stop-rule-only safeguard. This document closes that specific gap.

---

## 2. What Shipped

| Component | File | Purpose |
|---|---|---|
| Watchdog helper | `frontend/e2e/helpers/phase3b-resource-watchdog.ts` | Process-count monitoring, timeout guard, cleanup-on-abort, prod enable-gate |
| Spec wiring | `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Preflight enforcement + per-batch violation checks + guaranteed `stop()` |
| npm script gate | `frontend/package.json` (`test:phase3b-controlled-multitab-prod`) | Refuses to run without `PHASE3B_RESOURCE_WATCHDOG=1`, in addition to the existing `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` |
| Static guard | `frontend/scripts/phase3b-resource-watchdog.test.ts` (`npm run test:phase3b-resource-watchdog`) | Proves all of the above without launching a browser |

### 2.1 Watchdog helper capabilities

| Capability | How |
|---|---|
| **Process-count monitoring** | `countChromeHeadlessShellProcesses()` polls `pgrep -fc chrome-headless-shell` (read-only) on an interval (`PHASE3B_WATCHDOG_POLL_MS`, default 5s) |
| **Timeout guard** | `PHASE3B_WATCHDOG_MAX_RUN_MS` (default 10 minutes) — an independent, earlier backstop below the existing 900s (prod) / 1200s (local) per-batch Playwright `test.describe.configure({ timeout })` |
| **Cleanup on abort** | On the first detected violation (process count or timeout), the watchdog immediately calls `killChromeHeadlessShellProcesses()` (`pkill -f chrome-headless-shell`) — the same command used by hand in attempts 6/7 |
| **Preflight refusal (prod enable-gate)** | `requirePhase3bResourceWatchdogEnabled(isProd)` throws unless `PHASE3B_RESOURCE_WATCHDOG=1` is set, evaluated at module load — before any Playwright test body runs |
| **Pre-run safety check** | `assertResourceSafeToStart()` throws if `chrome-headless-shell` or orphaned playwright/phase3b processes are already running before this attempt starts — the same manual check every attempt doc since attempt 6 has recorded by hand |
| **In-run checkpoints** | `assertNoWatchdogViolation(handle)` is called at the start of every batch and again after each batch's idle period — fails the current test explicitly and visibly, rather than relying on an uncaught exception |

### 2.2 Defense in depth

Two independent layers refuse a prod run without the watchdog enabled:

1. **npm script** (`test:phase3b-controlled-multitab-prod`) — a `node -e` precondition check identical in style to the existing `PLAYWRIGHT_ALLOW_PROD_SMOKE` gate.
2. **Spec module scope** (`requirePhase3bResourceWatchdogEnabled(IS_PROD)`) — runs at import time, before any test executes, so even a direct `playwright test` invocation that bypasses the npm script still refuses to proceed.

---

## 3. What This Does Not Do

- **Does not authorize attempt 10.** Merging this watchdog closes one precondition of [attempt 9's §5 hard precondition list](./gate-e-phase3b-attempt9-result-2026-07-02.md#5-attempt-10--hard-precondition) — attempt 10 **still requires a separate, explicit founder** **"Gate E attempt 10 with watchdog enforcement = YES?"** authorization, obtained independently of this merge.
- **Does not run Playwright, Phase 3B, or any browser.** Every check in this document is either a static source-code assertion or a read-only `pgrep` call against whatever (zero) Phase 3B-related processes exist on the machine at test time.
- **Does not change the application-level concurrency ceiling** proven by the [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) — that remains unchanged and unaffected.
- **Does not touch backend/API/auth/DB/env/`smoke.yml`.**
- **Does not mutate anything in production.**

---

## 4. Verification Performed

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Static guard suite | `npm run test:phase3b-resource-watchdog` | new tests, no browser |
| Phase 3B static inventory unaffected | `npm run test:phase3b-controlled-multitab` | unaffected — docs/inventory guards only |
| Prod script gate unaffected (existing) | `npm run test:gate-e-attempt7-execution-guarantee` | still asserts the `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` gate is present, unchanged |
| `smoke.yml` | grep for `playwright test` / `phase3b-controlled-multitab` | 0 matches — unchanged, browser still disabled by default in CI |

No Playwright browser was launched, no `chrome-headless-shell` process was spawned, and no Phase 3B route was evaluated to produce this document.

---

## 5. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO Playwright run | Confirmed — only static checks and read-only `pgrep` calls against a clean machine |
| NO Phase 3B execution | Confirmed — 0 routes evaluated |
| NO browser/Chrome processes | Confirmed |
| NO backend/API/auth/DB/env/`smoke.yml` changes | Confirmed — diff limited to `frontend/e2e/`, `frontend/scripts/`, `frontend/package.json`, and `docs/` |
| NO prod mutation | Confirmed — no network calls to prod were made |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO attempt 10 authorization or execution | **NOT authorized, NOT run** by this document — attempt 10 still requires a separate, explicit founder decision |

---

## Explicit Non-Claims

- **Attempt 10:** **NOT authorized, NOT run** by this document — merging this watchdog closes a precondition, it is not itself an authorization
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this document adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Default CI browser:** **DISABLED** (`smoke.yml` unchanged)

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · Phase 3B resource watchdog: MERGED, code-enforced, statically verified · Attempt 10: still requires separate founder authorization, NOT AUTHORIZED, NOT RUN**

---

## 6. Addendum (2026-07-03) — Run 28650677999 False-Positive Orphan Detection

**Status:** **STATIC/CI FIX ONLY — NO Phase 3B EXECUTION, NO LOCAL PLAYWRIGHT, NO PROD MUTATION, NO backend/API/auth/DB/env CHANGES.**

**What happened:** Run [`28650677999`](../.github/workflows/gate-e-phase3b-manual.yml) — the first attempt on the isolated GitHub Actions runner (see [`GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md`](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md)) — failed `PRECONDITION_FAILED` at the `prod preflight` test with:

```
Error: phase3b resource watchdog: 10 orphaned playwright/phase3b process(es) already running before start; refusing to start a new Phase 3B run
```

`public-health` (10/10) and the 10-route HTTP smoke both passed read-only. **Zero Phase 3B routes were evaluated** — `assertResourceSafeToStart()` refused to start before any browser was launched, exactly as designed for a *genuine* orphan — except this was not one.

**Root cause:** `countOrphanedPhase3bProcesses()` summed `pgrep -f` matches for `PHASE3B_RUN_RELATED_PROCESS_PATTERNS` (`npm.*phase3b-controlled-multitab`, `node.*phase3b-controlled-multitab`, `playwright.*phase3b`, `test:phase3b-controlled-multitab-prod`, `test:phase3b-controlled-multitab-browser`) against the **entire host process table**, with no notion of "this run's own ancestor chain" vs. "a leftover process from a different run." The canonical npm script chain that invokes this very preflight check is itself several nested, still-running processes at the moment the check executes — `npm run test:phase3b-controlled-multitab-prod` → `npm run test:phase3b-controlled-multitab-browser:raw` → `npx tsx scripts/phase3b-prod-local-guard.ts` → `playwright test e2e/phase3b-controlled-multitab.spec.ts` (plus the Playwright worker process) — and every one of those ancestor command lines legitimately contains a literal npm script name the patterns look for (a single ancestor process's command line matches multiple patterns at once, e.g. both `"npm.*phase3b-controlled-multitab"` and `"test:phase3b-controlled-multitab-prod"`). This is **structurally guaranteed to over-count on the very first, cleanest possible run** — it is not evidence of `npm ci`/`npx playwright install` leaving anything behind (those are separate, already-completed steps by the time this check runs); it is the check counting **its own still-running ancestors** as if they belonged to someone else's leftover run.

**Fix (this task):**

| Component | File | Change |
|---|---|---|
| Ancestry helpers | `frontend/e2e/helpers/phase3b-resource-watchdog.ts` | New `getAncestorPids(pid)` (walks the parent chain via `ps -o ppid=`, portable across macOS/Linux) and `getCurrentRunProcessTree(pid)` (self + ancestors + descendants, via the existing `getOwnedProcessTree`) |
| Orphan counting | `frontend/e2e/helpers/phase3b-resource-watchdog.ts` (`countOrphanedPhase3bProcesses`) | Now takes an injectable `env` (defaults to `process.env`). When `GITHUB_ACTIONS==='true'`, excludes any orphan-pattern PID that is provably part of this run's own process tree before counting. **Local Mac behavior (`GITHUB_ACTIONS!=='true'`) is byte-for-byte unchanged** — the exact original strict summed-`pgrep`-count implementation, with no ancestry lookup at all |
| `assertResourceSafeToStart` | same file | Now also accepts an injectable `env`, passed through to `countOrphanedPhase3bProcesses` |
| Workflow defense-in-depth | `.github/workflows/gate-e-phase3b-manual.yml` | New **Pre-run cleanup** step, immediately before the Phase 3B run step: prints before/after `chrome-headless-shell` and orphan-pattern counts, best-effort `pkill`s any genuine leftover (never fails the job if none found, never touches `TWIN_ACCESS_TOKEN`) |
| Tests | `frontend/scripts/phase3b-resource-watchdog.test.ts`, `frontend/scripts/gate-e-isolated-runner-guard.test.ts`, `frontend/scripts/phase3b-local-execution-blocked.test.ts` | New tests reproduce the exact false positive with a synthetic self-descendant process, prove `GITHUB_ACTIONS=true` excludes it while strict local semantics still catch it, prove the pre-run cleanup step exists and never fails, and prove the local hard block is untouched by this fix |

**Only fails now on a genuinely unowned orphan** — a process matching these patterns that is **not** part of this run's own ancestor/descendant tree (e.g. a real leftover from a previous job on a reused host, or an actual runaway). This narrows detection; it never widens what is treated as safe beyond "not part of this run."

**Is an isolated rerun safe now?** **Yes, with the caveat that this fix has only been verified statically (`tsc`, unit tests, `npm run build`) — it has not yet been proven against a live GitHub Actions run.** The recommended next step is a fresh `workflow_dispatch` dispatch (separately founder-authorized, per §6 above) to confirm `assertResourceSafeToStart()` no longer false-positives in the real isolated-runner environment. **This document does not authorize that rerun** — it is a code fix, not a founder "YES."

**This addendum does not authorize any Phase 3B attempt, does not run Playwright, does not touch backend/API/auth/DB/env, and does not change local Mac behavior.**

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING · Run 28650677999: PRECONDITION_FAILED (false positive, root-caused and fixed) · Isolated rerun: safe to attempt once separately founder-authorized, NOT YET RE-VERIFIED LIVE**
