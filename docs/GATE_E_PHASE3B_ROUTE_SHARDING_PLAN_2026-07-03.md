# Gate E Phase 3B — Route-Level Sharding — 2026-07-06

**Status:** **SHIPPED, STATIC-ONLY — NOT DISPATCHED. NO ATTEMPT 15 IN THIS TASK, NO LOCAL PLAYWRIGHT, NO PROD/BACKEND/API/AUTH/DB/ENV CHANGES.**
**Purpose:** Shard the Gate E Phase 3B prod job in [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) one level finer than the split-batch shape it replaces: **20 route-level matrix jobs** (one per route, `fail-fast: false`, `max-parallel: 1`) instead of 3 batch-level matrix jobs (`public-candidate` = 7 routes, `recruiter` = 7 routes, `company` = 6 routes), plus a best-effort aggregation job. **This task does not run any Phase 3B attempt — attempt 15 is not dispatched, authorized, or triggered by this document.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [attempt 14 result](./gate-e-phase3b-attempt14-result-2026-07-03.md) · [split-batch execution plan](./GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md) · [isolated runner plan](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why Shard By Route Instead Of By Batch

Attempt 14 (2026-07-06, run `28771385932`) was the first live dispatch of the split-batch shape: 3 independent, ephemeral isolated-runner matrix jobs, one per route batch. All 3 passed every scripted precondition — including the canonical command's own `prod preflight` sub-test — and then **every one of the 3 batches** was independently killed by a GitHub-provided **`RUNNER_SHUTDOWN_SIGNAL`** annotation (exit code 143), with **0/20 routes confirmed**:

| Batch | Routes | Canonical-command runtime before shutdown | Ending |
|---|---|---|---|
| `public-candidate` | 7 | ~3m18s | `RUNNER_SHUTDOWN_SIGNAL`, exit 143 |
| `recruiter` | 7 | ~2m22s | `RUNNER_SHUTDOWN_SIGNAL`, exit 143 |
| `company` | 6 (fewest) | ~24m38s (longest) | `RUNNER_SHUTDOWN_SIGNAL`, exit 143 |

Critically, attempt 14's own root-cause investigation found **no consistent correlation** between batch size/duration and the failure: the smallest batch (`company`, 6 routes) survived roughly 8–10x longer than the other two before the identical shutdown signal landed. Public reports (`actions/runner#3724`) most commonly attribute this exact GitHub-provided message to a **hosted-runner VM out-of-memory kill or host-level reclamation** — a transient, host-level event, not something this task's workflow-YAML configuration can directly prevent.

Given that a runner-level termination can strike at any point, independent of what the harness is doing, **the only lever this task can pull is minimizing how much evidence any single termination costs.** Sharding one level finer — one route per isolated-runner job instead of 6-7 — means:

- A single `RUNNER_SHUTDOWN_SIGNAL` (or any other infrastructure-level ending) now costs **at most 1 of 20 routes' evidence**, not 6-7 of 20.
- Each job's canonical-command step has a dramatically shorter window to be exposed to a transient host-level event: a single route's stagger/idle/CDP-capture window is on the order of ~1-2 minutes (see `PHASE3B_IDLE_MS_MIN`/`PHASE3B_IDLE_MS_MAX` in `phase3b-controlled-routes.ts`), versus a 6-7-route batch's multi-minute-to-tens-of-minutes window.
- `fail-fast: false` means a killed route job does **not** cancel the remaining 19 — unlike the prior single-job shape (pre-split-batch) and even the 3-batch shape, one bad route no longer discards a large fraction of the run's evidence.
- Each route job uploads its **own** artifact (`if: always()`), so a run that loses, say, 3 of 20 route jobs to infrastructure events still has 17 routes' worth of confirmed evidence — a materially better outcome than losing an entire 6-7-route batch to the same class of event.
- `max-parallel: 1` preserves the existing single-attempt-in-flight discipline (`workers=1`/`retries=0` inside each route job, and across all 20 route jobs) — this is not a concurrency increase, only a finer sequencing split of what was already a sequential, single-attempt-at-a-time run.

**This is purely a CI job-topology change**, one level finer than the split-batch change that preceded it. It does not add, remove, or reclassify a single Phase 3B route; it does not change `workers=1`/`retries=0`; it does not touch the harness's PASS/PARTIAL/WARN/FAIL classification logic. **There is no monolithic single job left in this workflow** — the 3-way batch matrix is fully superseded by the 20-way route matrix (the underlying `PHASE3B_BATCH`/`selectPhase3bRouteBatches` code and batch-scoped npm scripts remain in the codebase for historical reference and are still functionally correct, but the live workflow no longer uses them).

---

## 2. What This Task Shipped

| Component | File | Purpose |
|---|---|---|
| Route selector | `frontend/e2e/helpers/phase3b-controlled-routes.ts` (`selectPhase3bRoute`, `slugifyPhase3bRoute`, `PHASE3B_ROUTE_ENTRIES`, `PHASE3B_ROUTE_SLUGS`, `isPhase3bRoute`) | Filters to exactly one route when `PHASE3B_ROUTE` is set to one of the 20 `PHASE3B_ALL_ROUTES` entries; returns `null` (batch/full-run mode) when unset; throws on an unknown value or if both `PHASE3B_ROUTE` and `PHASE3B_BATCH` are set |
| Spec wiring | `frontend/e2e/phase3b-controlled-multitab.spec.ts` | When `PHASE3B_ROUTE` is set, builds a single one-route pseudo-batch (`{ label: slugifyPhase3bRoute(route), routes: [route] }`) and reuses the **exact same** batch-loop, heartbeat, and status-persistence code paths as the split-batch shape — no route-mode-specific branching inside the loop body |
| Generic per-route npm script | `frontend/package.json` (`test:phase3b-controlled-multitab-prod:route`) | A plain delegate to `test:phase3b-controlled-multitab-prod` — the route itself comes from the `PHASE3B_ROUTE` env var set by the matrix job, not baked into the script name (unlike the 3 batch-specific scripts) — so the existing local hard-block guard (`phase3b-prod-local-guard.ts`, `GITHUB_ACTIONS` gate) still runs **first**, unchanged |
| Route-sharded matrix workflow | `.github/workflows/gate-e-phase3b-manual.yml` (`gate-e-phase3b-prod`) | `strategy: fail-fast: false, max-parallel: 1, matrix: include: [...]` — 20 `{ route, slug }` pairs (one per `PHASE3B_ALL_ROUTES` entry) instead of the 3-way `batch: [...]` list; `PHASE3B_ROUTE: ${{ matrix.route }}` at job `env:` level; canonical step calls `npm run test:phase3b-controlled-multitab-prod:route`; artifact name is `gate-e-phase3b-evidence-${{ matrix.slug }}-${{ github.run_id }}` (slug, not the raw route, since artifact/job names cannot safely contain `/`); job timeout reduced to 20 minutes (from 60) and canonical-command step timeout reduced to 10 minutes (from 40), since a single route's own runtime is a small fraction of a 6-7-route batch's |
| Aggregation job (rewritten) | `.github/workflows/gate-e-phase3b-manual.yml` (`gate-e-phase3b-aggregate`) | `needs: gate-e-phase3b-prod`, `if: always()` — downloads every route's evidence artifact, merges available `gate-e-attempt-status-<slug>.json` / `phase3b-controlled-multitab-<slug>.json` files into one `gate-e-phase3b-route-aggregate.json` + a 20-row job-summary table (one row per route), uploads its own `gate-e-phase3b-evidence-aggregate-<run_id>` artifact, and writes the same explicit non-claims footer as every other job in this workflow. **Draws no new pass/fail verdict of its own** — a missing route artifact is recorded as `MISSING`, never treated as a failure of the aggregation step itself. The embedded Python `ROUTES` list is kept in sync with `PHASE3B_ROUTE_ENTRIES` by a dedicated static guard (see below) |
| Static tests | `frontend/scripts/gate-e-phase3b-route-sharding.test.ts` (`npm run test:gate-e-phase3b-route-sharding`) | Proves the route selector, npm script, 20-entry matrix + slug/route drift-freedom, aggregation workflow wiring, and doc cross-references — without running Playwright or dispatching the workflow |
| Extended guard | `frontend/scripts/gate-e-isolated-runner-guard.test.ts` | New assertions (tests 33-40) proving the batch matrix has been **replaced**, not merely supplemented, by the 20-entry route matrix |
| Superseded assertions updated | `frontend/scripts/gate-e-phase3b-split-batch.test.ts` (tests 14-16), `frontend/scripts/gate-e-isolated-runner-cancel-safety.test.ts` (test 17) | Updated to assert the live workflow has moved off the 3-way batch-matrix shape and off the 45-60min job-timeout bound (both superseded by route-level sharding); the underlying `PHASE3B_BATCH` selection-function tests (1-13) are unaffected and still pass |
| This document | `docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md` | Rationale, flow, result interpretation for the route-sharded shape |

**This task does not dispatch the workflow.** No `workflow_dispatch` was triggered, no Phase 3B route was evaluated, and no Playwright browser was launched, locally or in CI, as part of this task.

---

## 3. Job Flow (Route-Sharded Shape)

```
gate-e-phase3b-prod (matrix: 20 routes, one { route, slug } pair each, max-parallel: 1, sequential)
  ├─ route job "root" (/):                same 12-step flow as before (validate → checkout →
  │    setup → npm ci → install chromium → static preflight → workers/retries check →
  │    public-health poll → HTTP smoke → canonical command (this route only) → cleanup →
  │    upload gate-e-phase3b-evidence-root-<run_id> → non-claims summary)
  ├─ route job "demo" (/demo):            identical flow, runs only after "root" finishes
  │    (pass, fail, or infra-ending — fail-fast: false)
  ├─ ... 16 more route jobs, one per remaining PHASE3B_ALL_ROUTES entry ...
  └─ route job "company-roles-demo-role-001-pipeline" (/company/roles/demo-role-001/pipeline):
       identical flow, runs last
       │
       ▼ (needs: gate-e-phase3b-prod, if: always() — waits for all 20 matrix instances)
gate-e-phase3b-aggregate
  ├─ download every gate-e-phase3b-evidence-*-<run_id> artifact (continue-on-error, since
  │    a route job that never reached its own upload step produces no artifact to download)
  ├─ merge per-route gate-e-attempt-status-<slug>.json + phase3b-controlled-multitab-
  │    <slug>.json into gate-e-phase3b-route-aggregate.json + a 20-row job-summary table
  ├─ upload gate-e-phase3b-evidence-aggregate-<run_id>
  └─ non-claims summary (identical footer to every other job in this workflow)
```

Every job step that existed in the split-batch shape (hard-ban confirmation validation, checkout, static preflight guards, `workers=1`/`retries=0` source verification, public-health poll, HTTP smoke, cleanup, artifact upload, non-claims summary) is preserved **per route job**, unchanged in content — only the canonical-command step, the artifact name, and the job/step timeouts are route-scoped and re-bounded for the much shorter single-route runtime.

---

## 4. Result Interpretation (Route-Sharding Addendum)

This section extends [isolated runner plan §5](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md#5-result-interpretation) and [split-batch plan §4](./GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md#4-result-interpretation-split-batch-addendum); everything there still applies per route job.

1. Each route job uploads its own `gate-e-phase3b-evidence-<slug>-<run_id>` artifact — download all 20 (plus the `gate-e-phase3b-evidence-aggregate-<run_id>` artifact for the merged view) to assess the full run.
2. **A route job succeeding is not itself a route PASS** — exactly as before, the single `PASS`/`PARTIAL`/`WARN`/`FAIL` classification inside that route's `.diagnostics/phase3b-controlled-multitab-<slug>.json` is what determines the route's actual outcome.
3. **A route job failing, being cancelled, or hitting a runner shutdown signal does not fail the other 19 routes** — `fail-fast: false` guarantees they still run (or have already run) and still upload their own evidence independently.
4. The aggregation job's `gate-e-phase3b-route-aggregate.json` and 20-row job-summary table are a **convenience merge only** — they report `artifactFound: true/false` and, when available, the route's last recorded `stage` and single-route status, but they draw no new conclusion beyond what each route's own artifact already states. A route reported `MISSING` in the aggregate means that route's evidence must be assessed as inconclusive for that route specifically — it does not imply anything about the other 19 routes.
5. **A partial run (e.g. 14/20 routes confirmed, 6 lost to infrastructure events) is meaningfully more useful evidence than the split-batch shape's all-or-nothing-per-batch outcome** — this is the entire point of sharding finer. 14/20 confirmed routes is real, partial evidence; 0/20 (attempt 14's actual outcome) is not.
6. Writing a founder-facing result document (e.g. `docs/gate-e-phase3b-attempt15-result-<date>.md`) after a real dispatch remains a **separate, human-reviewed task**, exactly as attempts 1–14 were — never auto-generated by either the route jobs or the aggregation job.

---

## 5. What This Does Not Do

- **Does not dispatch the workflow or run any Phase 3B route.** `workflow_dispatch` was not triggered as part of this task.
- **Does not authorize attempt 15** or any future attempt — every attempt still requires its own separate, explicit founder "YES," exactly as attempts 7–14 did.
- **Does not run local Playwright.** All verification in this task was static (`tsc --noEmit`, `node:test`-based guard scripts, `npm run build`); the local hard-block guard (`phase3b-prod-local-guard.ts`) is unchanged and still gates the per-route npm script on `GITHUB_ACTIONS==='true'`.
- **Does not touch backend/API/auth/DB/env code.** This task's diff is limited to `.github/workflows/gate-e-phase3b-manual.yml`, `frontend/e2e/helpers/phase3b-controlled-routes.ts`, `frontend/e2e/phase3b-controlled-multitab.spec.ts`, `frontend/package.json`, `frontend/scripts/gate-e-phase3b-route-sharding.test.ts`, `frontend/scripts/gate-e-isolated-runner-guard.test.ts`, `frontend/scripts/gate-e-phase3b-split-batch.test.ts`, `frontend/scripts/gate-e-isolated-runner-cancel-safety.test.ts`, and `docs/`.
- **Does not delete the batch-level (`PHASE3B_BATCH`) code path.** `selectPhase3bRouteBatches`, `PHASE3B_ROUTE_BATCHES`, `PHASE3B_BATCH_LABELS`, and the 3 batch-specific npm scripts (`test:phase3b-controlled-multitab-prod:public-candidate`/`-recruiter`/`-company`) all remain in the codebase, unchanged and still functionally correct — only the **live workflow's** matrix strategy has moved off them, in favor of the 20-route matrix.
- **Does not mutate production.** Every prod-facing step (`public-health` poll, HTTP smoke, Phase 3B route checks) inside each route job is read-only, unchanged from the pre-sharding workflow.
- **Does not change the application-level concurrency ceiling.** `workers=1`, `retries=0` remain exactly as proven by the [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md), verified per route job by the unchanged `Verify workers=1 / retries=0` step; `max-parallel: 1` at the matrix level only sequences the 20 route jobs, it does not raise Playwright's own worker count.
- **Does not deploy anything, run Gate D, or claim Launch GO, P0 closure, or Gate F YES** — both the per-route and the aggregation job summaries carry the identical explicit non-claims footer used by every other job in this workflow.

---

## 6. Verification Performed (this task)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Resource watchdog (unaffected) | `npm run test:phase3b-resource-watchdog` | unchanged behavior, still PASS |
| Phase 3B static inventory (unaffected) | `npm run test:phase3b-controlled-multitab` | unchanged behavior, still PASS |
| Isolated runner guard (extended) | `npm run test:gate-e-isolated-runner-guard` | PASS, including new route-matrix assertions (tests 33-40) |
| Isolated runner cancel-safety (timeout bound updated) | `npm run test:gate-e-isolated-runner-cancel-safety` | PASS |
| Split-batch static guard (superseded assertions updated) | `npm run test:gate-e-phase3b-split-batch` | PASS — batch selection-function tests (1-13) still pass unchanged; workflow-shape tests (14-16) now assert the batch matrix has been replaced |
| Route-sharding static guard (new) | `npm run test:gate-e-phase3b-route-sharding` | PASS |
| Local execution hard block (unaffected) | `npm run test:phase3b-local-execution-blocked` | unchanged behavior, still PASS |
| Frontend build | `npm run build` | succeeds |
| No Phase 3B execution this task | — | Confirmed — `workflow_dispatch` never triggered; no local Playwright invocation |

No Playwright browser was launched by this task, no `chrome-headless-shell` or Chrome-family process was spawned, no prod request was made, and no Phase 3B route was evaluated.

---

## 7. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO attempt 15 dispatch, authorization, or execution | Confirmed — this document explicitly does not authorize or trigger attempt 15 |
| NO local Playwright/browser | Confirmed — only static `tsc`/`tsx`/`node:test` checks and `npm run build` were run |
| NO prod mutation | Confirmed — no network requests made to prod in this task |
| NO backend/API/auth/DB/env code changes | Confirmed — diff limited to the workflow, `frontend/e2e/`, `frontend/scripts/`, `frontend/package.json`, and `docs/` |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO Gate D | Not run, not claimed |

---

## Explicit Non-Claims

- **Attempt 15:** **NOT authorized, NOT run** by this document or its workflow
- **Route-level sharding shape:** **SHIPPED, STATICALLY VERIFIED** — **NOT DISPATCHED** in this task
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this task adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · Route-level sharding isolated runner: SHIPPED, statically verified, NOT DISPATCHED · Attempt 15: still requires a separate, explicit founder authorization, NOT AUTHORIZED, NOT RUN**
