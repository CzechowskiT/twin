# Gate E Phase 3B — Isolated GitHub Actions Runner — 2026-07-03

**Status:** **HARD BLOCK SHIPPED — local Phase 3B execution is now technically impossible, not just discouraged. NO Phase 3B EXECUTION IN THIS TASK, NO LOCAL PLAYWRIGHT/BROWSER, NO PROD MUTATION.**
**Purpose:** Retire the founder Mac as the execution host for Gate E Phase 3B prod attempts and replace it with a manual-only, isolated GitHub Actions runner (`workflow_dispatch`) as the **only** execution path. **This task does not run any Phase 3B attempt.**
**Update (this task):** Attempt 11 happened after this document's original (warning-only) version shipped, confirming a warning was not sufficient — see [attempt 11 result](./gate-e-phase3b-attempt11-result-2026-07-03.md). This task replaces the warning with a hard block (`frontend/scripts/phase3b-prod-local-guard.ts`) that exits before Playwright is ever imported; see [PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md](./PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md) for every path found and blocked.
**This document does not authorize attempt 12 or any future attempt.** Each attempt still requires its own separate, explicit founder authorization, exactly as attempts 7–11 did — and now can only run via the isolated GitHub Actions workflow.
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md) · [split-batch execution plan](./GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md) · [attempt 14 result](./gate-e-phase3b-attempt14-result-2026-07-03.md) · [attempt 12 result](./gate-e-phase3b-attempt12-result-2026-07-03.md) · [attempt 13 result](./gate-e-phase3b-attempt13-result-2026-07-03.md) · [attempt 11 result](./gate-e-phase3b-attempt11-result-2026-07-03.md) · [attempt 10 result](./gate-e-phase3b-attempt10-result-2026-07-03.md) · [local execution disabled](./PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md) · [macOS process detection](./PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md) · [resource watchdog](./PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md) · [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why the Founder Mac Is Retired for Phase 3B

Eleven chronological Gate E Phase 3B prod attempts ran (or tried to run) on the founder's local Mac. Not one of them was stopped by a genuine product defect discovered mid-run:

| Attempt | Classification | Root cause was… |
|---|---|---|
| 1 | `ABORTED_RESOURCE_SAFETY` | Elevated local CPU/WindowServer during static preflight — a **host** condition |
| 6 | `ABORTED_RESOURCE_SAFETY` | Multiple `chrome-headless-shell` instances saturated **local** CPU with elevated `kernel_task` |
| 7 | `PRECONDITION_FAILED` | Prod `public-health` transient 502 (not host-specific, but the founder Mac model requires the operator to notice and re-check by hand) |
| 8 | `PRECONDITION_FAILED` | **Founder's laptop** was on battery power, not AC |
| 9 | `MANUAL_ABORT` | Operator judgment call: no automated watchdog existed yet to bound a **host** run |
| 10 | `USER_ABORTED` | Watchdog reported `chrome-headless-shell=0`, but the operator observed real Chrome/Chromium **process pressure on the same shared machine they use for everything else** |
| 11 | `USER_ABORTED` | Ownership-scoped detection correctly reported `NEEDS_MANUAL_REVIEW` (38 unowned Chrome-family processes belonging to the operator's own daily-driver Chrome) — the detection worked as designed, but the **host** was still shared, still ambiguous, and still not a single-purpose runner |
| 12 (isolated runner, run `28650677999`) | `PRECONDITION_FAILED` | **False positive** — the resource watchdog's orphan-pattern check matched this run's **own** still-running npm/npx/playwright ancestor chain, not a leftover from any other run — fixed in this task, see §5a below |

Every one of attempts 1, 6, 8, 9, and 10 has the same shape: **the founder's Mac is a shared, general-purpose machine** — it runs the founder's own daily-driver browser, other applications, and is sometimes unplugged. None of that is a Phase 3B product signal; all of it is host noise that a shared laptop cannot avoid. Attempt 10 in particular showed that even a code-enforced watchdog cannot fully disambiguate "a Playwright-owned Chrome process" from "the founder's own Chrome tabs" on a machine where both coexist — see [`PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md`](./PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md) §1–§2 for the full mechanism.

**The fix is not another layer of local detection.** It is removing the shared-host ambiguity entirely: run Phase 3B on a **single-purpose, ephemeral runner** that has no daily-driver browser, no other user processes, no battery, and is destroyed after every run. GitHub Actions `workflow_dispatch` runners satisfy all of that by construction.

**From this point forward: the founder Mac must not run Playwright for Gate E Phase 3B.** Any future Phase 3B prod attempt runs via [`.github/workflows/gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml), never `npm run test:phase3b-controlled-multitab-prod` invoked directly on a local machine.

---

## 2. What This Task Shipped

| Component | File | Purpose |
|---|---|---|
| Manual isolated runner workflow | `.github/workflows/gate-e-phase3b-manual.yml` | `workflow_dispatch`-only CI job that runs the canonical Gate E Phase 3B prod command on an ephemeral GitHub-hosted runner |
| Static guard | `frontend/scripts/gate-e-isolated-runner-guard.test.ts` (`npm run test:gate-e-isolated-runner-guard`) | Proves the workflow's trigger, confirmation gate, secret handling, canonical env vars, timeout, artifact upload, and non-claims — without running the workflow or any browser |
| Reporter change (CI-only) | `frontend/playwright.config.ts` | `html` reporter added **only** when `CI` is set, so the isolated runner can upload a Playwright HTML report artifact; local/founder-Mac runs are unaffected (`list` only, unchanged) |
| Hard local-execution block | `frontend/scripts/phase3b-prod-local-guard.ts` (`npm run test:phase3b-controlled-multitab-prod` / `-browser` / `-browser:raw` all chain it first) | Exits `1` with the exact message `"Local Phase 3B execution is disabled. Use the GitHub Actions workflow."` before Playwright is ever imported, unless `GITHUB_ACTIONS==='true'` -- the founder Mac (and every other local machine) can no longer run this harness at all, not even with a warning |
| Spec-level guard (defense in depth) | `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Same hard block at module scope, so a direct `playwright test e2e/phase3b-controlled-multitab.spec.ts` invocation that bypasses the npm script chain is also blocked before any browser/context/page is created |
| Static guards | `frontend/scripts/gate-e-isolated-runner-guard.test.ts` (`npm run test:gate-e-isolated-runner-guard`), `frontend/scripts/phase3b-local-execution-blocked.test.ts` (`npm run test:phase3b-local-execution-blocked`) | Prove the workflow's trigger/confirmation/secret/env/timeout/artifact wiring, and separately prove every local execution path is hard-blocked -- without running the workflow or any browser |
| Reporter change (CI-only) | `frontend/playwright.config.ts` | `html` reporter added only when `CI` is set, so the isolated runner can upload a Playwright HTML report artifact; local/founder-Mac runs are unaffected (`list` only, unchanged) |
| This document | `docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md` | Rationale, flow, secret setup, result interpretation |
| Disabled-path inventory | `docs/PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md` | Every local execution path that existed before this task, and how each is now blocked |

**This task does not run the workflow.** No Phase 3B attempt was executed, locally or in CI, as part of this task. `.github/workflows/gate-e-phase3b-manual.yml` is `workflow_dispatch`-only and was not manually triggered.

---

## 3. Manual GitHub Actions Flow

The workflow is triggered **only** via `workflow_dispatch` (Actions tab → "gate-e-phase3b-manual" → "Run workflow", or `gh workflow run gate-e-phase3b-manual.yml -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes`). It has **no** `push`, `pull_request`, or `schedule` trigger — it can never run automatically.

### 3.1 Required inputs (all three must be exactly `yes`)

| Input | Meaning |
|---|---|
| `confirm_gate_e` | Explicit founder authorization for this specific Gate E Phase 3B prod attempt exists |
| `confirm_prod_smoke` | Operator confirms this is a **read-only** prod smoke run — no prod mutation |
| `confirm_no_launch_go` | Operator confirms this run does **not** constitute Launch GO, Gate D, or P0 closure |

If any input is not exactly `"yes"`, the very first job step fails immediately — **before checkout, before any prod request, before any secret is read.**

### 3.2 Job steps (in order)

1. **Validate confirmation inputs** — hard-stop gate, no checkout yet.
2. **Checkout** the repository.
3. **Setup Node 20** + `npm ci` in `frontend/`.
4. **Install Playwright chromium** (`npx playwright install --with-deps chromium`) — isolated to this ephemeral runner only.
5. **Static preflight guards** — `tsc --noEmit`, `test:phase3b-resource-watchdog`, `test:phase3b-controlled-multitab`, `test:gate-e-isolated-runner-guard` — all static, no browser, no prod request.
6. **Verify `workers=1` / `retries=0`** are still literally present in `playwright.config.ts` / `phase3b-controlled-multitab.spec.ts` — a source-level assertion, not an override; this workflow never raises concurrency.
7. **Prod `public-health` — 10× poll** (read-only `curl`), every attempt must be `HTTP 200`, `status=ok`, `db_ok=true`.
8. **HTTP smoke — 10 routes** (read-only `curl`), every route must be `HTTP 200`: `/`, `/for-candidates`, `/for-recruiters`, `/for-companies`, `/for-investors`, `/investor`, `/investor/product-proof`, `/demo`, `/how-it-works`, `/faq`.
9. **Gate E Phase 3B prod (canonical command)** — runs `npm run test:phase3b-controlled-multitab-prod` with:
   ```
   PHASE3B_RESOURCE_WATCHDOG=1 PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
     PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app
   ```
   `TWIN_ACCESS_TOKEN` is injected from `secrets.TWIN_ACCESS_TOKEN` via `env:` — never printed; only a boolean presence check (`present: true/false`) is echoed.
10. **Cleanup** — best-effort `pkill` of any leftover `chrome-headless-shell`/phase3b process (defense in depth; the runner is destroyed regardless).
11. **Upload artifacts** — `frontend/.diagnostics/**` (route-level JSON + ownership snapshot), `frontend/playwright-report/**` (HTML report), `frontend/test-results/**`.
12. **Job summary** — writes the explicit non-claims (no Launch GO, no P0 closure, no Gate D, no Gate F YES, no deploy) to the GitHub Actions run summary, every time, pass or fail.

**Job timeout: 60 minutes.** **Concurrency group:** only one `gate-e-phase3b-manual` run at a time — a second dispatch queues rather than racing the first against prod.

**This workflow never deploys anything, never runs Gate D, and never claims Launch GO.** Those are separate, human-authored decisions recorded in separate docs, never emitted by CI.

---

## 4. Required Secrets Setup

| Secret | Where | Notes |
|---|---|---|
| `TWIN_ACCESS_TOKEN` | Repository (or Environment) secret named exactly `TWIN_ACCESS_TOKEN` under **Settings → Secrets and variables → Actions** | Same token used by the founder-Mac `.env.local` flow (see [`CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md`](./CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md)); GitHub automatically redacts any exact match to a registered secret value from all workflow logs. The workflow only ever reads it via `env: TWIN_ACCESS_TOKEN: ${{ secrets.TWIN_ACCESS_TOKEN }}` and echoes a boolean presence check — the value itself is never printed, logged, or written to an artifact. |

No other secrets are required. The workflow makes no writes to prod, so no additional prod credentials are needed beyond the token Phase 3B already uses to authenticate read-only route checks.

**If `TWIN_ACCESS_TOKEN` is not configured:** the Phase 3B run proceeds (the harness's own `AUTH_TOKEN_REQUIRED` classification handles a missing/invalid token at the route level, per existing behavior), it does not crash the workflow.

---

## 5. Result Interpretation

This workflow **produces evidence**; it does not itself produce a founder decision, a gate status change, or a launch-stance change. After a run completes:

1. Download the `gate-e-phase3b-evidence-<run_id>` artifact (`.diagnostics/*.json`, `playwright-report/`, `test-results/`).
2. Read the per-route `PASS`/`PARTIAL`/`WARN`/`FAIL` classifications from `.diagnostics/phase3b-controlled-multitab-*.json`, exactly as prior local attempts did.
3. Read `.diagnostics/phase3b-process-ownership-final.json` for the ownership snapshot (owned vs. `NEEDS_MANUAL_REVIEW` processes) — on an isolated single-purpose runner this should show `NO_MATCHING_PROCESSES` or fully `OWNED`, since there is no daily-driver Chrome to create ambiguity.
4. Write a new, separate `docs/gate-e-phase3b-attempt11-result-<date>.md` (following the exact template/discipline of attempts 1–10) documenting the outcome — **as its own task**, with its own review, never auto-generated by the workflow itself.
5. **A green CI job (workflow succeeded) is not itself a Phase 3B PASS.** "Succeeded" means the job didn't crash/timeout; the actual per-route evidence inside the uploaded artifact is what determines PASS/FAIL/PARTIAL, exactly as it always has.
6. **A red CI job (workflow failed)** could mean a precondition failed (public-health, HTTP smoke), a route-level test failure, or a timeout — the job logs and artifact (if any was produced before failure) disambiguate which.

**Launch stance, P0, and Gate F are never updated by this workflow.** They are updated only by a subsequent, human-authored result document, exactly as every prior attempt's result was recorded.

---

## 5a. Run 28650677999 (2026-07-03) — First Isolated Runner Attempt — False-Positive Orphan Detection

The first real dispatch of this workflow, run [`28650677999`](https://github.com), failed `PRECONDITION_FAILED` at the `prod preflight` test:

```
Error: phase3b resource watchdog: 10 orphaned playwright/phase3b process(es) already running before start; refusing to start a new Phase 3B run
```

`public-health` (10/10) and the 10-route HTTP smoke both passed read-only, before the failure. **0/20 routes were evaluated.** This was a **false positive**, not a real leftover process: the resource watchdog's orphan-pattern check (`countOrphanedPhase3bProcesses()`) matched this very run's own still-running npm/npx/playwright ancestor chain — see [`PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md` §6](./PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md#6-addendum-2026-07-03--run-28650677999-false-positive-orphan-detection) for the full root-cause analysis and fix.

**Fixed (this task):** the watchdog now excludes this run's own process ancestry (`getCurrentRunProcessTree`) from orphan counting when `GITHUB_ACTIONS==='true'`; local Mac behavior is unchanged. The workflow also gained a best-effort **Pre-run cleanup** step immediately before the Phase 3B run step, as defense-in-depth against a genuine leftover from `npm ci`/`npx playwright install` on a reused host.

**This fix is code-only.** It has been verified statically (`tsc`, unit tests, `npm run build`) but **not yet re-verified against a live GitHub Actions dispatch.** A subsequent isolated-runner attempt is expected to confirm the fix in practice — that attempt still requires its own separate, explicit founder authorization and is **not triggered by this task.**

---

## 5b. Cancellation-Hardening (this task, 2026-07-03) — Surviving a Silent GitHub Actions Cancellation

Attempt 12 dispatch 2 (run `28652257796`) passed every scripted precondition and the Phase 3B "prod preflight" sub-test, then went silent for ~4m21s before the job was **cancelled at the GitHub Actions infrastructure level** — see [attempt 12 result](./gate-e-phase3b-attempt12-result-2026-07-03.md) §3. The per-step job API showed every subsequent step, **including "Upload diagnostics" itself**, marked `skipped` — a job-level cancellation skips every remaining step regardless of its `if: always()` condition. This is a documented GitHub Actions limitation, not a bug in this workflow: **no `if: always()` step can be guaranteed to run after a hard external cancellation.**

Given that constraint, this task hardened observability at the two layers that *do* survive a hard cancellation — the live log stream (captured by GitHub Actions as the job runs, not after it finishes) and best-effort disk persistence (useful whenever the cancellation is graceful enough, or a future failure is a real timeout/error rather than a hard external cancel, for `if: always()` steps to still run):

1. **`[gate-e-heartbeat]` log lines** at every required checkpoint — before the canonical command (workflow step), immediately after the "prod preflight" sub-test passes (spec), immediately before and after every route batch (spec), every 30 seconds during each batch's 60–90s idle wait (spec), during the canonical command step itself via a background shell loop (workflow), and at final cleanup (both the spec's `afterAll` and the workflow's `Cleanup` step).
2. **`frontend/.diagnostics/gate-e-attempt-status.json`** — a best-effort, read-merge-write JSON snapshot (`frontend/e2e/helpers/gate-e-attempt-status.ts`, invoked directly from the Playwright spec and via a thin CLI wrapper `frontend/scripts/gate-e-attempt-status-write.ts` from the workflow's bash steps) written after every stage: `workflow-start`, `public-health-complete`, `http-smoke-complete`, `pre-run-cleanup-complete`, `before-canonical`, `preflight-complete`, `batch-start`/`batch-complete` (per batch, with cumulative route counts and per-route classifications), `canonical-complete`, `workflow-cleanup`, `final-cleanup`.
3. **Explicit step-level timeout** on the canonical command step (`timeout-minutes: 40`, strictly under the existing 60-minute job timeout) — a genuine harness hang now surfaces as that step's own conclusion instead of being indistinguishable from an external cancellation. The job timeout (60 min), the per-batch Playwright timeout (`test.describe.configure({ timeout: … })`, unchanged), and the per-route navigation timeout (`ROUTE_GOTO_MS = 30_000`, unchanged) were all already explicit and are unaffected.
4. **Artifact upload** — unchanged in trigger (`if: always()`, already existed), now explicitly lists `frontend/.diagnostics/gate-e-attempt-status.json` in its upload path.

**What this does and does not fix:** it does **not** make artifact upload succeed after a hard cancellation — no GitHub Actions workflow can guarantee that. It **does** mean a cancelled run's live log (`gh run view --log`) now shows exactly which stage was reached and when, even when zero artifacts are produced, closing the "almost no forensic trail" gap attempt 12 exposed. It changes **no Phase 3B pass/fail logic**, does **not** weaken the resource watchdog (`frontend/e2e/helpers/phase3b-resource-watchdog.ts` is unchanged), touches **no backend/API/auth/DB/env code**, and **does not authorize or dispatch attempt 13** — every attempt still requires its own separate, explicit founder authorization exactly as before.

Verified statically only (`tsc`, `npm run test:gate-e-isolated-runner-guard`, `npm run test:gate-e-isolated-runner-cancel-safety`, `npm run test:phase3b-resource-watchdog`, `npm run build`) — this task did not dispatch the workflow.

---

## 5c. Split-Batch Execution (this task, 2026-07-03) — Splitting the Single Long-Lived Job Into 3 Sequential Batch Jobs

Both isolated-runner attempts so far ended inside the single, long-lived `gate-e-phase3b-prod` job — attempt 12 dispatch 2 (`RUNNER_CANCELLED`) after ~4m21s, attempt 13 (`RUNNER_LOST_COMMUNICATION`) after ~46m43s — before any route-level evidence was confirmed. The cancellation hardening in §5b maximizes forensic trail from a single job, but does not shorten the window that job is exposed to an infrastructure-level ending.

This task splits `gate-e-phase3b-prod` into a `matrix: batch: [public-candidate, recruiter, company]` strategy (`fail-fast: false`, `max-parallel: 1` — strictly sequential, never more than one batch in flight, preserving the existing single-attempt discipline), so each batch job's canonical-command step only has to survive one ~7-route batch instead of all 20 routes continuously. A new `gate-e-phase3b-aggregate` job (`needs: gate-e-phase3b-prod`, `if: always()`) then merges whatever per-batch evidence each of the 3 batch jobs produced into one combined summary, without drawing any new pass/fail conclusion of its own — a batch that produced no artifact (e.g. lost to a hard infrastructure ending before its own upload step) is reported `MISSING`, not treated as an aggregation failure.

**Full detail, rationale, job-flow diagram, and result-interpretation addendum:** see [`GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md`](./GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md).

Verified statically only (`tsc`, `npm run test:gate-e-isolated-runner-guard` (extended), `npm run test:gate-e-phase3b-split-batch` (new), `npm run test:phase3b-controlled-multitab`, `npm run test:phase3b-local-execution-blocked`, `npm run build`) — this task did not dispatch the workflow and does not authorize attempt 14.

---

## 5d. Route-Level Sharding (this task, 2026-07-06) — Sharding One Level Finer Than Batches

Attempt 14 (run `28771385932`) was the first live dispatch of the §5c split-batch shape — all 3 batch matrix jobs passed every precondition and the canonical command's own "prod preflight" sub-test, then **all 3** were independently killed by a GitHub-provided `RUNNER_SHUTDOWN_SIGNAL` (exit 143) with **0/20 routes confirmed**, and no correlation between batch size/duration and the failure (the smallest batch survived ~8-10x longer than the other two before the identical signal). This showed that splitting into 3 batches was not fine-grained enough: a runner-level termination that can strike at any point still cost an entire 6-7-route batch's worth of evidence each time.

This task shards one level finer: `gate-e-phase3b-prod` becomes a **20-entry route matrix** (`matrix: include: [{route, slug}, ...]`, `fail-fast: false`, `max-parallel: 1` — strictly sequential, one route per job), so a single runner-level termination can now cost at most 1 of 20 routes' evidence instead of 6-7. The `gate-e-phase3b-aggregate` job (`needs: gate-e-phase3b-prod`, `if: always()`) is rewritten to merge per-route (not per-batch) evidence into a 20-row summary table, with the same "draws no new pass/fail verdict, missing routes reported as MISSING" discipline as the batch aggregator it supersedes.

**Full detail, rationale, job-flow diagram, and result-interpretation addendum:** see [`GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md`](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md).

Verified statically only (`tsc`, `npm run test:gate-e-isolated-runner-guard` (extended), `npm run test:gate-e-phase3b-route-sharding` (new), `npm run test:gate-e-phase3b-split-batch` (superseded workflow-shape assertions updated), `npm run test:phase3b-controlled-multitab`, `npm run test:phase3b-local-execution-blocked`, `npm run build`) — this task did not dispatch the workflow and does not authorize attempt 15.

---

## 6. Attempt 11+ — Isolated Runner Only

**Attempt 11 remains BLOCKED** per [attempt 10's §5 hard precondition](./gate-e-phase3b-attempt10-result-2026-07-03.md#5-attempt-11--hard-precondition) — the macOS process-detection hardening being merged does not by itself authorize attempt 11, and neither does this isolated-runner workflow. Both are now true:

1. The ownership-scoped macOS process-detection hardening is merged (closed by [`PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md`](./PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md)).
2. This isolated runner now exists, so **if/when attempt 11 is authorized, it runs here — never on the founder Mac again.**

**A separate, explicit founder "Gate E attempt 11 via isolated runner = YES?" authorization is still required before attempt 11 is dispatched.** This document does not provide that authorization. **If an attempt-11 subagent or task is already running locally at the time this document lands, it must not be started from here — this task is design-only and does not trigger any run.**

---

## 7. What This Does Not Do

- **Does not run Phase 3B, Playwright, or any browser** as part of this task. The workflow is `workflow_dispatch`-only and was not triggered.
- **Does not authorize attempt 11** or any future attempt — every attempt still requires its own separate founder "YES."
- **Does not deploy anything** — no Vercel/Railway deploy step exists in this workflow.
- **Does not run Gate D** or claim Gate D status.
- **Does not claim Launch GO, P0 closure, or Gate F YES** — the workflow's own job summary explicitly disclaims all three on every run.
- **Does not touch backend/API/auth/DB/env code** — this task's diff is limited to `.github/workflows/`, `frontend/playwright.config.ts` (CI-only reporter addition), `frontend/scripts/`, `frontend/package.json` (script comment/warning only), and `docs/`.
- **Does not mutate production** — every prod-facing step in the workflow (`public-health` poll, HTTP smoke, Phase 3B route checks) is read-only.
- **Does not change the application-level concurrency ceiling** — `workers=1`, `retries=0` remain exactly as proven by the [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md); the workflow only verifies this at the source level, never overrides it.

---

## 8. Verification Performed (this task)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Isolated runner guard | `npm run test:gate-e-isolated-runner-guard` | new static guard, no browser |
| Resource watchdog (unaffected) | `npm run test:phase3b-resource-watchdog` | unchanged behavior, still PASS |
| Phase 3B static inventory (unaffected) | `npm run test:phase3b-controlled-multitab` | unchanged behavior, still PASS |
| Frontend build | `npm run build` | succeeds |
| `smoke.yml` unchanged | grep for `playwright test` / `phase3b-controlled-multitab` | 0 matches — unchanged |
| No Phase 3B execution this task | — | Confirmed — `workflow_dispatch` never triggered; no local Playwright invocation |

No Playwright browser was launched by this task, no `chrome-headless-shell` or Chrome-family process was spawned, no prod request beyond what CI would make on a future dispatch (none made in this task), and no Phase 3B route was evaluated.

---

## 9. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO Phase 3B execution (local or CI) this session | Confirmed — workflow is `workflow_dispatch`-only, never triggered |
| NO local Playwright/browser | Confirmed — only static `tsc`/`tsx` checks and `npm run build` were run |
| NO prod mutation | Confirmed — no network requests made to prod in this task |
| NO backend/API/auth/DB code changes | Confirmed — diff limited to `.github/workflows/`, `frontend/playwright.config.ts` (CI-only reporter), `frontend/scripts/`, `frontend/package.json`, `docs/` |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO Gate D | Not run, not claimed |
| Never print/log/commit `TWIN_ACCESS_TOKEN` value | Confirmed — workflow only echoes a boolean presence check; secret sourced via `env:`/`secrets.` context |
| NO attempt 11 execution or authorization | Confirmed — this document explicitly does not authorize or trigger attempt 11 |
| Minimal docs | Confirmed — this document, the workflow, one static guard, one evidence-index cross-reference, one package.json warning |

---

## Explicit Non-Claims

- **Attempt 11:** **NOT authorized, NOT run** by this document or its workflow
- **Isolated runner:** **SHIPPED** (`workflow_dispatch`-only, statically verified) — **NOT TRIGGERED** in this task
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this task adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Founder Mac:** retired as a Phase 3B execution host going forward — future attempts run via the isolated GitHub Actions runner only

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · Isolated Gate E Phase 3B runner: SHIPPED, workflow_dispatch-only, NOT TRIGGERED · Attempt 11: still requires a separate, explicit founder authorization, NOT AUTHORIZED, NOT RUN**
