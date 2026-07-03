# Gate E Phase 3B — Split-Batch Isolated Runner Execution — 2026-07-03

**Status:** **SHIPPED, STATIC-ONLY — NOT DISPATCHED. NO ATTEMPT 14 IN THIS TASK, NO LOCAL PLAYWRIGHT, NO PROD/BACKEND/API/AUTH/DB/ENV CHANGES.**
**Purpose:** Split the single, long-lived Gate E Phase 3B prod job in [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) into 3 smaller, sequential, per-route-batch jobs (`public-candidate`, `recruiter`, `company`) plus a best-effort aggregation job, so a single long-running canonical command is no longer the shape that produced attempt 12's `RUNNER_CANCELLED` and attempt 13's `RUNNER_LOST_COMMUNICATION` results. **This task does not run any Phase 3B attempt — attempt 14 is not dispatched, authorized, or triggered by this document.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [isolated runner plan](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md) · [attempt 12 result](./gate-e-phase3b-attempt12-result-2026-07-03.md) · [attempt 13 result](./gate-e-phase3b-attempt13-result-2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why Split Into Batches

Both isolated-runner attempts so far passed every precondition (public-health 10/10, HTTP smoke 10/10, static guards, orphan check clean) and then ended before producing route-level evidence, inside a single job running the full 20-route canonical command end to end:

| Attempt | Ending | Canonical command runtime before ending |
|---|---|---|
| 12 (dispatch 2, run `28652257796`) | `RUNNER_CANCELLED` | ~4m21s |
| 13 (run `28661876288`) | `RUNNER_LOST_COMMUNICATION` | ~46m43s |

Neither ending was caused by a scripted precondition failure or a genuine Phase 3B product defect — both are GitHub Actions infrastructure-level endings of a single long-lived job. Splitting the 3 route batches (`public-candidate` = 7 routes, `recruiter` = 7 routes, `company` = 6 routes — 20 total, see `frontend/e2e/helpers/phase3b-controlled-routes.ts`) into 3 separate, strictly sequential jobs means:

- Each job's canonical-command step only has to survive **one batch**, not all 20 routes in one continuous run — a shorter single-job runtime window is less exposed to whatever caused attempt 13's `RUNNER_LOST_COMMUNICATION` after ~46m43s.
- `fail-fast: false` means a `RUNNER_CANCELLED`/`RUNNER_LOST_COMMUNICATION`/failed batch does **not** cancel the remaining batches — unlike the prior single-job shape, one bad batch no longer discards the other batches' evidence.
- Each batch uploads its **own** artifact (`if: always()`), so even if 2 of 3 batches are lost to infrastructure endings, the third batch's evidence is not lost with them.
- `max-parallel: 1` preserves the existing single-attempt-in-flight discipline (`workers=1`/`retries=0` inside each batch, and now also across batches) — this is not a concurrency increase, only a sequencing split of what was already one long-lived job.

**This is purely a CI job-topology change.** It does not add, remove, or reclassify a single Phase 3B route; it does not change `workers=1`/`retries=0`; it does not touch the harness's PASS/PARTIAL/WARN/FAIL classification logic.

---

## 2. What This Task Shipped

| Component | File | Purpose |
|---|---|---|
| Batch filter | `frontend/e2e/helpers/phase3b-controlled-routes.ts` (`selectPhase3bRouteBatches`, `Phase3bBatchLabel`, `PHASE3B_BATCH_LABELS`, `isPhase3bBatchLabel`) | Filters `PHASE3B_ROUTE_BATCHES` down to exactly one batch when `PHASE3B_BATCH` is set to `public-candidate`\|`recruiter`\|`company`; returns all 3 batches unfiltered when unset (unchanged legacy behavior); throws on any other value |
| Spec wiring | `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Uses `selectPhase3bRouteBatches(process.env)` in place of the raw `PHASE3B_ROUTE_BATCHES` import, and threads the resolved `PHASE3B_BATCH` value into every `writeGateEAttemptStatus` call as the new `batch` field |
| Batch-specific npm scripts | `frontend/package.json` (`test:phase3b-controlled-multitab-prod:public-candidate`, `-recruiter`, `-company`) | Set `PHASE3B_BATCH=<label>` and delegate to the existing `test:phase3b-controlled-multitab-prod` script, so the existing local hard-block guard (`phase3b-prod-local-guard.ts`, `GITHUB_ACTIONS` gate) still runs **first**, unchanged, for every batch script |
| Per-batch attempt-status field | `frontend/e2e/helpers/gate-e-attempt-status.ts` (`batch` field on `GateEAttemptStatus`, `getGateEBatchAttemptStatusFileName`) | Records which batch a given `gate-e-attempt-status.json` snapshot belongs to, and additionally persists a batch-named copy (`gate-e-attempt-status-<batch>.json`) alongside the default file so 3 batch jobs never overwrite each other's status file inside a shared `.diagnostics/` artifact tree |
| CLI status writer | `frontend/scripts/gate-e-attempt-status-write.ts` | Reads `PHASE3B_BATCH` from the environment and passes it through to `writeGateEAttemptStatus` for the workflow's shell-only status-update steps |
| Matrix workflow job | `.github/workflows/gate-e-phase3b-manual.yml` (`gate-e-phase3b-prod`) | `strategy: fail-fast: false, max-parallel: 1, matrix: batch: [public-candidate, recruiter, company]` — 3 sequential batch jobs instead of 1 long-lived job; `PHASE3B_BATCH: ${{ matrix.batch }}` at job `env:` level; canonical step calls `npm run test:phase3b-controlled-multitab-prod:${{ matrix.batch }}`; artifact name is `gate-e-phase3b-evidence-${{ matrix.batch }}-${{ github.run_id }}` |
| Aggregation job | `.github/workflows/gate-e-phase3b-manual.yml` (`gate-e-phase3b-aggregate`) | `needs: gate-e-phase3b-prod`, `if: always()` — downloads every batch's evidence artifact, merges available `gate-e-attempt-status-<batch>.json` / `phase3b-controlled-multitab-<batch>.json` files into one `gate-e-phase3b-aggregate.json` + a job-summary table, uploads its own `gate-e-phase3b-evidence-aggregate-<run_id>` artifact, and writes the same explicit non-claims footer as every other job in this workflow. **Draws no new pass/fail verdict of its own** — a missing batch artifact is recorded as `MISSING`, never treated as a failure of the aggregation step itself |
| Static tests | `frontend/scripts/gate-e-phase3b-split-batch.test.ts` (`npm run test:gate-e-phase3b-split-batch`) | Proves the batch filter, npm scripts, matrix/aggregation workflow wiring, and per-batch status persistence — without running Playwright or dispatching the workflow |
| Extended guard | `frontend/scripts/gate-e-isolated-runner-guard.test.ts` | New assertions for the matrix `strategy`, per-batch `env:`/artifact naming, and the aggregation job's `needs`/`if: always()` wiring |
| This document | `docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md` | Rationale, flow, result interpretation for the split-batch shape |

**This task does not dispatch the workflow.** No `workflow_dispatch` was triggered, no Phase 3B route was evaluated, and no Playwright browser was launched, locally or in CI, as part of this task.

---

## 3. Job Flow (Split-Batch Shape)

```
gate-e-phase3b-prod (matrix: public-candidate → recruiter → company, max-parallel: 1)
  ├─ batch job "public-candidate": same 12-step flow as before (validate → checkout →
  │    setup → npm ci → install chromium → static preflight → workers/retries check →
  │    public-health poll → HTTP smoke → canonical command (this batch only) → cleanup →
  │    upload gate-e-phase3b-evidence-public-candidate-<run_id> → non-claims summary)
  ├─ batch job "recruiter": identical flow, runs only after "public-candidate" finishes
  │    (pass, fail, or infra-ending — fail-fast: false)
  └─ batch job "company": identical flow, runs only after "recruiter" finishes
       │
       ▼ (needs: gate-e-phase3b-prod, if: always() — waits for all 3 matrix instances)
gate-e-phase3b-aggregate
  ├─ download every gate-e-phase3b-evidence-*-<run_id> artifact (continue-on-error, since
  │    a batch that never reached its own upload step produces no artifact to download)
  ├─ merge per-batch gate-e-attempt-status-<batch>.json + phase3b-controlled-multitab-
  │    <batch>.json into gate-e-phase3b-aggregate.json + a job-summary table
  ├─ upload gate-e-phase3b-evidence-aggregate-<run_id>
  └─ non-claims summary (identical footer to every other job in this workflow)
```

Every job step that existed in the pre-split single-job workflow (hard-ban confirmation validation, checkout, static preflight guards, `workers=1`/`retries=0` source verification, public-health poll, HTTP smoke, cleanup, artifact upload, non-claims summary) is preserved **per batch job**, unchanged in content — only the canonical-command step and the artifact name are batch-scoped.

---

## 4. Result Interpretation (Split-Batch Addendum)

This section extends [isolated runner plan §5](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md#5-result-interpretation); everything there still applies per batch job.

1. Each batch job uploads its own `gate-e-phase3b-evidence-<batch>-<run_id>` artifact — download all 3 (plus the `gate-e-phase3b-evidence-aggregate-<run_id>` artifact for the merged view) to assess the full run.
2. **A batch job succeeding is not itself a batch PASS** — exactly as before, the per-route `PASS`/`PARTIAL`/`WARN`/`FAIL` classifications inside that batch's `.diagnostics/phase3b-controlled-multitab-<batch>.json` are what determine the batch's actual outcome.
3. **A batch job failing, being cancelled, or losing communication does not fail the other 2 batches** — `fail-fast: false` guarantees they still run (or have already run) and still upload their own evidence independently.
4. The aggregation job's `gate-e-phase3b-aggregate.json` and job-summary table are a **convenience merge only** — they report `artifactFound: true/false` and, when available, the batch's last recorded `stage` and route counts, but they draw no new conclusion beyond what each batch's own artifact already states. A batch reported `MISSING` in the aggregate means that batch's evidence must be assessed as inconclusive for that batch specifically — it does not imply anything about the other 2 batches.
5. Writing a founder-facing result document (e.g. `docs/gate-e-phase3b-attempt14-result-<date>.md`) after a real dispatch remains a **separate, human-reviewed task**, exactly as attempts 1–13 were — never auto-generated by either the batch jobs or the aggregation job.

---

## 5. What This Does Not Do

- **Does not dispatch the workflow or run any Phase 3B batch.** `workflow_dispatch` was not triggered as part of this task.
- **Does not authorize attempt 14** or any future attempt — every attempt still requires its own separate, explicit founder "YES," exactly as attempts 7–13 did.
- **Does not run local Playwright.** All verification in this task was static (`tsc --noEmit`, `node:test`-based guard scripts, `npm run build`); the local hard-block guard (`phase3b-prod-local-guard.ts`) is unchanged and still gates every batch npm script on `GITHUB_ACTIONS==='true'`.
- **Does not touch backend/API/auth/DB/env code.** This task's diff is limited to `.github/workflows/gate-e-phase3b-manual.yml`, `frontend/e2e/helpers/phase3b-controlled-routes.ts`, `frontend/e2e/phase3b-controlled-multitab.spec.ts`, `frontend/e2e/helpers/gate-e-attempt-status.ts`, `frontend/scripts/gate-e-attempt-status-write.ts`, `frontend/scripts/gate-e-phase3b-split-batch.test.ts`, `frontend/scripts/gate-e-isolated-runner-guard.test.ts`, `frontend/package.json`, and `docs/`.
- **Does not mutate production.** Every prod-facing step (`public-health` poll, HTTP smoke, Phase 3B route checks) inside each batch job is read-only, unchanged from the pre-split workflow.
- **Does not change the application-level concurrency ceiling.** `workers=1`, `retries=0` remain exactly as proven by the [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md), verified per batch job by the unchanged `Verify workers=1 / retries=0` step; `max-parallel: 1` at the matrix level only sequences the 3 batch jobs, it does not raise Playwright's own worker count.
- **Does not deploy anything, run Gate D, or claim Launch GO, P0 closure, or Gate F YES** — both the per-batch and the aggregation job summaries carry the identical explicit non-claims footer used by every other job in this workflow.

---

## 6. Verification Performed (this task)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Resource watchdog (unaffected) | `npm run test:phase3b-resource-watchdog` | unchanged behavior, still PASS |
| Phase 3B static inventory (unaffected) | `npm run test:phase3b-controlled-multitab` | unchanged behavior, still PASS |
| Isolated runner guard (extended) | `npm run test:gate-e-isolated-runner-guard` | PASS, including new matrix/aggregation assertions |
| Local execution hard block (unaffected) | `npm run test:phase3b-local-execution-blocked` | unchanged behavior, still PASS |
| Split-batch static guard (new) | `npm run test:gate-e-phase3b-split-batch` | PASS |
| Aggregation script logic | manual dry run against a mock `batch-evidence/` tree (outside the repo, deleted after verification) | correctly identifies present vs. `MISSING` batches, correctly sums route counts, never throws on a missing batch |
| Frontend build | `npm run build` | succeeds |
| No Phase 3B execution this task | — | Confirmed — `workflow_dispatch` never triggered; no local Playwright invocation |

No Playwright browser was launched by this task, no `chrome-headless-shell` or Chrome-family process was spawned, no prod request was made, and no Phase 3B route was evaluated.

---

## 7. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO attempt 14 dispatch, authorization, or execution | Confirmed — this document explicitly does not authorize or trigger attempt 14 |
| NO local Playwright/browser | Confirmed — only static `tsc`/`tsx`/`node:test` checks and `npm run build` were run |
| NO prod mutation | Confirmed — no network requests made to prod in this task |
| NO backend/API/auth/DB/env code changes | Confirmed — diff limited to the workflow, `frontend/e2e/`, `frontend/scripts/`, `frontend/package.json`, and `docs/` |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO Gate D | Not run, not claimed |

---

## Explicit Non-Claims

- **Attempt 14:** **NOT authorized, NOT run** by this document or its workflow
- **Split-batch execution shape:** **SHIPPED, STATICALLY VERIFIED** — **NOT DISPATCHED** in this task
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this task adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · Split-batch isolated runner: SHIPPED, statically verified, NOT DISPATCHED · Attempt 14: still requires a separate, explicit founder authorization, NOT AUTHORIZED, NOT RUN**
