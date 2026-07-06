# Gate E Phase 3B — Attempt 15 (route-sharded, isolated runner) — FAIL (12/20 product failures, 8/20 PASS) — 2026-07-06

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `32ff41ba36bb8f34a4a6fdc484e7202794dcfa9f` (`32ff41ba`, PR #379 merged — Gate E Phase 3B **route-level sharding**: the 3-way batch matrix replaced by a 20-entry route matrix, one isolated-runner job per route, `fail-fast: false`, `max-parallel: 1`, each uploading its own evidence artifact `if: always()`, plus a rewritten per-route aggregate job).
**Founder decision:** Founder authorization: **YES** (per task framing) for this Gate E Phase 3B route-sharded isolated-runner dispatch ("attempt 15", sixth dispatch overall to `gate-e-phase3b-manual.yml`, first live dispatch of the route-sharded shape) — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only, isolated ephemeral GitHub Actions runners — no founder Mac involvement; 20 independent route-level matrix jobs + 1 aggregate job).

**Classification:** **`FAIL` — first attempt in this entire Gate E Phase 3B history (attempts 1–15) to produce confirmed, route-level PASS/FAIL product evidence for all 20 routes with zero infrastructure-level non-completions.** All 20 route jobs ran to their own natural conclusion (no `RUNNER_CANCELLED`, `RUNNER_LOST_COMMUNICATION`, or `RUNNER_SHUTDOWN_SIGNAL` — the three infrastructure failure modes that ended attempts 12, 13, and 14 respectively). **8/20 routes PASS, 12/20 routes FAIL** on real, reproducible product-level harness assertions — 11 via a captured browser-side JavaScript runtime error (`page-error:1`) and 1 (`/dashboard`) via excessive DOM node count (`dom-fail:21100`, threshold 15000). This is **not** an infrastructure non-completion and **not** the prior `BLANK_OR_NO_CONTENT` 20/20 FAIL from 2026-06-28 — it is new, more specific, partially-passing route-level evidence.

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md) · [attempt 14 result](./gate-e-phase3b-attempt14-result-2026-07-03.md) · [attempt 13 result](./gate-e-phase3b-attempt13-result-2026-07-03.md) · [attempt 12 result](./gate-e-phase3b-attempt12-result-2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28777105356` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28777105356 |
| Head SHA | `32ff41ba36bb8f34a4a6fdc484e7202794dcfa9f` (matches repo HEAD at dispatch time, PR #379 — first live dispatch of the route-sharded workflow shape) |
| Dispatched | 2026-07-06T08:07:03Z |
| Overall run status | `completed`, conclusion `failure` (driven by the 12 route-job product failures, not infrastructure) |
| Jobs | 20 independent route-level matrix jobs + 1 aggregate job |
| Overall run duration | ≈1h15m53s (08:07:03Z → 09:22:56Z) — well inside the 3–4 hour budgeted window; each route job ran ≈3m40s–4m avg, entirely consumed by its own scripted preconditions + canonical command, none approaching the 20-minute job timeout or 10-minute canonical-command step timeout |
| Precondition verification (before dispatch) | `git fetch` + `git rev-parse origin/cursor/phase1-monorepo-scaffold` = `32ff41ba36bb8f34a4a6fdc484e7202794dcfa9f` — exact match to the required minimum SHA; working tree clean |
| Concurrent/racing workflow runs | **None** — confirmed via `gh run list`: last `smoke.yml` run (`28775187460`) completed at 07:29:53Z, well before this dispatch at 08:07:03Z; no other `gate-e-phase3b-manual` run overlapped |
| Artifacts uploaded | **21 of 21 expected** — all 20 per-route `gate-e-phase3b-evidence-<slug>-28777105356` artifacts **plus** `gate-e-phase3b-evidence-aggregate-28777105356` — a first for this workflow (every prior isolated-runner dispatch lost some or all per-job artifacts to an infrastructure-level ending) |

### 1.1 Per-route job summary (chronological order, matches matrix `include:` order)

| # | Route | Job status | Window (UTC) | Product result | Classification | failReasons |
|---|---|---|---|---|---|---|
| 1 | `/` | ✅ success | 08:07:09–08:11:02 (≈3m53s) | **PASS** | PASS | — |
| 2 | `/demo` | ✅ success | 08:11:04–08:14:52 (≈3m48s) | **PASS** | PASS | — |
| 3 | `/for-companies` | ✅ success | 08:14:54–08:18:35 (≈3m41s) | **PASS** | PASS | — |
| 4 | `/dashboard` | ⚠️ failure | 08:18:37–08:22:10 (≈3m33s) | **FAIL** | `DOM_FAIL` | `dom-fail:21100` (domNodes 21100 > threshold 15000) |
| 5 | `/dashboard/jobs` | ✅ success | 08:22:11–08:25:57 (≈3m46s) | **PASS** | PASS | — |
| 6 | `/dashboard/matches` | ✅ success | 08:25:59–08:29:35 (≈3m36s) | **PASS** | PASS | — |
| 7 | `/profile` | ✅ success | 08:29:37–08:33:17 (≈3m40s) | **PASS** | PASS | — |
| 8 | `/recruiter` | ⚠️ failure | 08:33:18–08:36:53 (≈3m35s) | **FAIL** | PASS¹ | `page-error:1` |
| 9 | `/recruiter/candidates/demo-candidate-001` | ⚠️ failure | 08:36:55–08:40:35 (≈3m40s) | **FAIL** | PASS¹ | `page-error:1` |
| 10 | `/recruiter/candidates/demo-candidate-001/trust` | ⚠️ failure | 08:40:37–08:44:17 (≈3m40s) | **FAIL** | PASS¹ | `page-error:1` |
| 11 | `/recruiter/candidates/demo-candidate-001/team` | ⚠️ failure | 08:44:20–08:48:06 (≈3m46s) | **FAIL** | PASS¹ | `page-error:1` |
| 12 | `/recruiter/candidates/demo-candidate-001/communication` | ⚠️ failure | 08:48:08–08:51:51 (≈3m43s) | **FAIL** | PASS¹ | `page-error:1` |
| 13 | `/recruiter/jobs/demo-role-001/pipeline` | ⚠️ failure | 08:51:54–08:55:44 (≈3m50s) | **FAIL** | PASS¹ | `page-error:1` |
| 14 | `/recruiter/integrations/ats/import-readiness` | ⚠️ failure | 08:55:46–08:59:20 (≈3m34s) | **FAIL** | PASS¹ | `page-error:1` |
| 15 | `/company/dashboard` | ⚠️ failure | 08:59:22–09:03:00 (≈3m38s) | **FAIL** | PASS¹ | `page-error:1` |
| 16 | `/company/candidates/demo-candidate-001` | ✅ success | 09:03:01–09:06:43 (≈3m42s) | **PASS** | PASS | — |
| 17 | `/company/candidates/demo-candidate-001/trust` | ⚠️ failure | 09:06:47–09:10:36 (≈3m49s) | **FAIL** | PASS¹ | `page-error:1` |
| 18 | `/company/candidates/demo-candidate-001/team` | ⚠️ failure | 09:10:38–09:14:06 (≈3m28s) | **FAIL** | PASS¹ | `page-error:1` |
| 19 | `/company/candidates/demo-candidate-001/communication` | ⚠️ failure | 09:14:08–09:17:56 (≈3m48s) | **FAIL** | PASS¹ | `page-error:1` |
| 20 | `/company/roles/demo-role-001/pipeline` | ✅ success | 09:17:57–09:22:44 (≈4m47s) | **PASS** | PASS | — |
| — | aggregate | ✅ success | 09:22:47–09:22:56 (≈9s) | n/a | n/a | n/a |

¹ The harness's `classification` field only maps a `failReasons` entry to a named bucket (`DOM_FAIL`, `BLANK_OR_NO_CONTENT`, `HEAP_FAIL`, etc.) through an explicit `else if` cascade in `classifyPhase3bRouteFailure` (`frontend/e2e/helpers/phase3b-harness-diagnostics.ts`); `page-error:N` is **not** one of the named cascade branches, so `classification` stays at its default `"PASS"` even though the separate `status` field — the one the canonical command's `expect.soft` assertion actually checks — correctly evaluates to `"FAIL"`. This is why every `page-error:1` route's Playwright failure message reads `<route>: PASS page-error:1` — confusing at first glance, but confirmed correct by reading the classification cascade: `status` (not `classification`) is authoritative for pass/fail, and `status` was `"FAIL"` in all 12 failing routes.

**Totals: 8/20 PASS, 12/20 FAIL (11 × `page-error:1`, 1 × `DOM_FAIL`/`dom-fail:21100`). Zero routes MISSING, zero routes hit an infrastructure-level ending.**

---

## 2. What Passed Before Every Route's Result

Every scripted precondition passed identically in **all 20** route jobs, and — unlike attempts 12–14 — every route job's canonical command ran to full natural completion (never killed by an external signal):

| Step | Conclusion (all 20 routes) | Evidence |
|---|---|---|
| Validate hard-ban confirmation inputs | ✅ success | All 20 `confirm_*=yes` accepted |
| Checkout / Setup Node / `npm ci` / Install Playwright chromium | ✅ success | Standard CI setup, no anomalies, in all 20 |
| Persist attempt status — workflow start (heartbeat) | ✅ success (heartbeat only — see §4 for the artifact-upload caveat) | Logged `written=true` in all 20 |
| Static preflight guards (`tsc`, resource-watchdog, controlled-multitab inventory, isolated-runner guard, split-batch guard, route-sharding guard, local-execution-blocked) | ✅ success | All static guards passed, no browser, in all 20 |
| Verify `workers=1` / `retries=0` source-level | ✅ success | Confirmed unchanged, in all 20 |
| Prod `public-health` — 10× poll | ✅ success | **10/10 × HTTP 200, `status=ok`, `db_ok=true`** in all 20 (confirmed via `grep -L "OK: public-health 10/10" *.log` returning empty) |
| HTTP smoke — 10 routes | ✅ success | **10/10 × HTTP 200** in all 20 (same confirmation method) |
| Pre-run cleanup (orphan-pattern check) | ✅ success | 0 before / 0 after, in all 20 |
| Persist attempt status — before canonical command (heartbeat) | ✅ success | Logged in all 20, immediately before the canonical command |
| Playwright launch, `Running 2 tests using 1 worker` | ✅ started | In all 20 — 1 shared preflight test + 1 single-route test per job, matching the route-sharded spec shape |
| **`prod preflight — public-health + frontend_commit alignment`** sub-test | ✅ **PASS** (≈4.6–5.0s) | Confirmed via a real `✓ 1 [chromium] ...` Playwright pass line in **all 20** logs |
| `[gate-e-heartbeat] batch-start: <slug> (1 routes)` | ✅ logged | In all 20 — confirms each route job entered its single-route testing phase |
| `[gate-e-heartbeat] batch <slug>: idle wait ...ms elapsed` | ✅ logged, reached 100% (≈63750ms, the single-route idle window) | In all 20 |
| `[gate-e-heartbeat] batch-complete: <slug> (1/1 batches done, 1 routes evaluated so far)` | ✅ logged | In all 20 — **the first time in this workflow's history every route reached this checkpoint** |
| **Gate E Phase 3B canonical command** (`test:phase3b-controlled-multitab-prod:route`) | ✅ ran to completion in all 20 | Exit code `0` for the 8 PASS routes, exit code `1` (genuine Playwright `expect.soft`/`expect` assertion failure, **not** a runner-level signal) for the 12 FAIL routes |
| Persist attempt status — canonical command finished (heartbeat), `if: always()` | ✅ ran in all 20 | Unlike attempts 12–14, this step was **never skipped** — no runner-level termination occurred |
| Cleanup / Upload diagnostics / Explicit non-claims | ✅ ran in all 20 | All 20 per-route artifacts + the aggregate artifact successfully uploaded |

---

## 3. Route-Level Product Findings

### 3.1 Pattern: a captured JavaScript runtime error (`page-error:1`) on 11/20 routes

The dominant failure mode — **11 of 12 failing routes** — is a single browser-side `pageerror` event captured by the harness's `page.on("pageerror", ...)` listener (`frontend/e2e/phase3b-controlled-multitab.spec.ts`) during the 60–90s idle window after page load. `classifyPhase3bRouteFailure` (`frontend/e2e/helpers/phase3b-harness-diagnostics.ts`) turns any `pageErrorCount > 0` into a `failReasons.push("page-error:1")` entry, which — regardless of `classification` bucket — always forces `status = "FAIL"` (see §1.1 footnote).

**Every failing route with this signature:**

| Route |
|---|
| `/recruiter` |
| `/recruiter/candidates/demo-candidate-001` |
| `/recruiter/candidates/demo-candidate-001/trust` |
| `/recruiter/candidates/demo-candidate-001/team` |
| `/recruiter/candidates/demo-candidate-001/communication` |
| `/recruiter/jobs/demo-role-001/pipeline` |
| `/recruiter/integrations/ats/import-readiness` |
| `/company/dashboard` |
| `/company/candidates/demo-candidate-001/trust` |
| `/company/candidates/demo-candidate-001/team` |
| `/company/candidates/demo-candidate-001/communication` |

**All 7 of the `/recruiter/*` routes exercised in this run fail with `page-error:1` (7/7 = 100%).** The `/company/*` surfaces are more mixed: `/company/dashboard` and 3 of the 4 `/company/candidates/demo-candidate-001*` sub-routes fail, but the base `/company/candidates/demo-candidate-001` route itself **passes**, as does `/company/roles/demo-role-001/pipeline`. This pattern — base index route passing while every one of its `trust`/`team`/`communication` sub-tabs fails — mirrors the `/dashboard` vs. `/dashboard/jobs` + `/dashboard/matches` split below and suggests a **shared client-side error source** across the `recruiter`/`company` candidate-detail tab surfaces, not a per-route-unique defect. **The exact error message text is not recoverable from this run's evidence** — see §4's `.diagnostics` artifact-upload gap; only the `pageErrorCount` (always exactly 1 for every affected route) is confirmed via the Playwright assertion failure text.

### 3.2 `/dashboard` — excessive DOM node count (`DOM_FAIL`, not `page-error`)

`/dashboard` is the only route to fail on a **different** signal: `domNodes: 21100` against the harness's `PHASE3B_DOM_FAIL` threshold of `15000` (40.7% over budget). `/dashboard` had **no** `page-error` failReason (confirmed: its Playwright failure message reads `DOM_FAIL dom-fail:21100`, not `PASS page-error:1`, and the classification cascade only surfaces `DOM_FAIL` when no page-error is also `push`ed ahead of it in message construction — the two are independent measurements, and `/dashboard`'s specific failure is DOM-size-only). Its sibling routes `/dashboard/jobs` and `/dashboard/matches` both **PASS** with no DOM or page-error issue, meaning the excessive DOM growth is scoped to the `/dashboard` root view specifically, not the dashboard section as a whole.

### 3.3 Routes that PASS cleanly (8/20)

`/`, `/demo`, `/for-companies`, `/dashboard/jobs`, `/dashboard/matches`, `/profile`, `/company/candidates/demo-candidate-001`, `/company/roles/demo-role-001/pipeline` — all 8 completed their full 60–90s idle window with zero page errors, DOM node count under threshold, JS heap under threshold, no redirect storm, no console burst, no auth-gate loop, no public-health polling loop, and no marquee-remount loop (all measured by the same harness on every route).

---

## 4. Infrastructure Finding: `.diagnostics` Artifact Upload Silently Excluded (Config Bug, Not a Route-Evidence Gap)

The rewritten `gate-e-phase3b-aggregate` job (from the route-sharding plan) reported **`artifactFound: false` for all 20 routes** and `totals: { pass: 0, partial: 0, warn: 0, fail: 0, missing: 20 }` in `gate-e-phase3b-route-aggregate.json` — **this does not mean the routes produced no evidence**; it means the aggregation job's *own inputs* (the per-route `frontend/.diagnostics/gate-e-attempt-status.json` / `phase3b-controlled-multitab-<slug>.json` files) were never present in any of the 20 downloaded artifacts, despite every route job's log explicitly confirming `written=true` at every heartbeat stage (`workflow-start`, `public-health-complete`, `http-smoke-complete`, `pre-run-cleanup-complete`, `before-canonical`, `canonical-complete`, `workflow-cleanup`).

**Root cause (confirmed via `gh api .../jobs/{id}/logs` and a direct download+inspection of every artifact):** `actions/upload-artifact@v4` defaults `include-hidden-files` to `false`, and the workflow's "Upload diagnostics" step does not set `include-hidden-files: true`. Because `.diagnostics` is a dot-prefixed (hidden) directory, **the entire directory — including the literal explicit path `frontend/.diagnostics/gate-e-attempt-status.json` listed in the step's `path:` input — is silently excluded from every uploaded artifact**, even though the file demonstrably exists on the runner's filesystem at upload time (per the `written=true` heartbeats). This affected **every one of attempt 15's 20 route jobs identically**; it is a **workflow-configuration gap that predates this attempt** (the same `path:` list and default `include-hidden-files` setting were present in attempts 12–14 too, though those attempts never reached the "Upload diagnostics" step long enough, or at all, to expose it as cleanly as attempt 15 does with 20/20 jobs completing).

**This is not a product defect and not evidence of missing route execution.** The route-level PASS/FAIL verdicts in this document (§1.1, §3) are reconstructed directly from each route's own **retrievable job log** (the Playwright `✓`/`✘` result lines and `expect.soft` failure messages) and the **non-hidden** `playwright-report/` + `test-results/` artifact contents (which uploaded correctly in all 20 routes, confirming 3 files per route: `index.html`, one `data/*.md`, and — for the 12 failing routes — one `error-context.md`). Only the machine-readable `.diagnostics` JSON (which would have included the up-to-5 captured `pageErrors` text strings and precise `domNodes`/`jsHeapUsedMb` numeric values beyond what the assertion message itself prints) is unavailable this run.

**Recommended follow-up (not implemented by this task — separate, low-risk, CI-config-only change):** add `include-hidden-files: true` to the "Upload diagnostics" step's `actions/upload-artifact@v4` `with:` block in `gate-e-phase3b-manual.yml`. This does not require a new founder-authorized "attempt" cycle to ship (it is a workflow-YAML fix, not a Phase 3B execution), but should be verified with its own live dispatch before being relied upon for future attempts' aggregation tables.

---

## 5. Process / Resource State

| Check | Result |
|---|---|
| Runner class | 20 independent ephemeral, single-purpose `ubuntu-24.04` GitHub-hosted VMs (one per route) + 1 more for the aggregate job — all destroyed after their respective jobs regardless of outcome |
| Founder Mac involvement | **None** — no local Playwright, no local browser, no local process of any kind for this attempt |
| `TWIN_ACCESS_TOKEN` | Never printed, logged, or committed in any evidence retrieved by this task; confirmed via log grep (`TWIN_ACCESS_TOKEN: ***` masked, and `TWIN_ACCESS_TOKEN present: true` boolean-only echo) across all 20 route logs; only referenced via `secrets.TWIN_ACCESS_TOKEN` in the workflow source, unchanged from attempts 12–14 |
| Production mutation | **None** — every retrievable prod-facing request (public-health poll ×10, HTTP smoke ×10, per route) was read-only `GET`; the canonical command's own preflight and route checks are also read-only navigation (`page.goto`), unchanged from prior attempts |
| Concurrent workflow runs | **None** — confirmed via `gh run list` |
| Job logs | **Retrievable for all 20 routes and the aggregate job** — no `BlobNotFound` gap this attempt (that gap was specific to attempt 13's `RUNNER_LOST_COMMUNICATION` signature, which did not recur here) |
| Infrastructure-level endings | **Zero** — no `RUNNER_CANCELLED`, `RUNNER_LOST_COMMUNICATION`, or `RUNNER_SHUTDOWN_SIGNAL` observed in any of the 20 route jobs; every job's `failure` conclusion (12 of them) traces to a genuine in-harness `expect`/`expect.soft` assertion, confirmed via each job's own step-level annotation (`gh api .../jobs/{id}` → failed step = "Gate E Phase 3B prod — controlled multitab (canonical command)", not a job-level runner annotation) |

---

## 6. Routes Evaluated

**20/20 confirmed — a first for this workflow's isolated-runner history (attempts 12–14 confirmed 0/20 each):**

| Result | Count | Routes |
|---|---|---|
| **PASS** | 8 | `/`, `/demo`, `/for-companies`, `/dashboard/jobs`, `/dashboard/matches`, `/profile`, `/company/candidates/demo-candidate-001`, `/company/roles/demo-role-001/pipeline` |
| **FAIL — `page-error:1`** | 11 | `/recruiter`, `/recruiter/candidates/demo-candidate-001`, `/recruiter/candidates/demo-candidate-001/trust`, `/recruiter/candidates/demo-candidate-001/team`, `/recruiter/candidates/demo-candidate-001/communication`, `/recruiter/jobs/demo-role-001/pipeline`, `/recruiter/integrations/ats/import-readiness`, `/company/dashboard`, `/company/candidates/demo-candidate-001/trust`, `/company/candidates/demo-candidate-001/team`, `/company/candidates/demo-candidate-001/communication` |
| **FAIL — `DOM_FAIL` (`dom-fail:21100`)** | 1 | `/dashboard` |
| **MISSING / infrastructure ending** | 0 | — |

**Global classification: `FAIL`** — per this task's own stated interpretation rule ("FAIL if product failures"), since 12/20 routes produced confirmed, reproducible product-level failures. This is **materially different evidence** from the prior `BLANK_OR_NO_CONTENT` 20/20 FAIL recorded 2026-06-28: that result meant every route rendered no usable content at all; this result means 8/20 routes render and behave correctly under the full harness (idle window, DOM/heap/redirect/console/auth-gate/marquee checks) while 12/20 have a specific, named, reproducible defect (a JS runtime error on 11 routes, one excessive-DOM-growth route). **Phase 3B overall status updates from `FAIL (0/20 confirmed)` to `FAIL (8/20 PASS, 12/20 confirmed product failures)`** — an improvement in evidence quality and specificity, not a change in the NO-GO stance.

---

## 7. Recommendation — Attempt 16 and Follow-Up

Consistent with the established discipline in this repository (no attempt auto-retries; every attempt requires its own separate, explicit founder authorization — see attempts 7 through 15), **this document does not authorize or trigger a further dispatch.**

1. **This attempt closes the multi-attempt infrastructure-non-completion streak (attempts 12, 13, 14)** — the route-sharding mitigation shipped after attempt 14 appears to have worked as intended (no infrastructure ending struck any of the 20 route jobs), though this is one dispatch, not a controlled trial, and a future dispatch could still encounter a `RUNNER_SHUTDOWN_SIGNAL`-class event on an individual route job (which would now cost at most 1/20 routes' evidence, per the route-sharding design).
2. **A separate, explicit founder "Gate E attempt 16 = YES?" authorization is required before any further dispatch** — this document does not authorize one, and none is needed immediately: attempt 15 already produced complete, actionable route-level evidence for all 20 routes.
3. **Two concrete, low-risk next steps this task did not implement (both docs/CI-config-only, no backend/API/auth/DB/env):**
   - Fix the `.diagnostics` artifact-upload gap (§4) by adding `include-hidden-files: true` to the "Upload diagnostics" step, so a future dispatch's aggregate table reflects real per-route status instead of `MISSING` for all routes.
   - Investigate the actual JS runtime error text behind the `page-error:1` signature shared by all 7 `/recruiter/*` routes and most `/company/candidates/demo-candidate-001*` sub-routes — this task's evidence confirms *that* an error occurs and on *which* routes, but not the error's message/stack, which requires either the `.diagnostics` fix above (to recover the up-to-5 captured `pageErrors` strings) or a source-level investigation of the shared component(s) rendered across those routes (this is an application code change, out of this task's scope).
4. **No Phase 3B harness or workflow code changes are indicated as *required* by this attempt's own evidence** — every precondition, the preflight sub-test, and all 20 routes' canonical-command executions behaved exactly as designed; the 12 FAIL verdicts are the harness correctly doing its job, not a harness defect. The actual product defects (page errors on recruiter/company detail sub-routes; excessive DOM growth on `/dashboard`) require application-level investigation, which is outside this task's scope (docs + evidence only, no backend/API/auth/DB/env changes).

---

## Execution Record

```
Gate E Phase 3B Attempt 15 (route-sharded) — FAIL (8/20 PASS, 12/20 confirmed product failures)
====================================================================================================
Founder authorization:      YES (task framing) — confirm_gate_e=yes, confirm_prod_smoke=yes,
                             confirm_no_launch_go=yes
Runner:                     Isolated GitHub Actions workflow_dispatch (gate-e-phase3b-manual.yml)
                             20x ubuntu-24.04, ephemeral, single-purpose, one per route
                             + 1 for aggregate — NOT the founder Mac

Dispatch:
  run_id:                   28777105356
  run_url:                  https://github.com/CzechowskiT/twin/actions/runs/28777105356
  branch:                   cursor/phase1-monorepo-scaffold
  head_sha:                 32ff41ba36bb8f34a4a6fdc484e7202794dcfa9f (PR #379, first live
                             dispatch of the route-sharded workflow shape)
  dispatched_at:            2026-07-06T08:07:03Z
  run_completed_at:         2026-07-06T09:22:56Z (~1h15m53s total)

Preconditions (all PASS, all 20 routes):
  public-health:             10/10 x HTTP 200, status=ok, db_ok=true (each route)
  HTTP smoke:                10/10 x HTTP 200, 10 routes (each route)
  static preflight guards:   PASS (tsc, resource-watchdog, controlled-multitab inventory,
                              isolated-runner guard, split-batch guard, route-sharding guard,
                              local-execution-blocked)
  workers=1/retries=0:       confirmed source-level, unchanged
  pre-run cleanup:           PASS, 0 orphans before/after (each route)
  prod preflight sub-test:   PASS (~4.6-5.0s, each route) — confirmed via retrievable
                              Playwright checkmark line, all 20 routes
  batch-start + idle wait:   reached 100% in all 20 routes (~63750ms single-route idle window)

Per-route results (20/20 confirmed, zero infrastructure endings):
  PASS (8):  /  /demo  /for-companies  /dashboard/jobs  /dashboard/matches  /profile
             /company/candidates/demo-candidate-001  /company/roles/demo-role-001/pipeline
  FAIL page-error:1 (11):  /recruiter  /recruiter/candidates/demo-candidate-001
             /recruiter/candidates/demo-candidate-001/trust
             /recruiter/candidates/demo-candidate-001/team
             /recruiter/candidates/demo-candidate-001/communication
             /recruiter/jobs/demo-role-001/pipeline
             /recruiter/integrations/ats/import-readiness
             /company/dashboard
             /company/candidates/demo-candidate-001/trust
             /company/candidates/demo-candidate-001/team
             /company/candidates/demo-candidate-001/communication
  FAIL DOM_FAIL dom-fail:21100 (1):  /dashboard

Routes evaluated:            20/20 CONFIRMED (first time in this workflow's history —
                              attempts 12-14 each confirmed 0/20)
Global classification:       FAIL (8/20 PASS, 12/20 confirmed product failures; 0 MISSING)
.diagnostics artifacts:      MISSING for all 20 routes — CONFIG BUG, not an evidence gap:
                              actions/upload-artifact@v4 defaults include-hidden-files=false,
                              silently excluding the entire .diagnostics/ directory even
                              though the workflow's path: list references it explicitly;
                              route-level PASS/FAIL reconstructed from job logs +
                              playwright-report/test-results instead (both uploaded correctly)
Job logs:                    RETRIEVABLE for all 20 routes and the aggregate job
Infrastructure endings:      ZERO (no RUNNER_CANCELLED, RUNNER_LOST_COMMUNICATION, or
                              RUNNER_SHUTDOWN_SIGNAL in any of the 20 route jobs) — route-level
                              sharding (shipped after attempt 14) appears to have prevented a
                              recurrence on this dispatch

Explicit non-claims:
  Product FAIL:    CONFIRMED — 12/20 routes, with specific named reasons (page-error, DOM_FAIL)
  Phase 3B PASS:   NOT CLAIMED — only 8/20 routes passed
  P0 stance:       OPEN
  Launch stance:   NO-GO
  Gate F:          PENDING
  Phase 3B (overall): FAIL — updated from prior 0/20-confirmed FAIL to 8/20 PASS, 12/20
                     confirmed product FAIL — more specific evidence, same NO-GO stance
  Attempt 16:      NOT authorized, NOT run by this document — requires a separate, explicit
                     founder "Gate E attempt 16 = YES?" decision
```

---

## Hard Bans Honoured (this run)

| Ban | Honoured |
|---|---|
| NO local Playwright/Phase3B/browser on Mac | Confirmed — 100% isolated GitHub Actions runners (20x route jobs + 1 aggregate), zero local execution |
| NO token exposure | Confirmed — token sourced via `secrets.TWIN_ACCESS_TOKEN`; masked in all 20 retrievable logs (`***`), boolean-only presence echo; no token value appears in any evidence retrieved by this task |
| NO prod mutation | Confirmed — every retrievable prod-facing request (public-health poll, HTTP smoke, preflight, per route) was read-only `GET`/`page.goto` |
| NO backend/API/auth/DB/env changes | Confirmed — this task's diff is `docs/` only (this result doc + evidence-index update); no code changes shipped by this task |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 CLOSED | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO attempt 16 execution or authorization | **Not run, not authorized** by this document |
| Minimal docs | Confirmed — this result doc + one evidence-index update; no new guard test shipped this task (optional, not required — the guard-test convention from attempts 10/12/13/14 is not repeated here since this is the first attempt with substantive product evidence to guard, and a future task can add one if a doc-drift risk emerges) |

---

## Explicit Non-Claims

- **Phase 3B prod attempt 15 (route-sharded):** **COMPLETED** — all 20 route jobs ran to natural conclusion, zero infrastructure-level endings
- **Product conclusion:** **CONFIRMED** — 8/20 PASS, 12/20 FAIL (11 `page-error:1`, 1 `DOM_FAIL`)
- **Phase 3B (overall):** **FAIL** — updated from the prior 0/20-confirmed FAIL (2026-06-28) to this attempt's 8/20 PASS, 12/20 confirmed product FAIL; more specific evidence, same NO-GO stance
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Attempt 16:** **NOT authorized, NOT run** by this document — requires a separate, explicit founder authorization

**Public launch: NO-GO · P0: OPEN · Gate E: YES/FAIL (8/20 PASS, 12/20 confirmed product FAIL) · Gate E attempt 15 route-sharded (run 28777105356): FAIL — first attempt in this workflow's history with zero infrastructure-level endings across all 20 routes; 11 routes fail on a captured JS `page-error:1` (all 7 `/recruiter/*` routes plus 4 `/company/*` candidate-detail sub-routes), 1 route (`/dashboard`) fails on excessive DOM node count (`dom-fail:21100` vs. 15000 threshold); 8 routes PASS cleanly; a separate `.diagnostics` artifact-upload config bug (`include-hidden-files` default `false` on `actions/upload-artifact@v4`) meant the aggregate job's own summary table shows all 20 routes as MISSING despite full route-level evidence being reconstructible from job logs + playwright-report/test-results · Phase 3B: FAIL (8/20 PASS, 12/20 confirmed product failures, more specific than prior 0/20) · Gate F: PENDING · Attempt 16: requires separate founder authorization, NOT AUTHORIZED, NOT RUN**
