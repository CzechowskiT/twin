# Gate E Phase 3B — Attempt 13 — RUNNER_LOST_COMMUNICATION / INCONCLUSIVE — 2026-07-03

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `713e5c3b18973985ddb047fb1960559889071df1` (`713e5c3b`, PR #375 merged — Gate E isolated-runner cancellation-hardening, includes attempt 12's `[gate-e-heartbeat]` logging, `frontend/.diagnostics/gate-e-attempt-status.json` persistence, and the 40-minute canonical-command step timeout).
**Founder decision:** Founder authorization: **YES** (per task framing) for a Gate E Phase 3B isolated-runner dispatch (third dispatch, "attempt 13") — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only, isolated ephemeral GitHub Actions runner — no founder Mac involvement).

**Classification:** **`RUNNER_LOST_COMMUNICATION` / INCONCLUSIVE** (new, more specific than attempt 12's `RUNNER_CANCELLED`) — GitHub Actions itself produced an explicit failure annotation on this job: *"The hosted runner lost communication with the server. Anything in your workflow that terminates the runner process, starves it for CPU/Memory, or blocks its network access can cause this error."* This is a materially different diagnostic signature from attempt 12 (run `28652257796`), whose sole failure annotation read simply *"The operation was canceled."* — the generic text GitHub emits for an explicit external/API-level cancel request. Attempt 13 produced no such generic-cancel text; instead GitHub attributed the failure to the **runner's own health** (heartbeat loss to the Actions control plane), explicitly naming CPU/memory starvation or network blockage as candidate causes — not an external actor calling the cancel API. **Not a product FAIL, not a Phase 3B PASS.**

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 12 result](./gate-e-phase3b-attempt12-result-2026-07-03.md) · [isolated runner plan](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md) · [resource watchdog + addendum](./PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28661876288` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28661876288 |
| Job | `Gate E Phase 3B prod (isolated runner)` (ID `85004216900`) |
| Runner | `ubuntu-latest` (GitHub-hosted, ephemeral, single-purpose) |
| Head SHA | `713e5c3b18973985ddb047fb1960559889071df1` (matches repo HEAD at dispatch time, PR #375) |
| Dispatched | 2026-07-03T12:54:06Z |
| Job started | 2026-07-03T12:54:09Z |
| Job completed | 2026-07-03T13:43:11Z (≈49m2s total job time) |
| Canonical command step started | 2026-07-03T12:56:28Z |
| Canonical command step ran for | ≈46m43s before the job ended (well past the 40-minute step `timeout-minutes` budget starting from *its own* start, but — see §3 — the evidence does not show a clean step-level `timed_out` conclusion) |
| Overall conclusion | `failure` (job-level) |
| Artifacts uploaded | **None** — confirmed via `gh api .../artifacts` (empty array); the "Upload diagnostics" step never ran |
| Job log | **Unavailable** — `gh api repos/CzechowskiT/twin/actions/jobs/85004216900/logs` returns HTTP 404 `BlobNotFound` (confirmed twice, 20s apart) |

---

## 2. What Passed Before the Runner Lost Communication

Every scripted precondition passed, and — unlike attempt 12 dispatch 2, which was cancelled only ≈4m21s after the "prod preflight" sub-test passed — this run continued for **≈46m43s** inside the canonical command before ending, meaning it plausibly progressed well into the 20-route batch execution (7+7+6 routes across 3 `test()` blocks) before losing communication. No diagnostics artifact or log survives to confirm exactly how many of the 20 routes completed.

| Step | Conclusion | Evidence |
|---|---|---|
| Validate hard-ban confirmation inputs | ✅ success | All three `confirm_*=yes` accepted |
| Checkout / Setup Node / `npm ci` / Install Playwright chromium | ✅ success | Standard CI setup, no anomalies |
| Persist attempt status — workflow start (heartbeat) | ✅ success | Cancellation-hardening checkpoint 1/6 reached |
| Static preflight guards (`tsc`, resource-watchdog, controlled-multitab inventory, isolated-runner guard, local-execution-blocked guard) | ✅ success | All static guards passed, no browser |
| Verify `workers=1` / `retries=0` source-level | ✅ success | Confirmed unchanged |
| Prod `public-health` — 10× poll | ✅ success | **10/10 × HTTP 200, `status=ok`, `db_ok=true`** |
| Persist attempt status — public-health complete (heartbeat) | ✅ success | Checkpoint 2/6 |
| HTTP smoke — 10 routes | ✅ success | **10/10 × HTTP 200** across the same 10 routes as attempt 12 |
| Persist attempt status — HTTP smoke complete (heartbeat) | ✅ success | Checkpoint 3/6 |
| Pre-run cleanup (orphan-pattern check) | ✅ success | Attempt-12's dispatch-1 false positive did **not** recur again |
| Persist attempt status — pre-run cleanup complete (heartbeat) | ✅ success | Checkpoint 4/6 |
| Persist attempt status — before canonical command (heartbeat) | ✅ success | Checkpoint 5/6, immediately before the canonical command |
| **Gate E Phase 3B canonical command** (`test:phase3b-controlled-multitab-prod`) | ⚠️ `in_progress` in the GitHub Actions API forever — **no conclusion was ever recorded**, matching attempt 12's cancellation signature exactly (see §3) | Ran for ≈46m43s, then the job ended without this step, or any step after it, reaching `success`/`failure`/`cancelled`/`timed_out` |
| Persist attempt status — canonical command finished (heartbeat), `if: always()` | ⛔ never started (`pending`) | Would have been checkpoint 6/6 — **did not run**, which is itself evidence the whole job stopped, not just this one step |
| Cleanup / Upload diagnostics / Explicit non-claims | ⛔ never started (`pending`) | 0 artifacts on the run; `frontend/.diagnostics/gate-e-attempt-status.json` was never uploaded even though the workflow persists it after every stage (this task's own attempt-12 hardening) |

### 2.1 Public-health and HTTP smoke

Both preconditions were observed live via `gh run watch` reaching `✓` on the corresponding checklist rows before the canonical command step began; the underlying step-level API confirms `conclusion: "success"` for both (`Prod public-health — 10x poll`, `HTTP smoke — 10 routes`), consistent with attempt 12's verbatim 10/10 output pattern. Raw stdout for this run's public-health/smoke steps could not be re-fetched after the fact because the job's log blob is unavailable (§1, §3) — this is a gap relative to attempt 12, where the log was retrievable.

### 2.2 What is different from attempt 12: forward progress before the failure

| | Attempt 12 (dispatch 2, run `28652257796`) | Attempt 13 (run `28661876288`) |
|---|---|---|
| Canonical command step started | ~09:44:08Z | 12:56:28Z |
| Job ended | 09:48:37Z | 13:43:11Z |
| Time inside canonical command before failure | ≈4m21s (only the "prod preflight" sub-test, 1/4, completed) | ≈46m43s (well past the point attempt 12 reached; plausibly through some or all of the 3 route-batch `test()` blocks) |
| Failure annotation | `"The operation was canceled."` | `"The hosted runner lost communication with the server. Anything in your workflow that terminates the runner process, starves it for CPU/Memory, or blocks its network access can cause this error."` |
| Job log retrievable after the fact | Yes (used to build attempt 12's document) | No — `BlobNotFound` |

This run got **materially further** than attempt 12 before failing, and failed for a **different, more specific, GitHub-attributed reason** — not "someone/something called the cancel API," but "the runner itself stopped answering the Actions control plane," with GitHub's own message pointing at CPU/memory starvation or network blockage on the runner as the likely mechanism.

---

## 3. Root-Cause Investigation

Per-step GitHub Actions API data (`gh api repos/CzechowskiT/twin/actions/jobs/85004216900`) shows the canonical command step (`number: 17`) and every step after it (`18`–`21`, `41`–`42`, all of which are `if: always()` or unconditional) stuck at `status: "in_progress"` / `"pending"` with `completed_at: null` and `conclusion: null` — even though the **job** itself is `status: "completed"`, `conclusion: "failure"`. This is the identical structural signature to attempt 12 (§3 of that document): a job-level stop that prevents every subsequent step, including the `if: always()` diagnostics-upload and heartbeat-persistence steps this task added specifically to survive that scenario, from ever executing or recording a conclusion.

**What is new this time — a concrete GitHub-provided annotation:**

```
gh api repos/CzechowskiT/twin/check-runs/85004216900/annotations
→ [{
    "annotation_level": "failure",
    "title": "",
    "message": "The hosted runner lost communication with the server. Anything in
                your workflow that terminates the runner process, starves it for
                CPU/Memory, or blocks its network access can cause this error.",
    "raw_details": ""
  }]
```

Compare with attempt 12's job (`84972879623`), whose only `failure`-level annotation was the generic:

```
gh api repos/CzechowskiT/twin/check-runs/84972879623/annotations
→ [..., {"annotation_level":"failure","title":"","message":"The operation was canceled.","raw_details":""}]
```

**Investigation performed (this task):**
- Confirmed via `gh run list --limit 10` that no other `gate-e-phase3b-manual` run, and no concurrent `smoke.yml` run, overlapped this run's ≈49-minute window.
- Confirmed via `gh api .../artifacts` that zero artifacts exist on this run (empty array), matching attempt 12's "upload step never ran" pattern.
- Attempted to retrieve the job's raw log twice (`gh run view --log`, `gh api .../jobs/85004216900/logs`, 20s apart) — both returned `BlobNotFound` from GitHub's log storage. This means even the `[gate-e-heartbeat]` lines this task's own attempt-12 hardening added (which are plain `echo`/`console.log` output, streamed live by GitHub Actions as the job runs) **cannot be recovered after the fact** for this specific run, because the log archive for a job that ends via a runner-communication loss is never finalized to blob storage — a gap this task did not anticipate when designing the attempt-12 hardening (that hardening assumed live-streamed logs would remain retrievable after completion; that assumption does not hold for this failure mode).
- Confirmed this run's failure annotation ("lost communication... starves it for CPU/Memory... blocks its network access") is GitHub's own diagnostic text, not an inference by this task — it is the standard message GitHub Actions attaches when a self-hosted or GitHub-hosted runner process stops responding to the Actions service's heartbeat protocol, distinct from the generic "operation was canceled" text GitHub attaches to an explicit external cancel-API call (confirmed by comparing the two runs' annotations directly, above).
- **Most plausible engineering hypothesis (not confirmed, no resource-metrics API exists for hosted runners):** the Phase 3B controlled-multitab harness opens multiple concurrent browser tabs/contexts inside a single Chromium instance across three serial 7+7+6-route batches; on a standard GitHub-hosted `ubuntu-latest` runner, sustained multi-tab Chromium memory/CPU pressure over a ~46-minute window is a more specific and more plausible root cause for "runner lost communication" than a random external cancellation. This is a hypothesis, not a proven cause — GitHub does not expose CPU/memory telemetry for hosted runners via the REST API available to this task.

**Conclusion:** this is **not** `PRECONDITION_FAILED` (every scripted precondition passed), **not** `ABORTED_RESOURCE_SAFETY` in the sense used for the founder Mac (this is still the ephemeral isolated runner — no shared-host ambiguity), and **not** the same failure mode as attempt 12's `RUNNER_CANCELLED` (different GitHub-provided annotation, different and much longer time-to-failure). This document introduces **`RUNNER_LOST_COMMUNICATION`** as a new, more specific sub-classification: a job-level stop attributable, per GitHub's own diagnostic text, to the runner's health/communication rather than an external cancel action.

---

## 4. Routes Evaluated

**0/20 confirmed.** No diagnostics artifact, no `frontend/.diagnostics/gate-e-attempt-status.json`, and no retrievable job log exist for this run, so the exact route-batch progress cannot be confirmed even though the canonical command ran long enough (≈46m43s) to plausibly have started or completed some route batches. This is scored conservatively as **0/20 confirmed** (not "0/20 executed") — the honest position is "unknown route-level progress, no evidence survives," which is worse for forensics than attempt 12 (where the log at least proved exactly 1/4 sub-tests passed) but not worse for the product claim itself: **no new route-level PASS or FAIL evidence exists either way.** The prior 0/20 `BLANK_OR_NO_CONTENT` FAIL (2026-06-28) is unchanged.

---

## 5. Process / Resource State

| Check | Result |
|---|---|
| Runner class | Ephemeral, single-purpose `ubuntu-latest` GitHub-hosted VM — destroyed after the run regardless of outcome |
| Founder Mac involvement | **None** — no local Playwright, no local browser, no local process of any kind for this attempt |
| `TWIN_ACCESS_TOKEN` | Never printed, logged, or committed in any evidence available to this task; only referenced via `secrets.TWIN_ACCESS_TOKEN` in the workflow source, unchanged from attempt 12 |
| Production mutation | **None** — every prod-facing request made before the canonical command (public-health poll, HTTP smoke) was read-only `GET`; the canonical command itself is also read-only navigation (`page.goto`), unchanged from prior attempts |
| Concurrent workflow runs | **None** — confirmed via `gh run list` |
| Job log | **Not retrievable** (`BlobNotFound`) — this attempt exposes a residual forensic gap in the attempt-12 heartbeat hardening: heartbeats survive *while the job is running* (visible live via `gh run watch`) but are not guaranteed retrievable *after* a runner-communication-loss ending, because the log blob itself may never finalize |

---

## 6. Recommendation — Attempt 14 and Follow-Up

Consistent with the established discipline in this repository (no attempt auto-retries; every attempt requires its own separate, explicit founder authorization — see attempts 7 through 13), **this document does not authorize or trigger a further dispatch.**

1. A separate, explicit founder **"Gate E attempt 14 (isolated runner, fourth dispatch) = YES?"** authorization is required before any further dispatch.
2. **This is the second consecutive isolated-runner dispatch (attempts 12 dispatch 2 and 13) to end without route-level evidence at the infrastructure level — but via two distinct, GitHub-attributed mechanisms** (an external cancel vs. a runner communication/health loss), not a repeat of the identical failure. Per attempt 12's own escalation criterion ("if a future dispatch is also cancelled in the same way, that would be a stronger signal of a systemic issue"), the literal condition (same mechanism repeating) is **not** met — but two different infrastructure-level non-completions in a row on the same workflow is still worth flagging as a pattern, not dismissing as two independent one-off noise events.
3. **Two concrete, low-risk next steps this task did not implement (require separate authorization/scoping, both docs/CI-config-only, no backend/API/auth/DB/env):**
   - Consider a larger GitHub-hosted runner size (e.g. `ubuntu-latest-4-cores` or similar, if available on this plan) for the canonical-command step only, to reduce the plausibility of CPU/memory-starvation-induced communication loss during multi-tab Chromium execution.
   - Extend the attempt-12 heartbeat hardening so that `frontend/.diagnostics/gate-e-attempt-status.json` is pushed *out of the runner* incrementally (e.g. as a lightweight external HTTP call to a scratch endpoint, or a mid-run partial-artifact upload) rather than relying solely on the end-of-job `if: always()` artifact-upload step and the GitHub Actions log archive — both of which this attempt proved can be lost together when the runner itself stops communicating, not just when a step is externally cancelled.
4. No code changes are indicated by this attempt's failure mode as a required fix — the harness, watchdog, and preconditions all behaved correctly for the ≈46m43s they were observed running. The `RUNNER_LOST_COMMUNICATION` classification is scoped as **infrastructure-level and inconclusive**, not a reproducible product defect this task's diff surface (docs-only) can or should fix.

---

## Execution Record

```
Gate E Phase 3B Attempt 13 — RUNNER_LOST_COMMUNICATION / INCONCLUSIVE
====================================================================
Founder authorization:      YES (task framing) — confirm_gate_e=yes, confirm_prod_smoke=yes,
                             confirm_no_launch_go=yes
Runner:                     Isolated GitHub Actions workflow_dispatch (gate-e-phase3b-manual.yml)
                             ubuntu-latest, ephemeral, single-purpose — NOT the founder Mac

Dispatch:
  run_id:                   28661876288
  run_url:                  https://github.com/CzechowskiT/twin/actions/runs/28661876288
  branch:                   cursor/phase1-monorepo-scaffold
  head_sha:                 713e5c3b18973985ddb047fb1960559889071df1 (PR #375)

Preconditions (all PASS):
  public-health:             10/10 x HTTP 200, status=ok, db_ok=true
  HTTP smoke:                10/10 x HTTP 200 (10 routes)
  static preflight guards:   PASS (tsc, resource-watchdog, controlled-multitab inventory,
                              isolated-runner guard, local-execution-blocked guard)
  workers=1/retries=0:       confirmed source-level, unchanged
  pre-run cleanup / orphan check: PASS — dispatch-1 (attempt 12) false positive NOT reproduced

Canonical prod command:      STARTED at 12:56:28Z, ran ~46m43s (far past attempt 12's ~4m21s),
                              job ENDED (conclusion: failure) at 13:43:11Z with the canonical
                              step and every step after it stuck at in_progress/pending —
                              no step ever recorded its own success/failure/cancelled/timed_out
Routes evaluated:            0/20 CONFIRMED (unknown actual progress — no diagnostics artifact,
                              no retrievable job log)
.diagnostics artifacts:      0 (Upload step never ran; confirmed via API — empty artifact list)
Job log:                     UNAVAILABLE (BlobNotFound, confirmed twice)

Root cause investigation:
  Failure annotation (this run):      "The hosted runner lost communication with the server.
                                        ...terminates the runner process, starves it for
                                        CPU/Memory, or blocks its network access..."
  Failure annotation (attempt 12):    "The operation was canceled." (different, generic-cancel text)
  Concurrent/racing workflow run found: NO
  Scripted precondition failure:        NO (all passed)
  Shared-host resource-safety ambiguity: NO (ephemeral isolated runner)
  Same failure mechanism as attempt 12: NO — different GitHub-provided annotation, ~11x longer
                                        time-to-failure; introduces new classification
                                        RUNNER_LOST_COMMUNICATION distinct from RUNNER_CANCELLED

Explicit non-claims:
  Product FAIL:    NOT CLAIMED — no confirmed route-level result was produced
  Phase 3B PASS:   NOT CLAIMED
  P0 stance:       OPEN
  Launch stance:   NO-GO
  Gate F:          PENDING
  Phase 3B (overall): FAIL (prior 0/20 from 2026-06-28 unchanged — this attempt adds no new
                     confirmed route-level evidence in either direction)
  Attempt 14:      NOT authorized, NOT run by this document — requires a separate, explicit
                     founder "Gate E attempt 14 = YES?" decision
```

---

## Hard Bans Honoured (this run)

| Ban | Honoured |
|---|---|
| NO local Playwright/Phase3B/browser on Mac | Confirmed — 100% isolated GitHub Actions runner, zero local execution |
| NO token exposure | Confirmed — token sourced via `secrets.TWIN_ACCESS_TOKEN`; no token value appears in any evidence retrieved by this task |
| NO prod mutation | Confirmed — every retrievable prod-facing request (public-health poll, HTTP smoke) was read-only `GET` |
| NO backend/API/auth/DB/env changes | Confirmed — this task's diff is `docs/` + one optional static guard + `package.json` script registration only |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 CLOSED | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| NO attempt 14 execution or authorization | **Not run, not authorized** by this document |
| Minimal docs | Confirmed — this result doc, one optional static guard, one evidence-index update |

---

## Explicit Non-Claims

- **Phase 3B prod attempt 13:** **DID NOT COMPLETE** — job ended at the infrastructure level (runner lost communication, per GitHub's own annotation), after all preconditions passed, ≈46m43s into the canonical command
- **Product conclusion:** **INCONCLUSIVE** — not a confirmed route-level PASS or FAIL determination
- **Phase 3B (overall):** **FAIL** — prior 0/20 from 2026-06-28 unchanged; this attempt adds no new confirmed route-level evidence
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Attempt 14:** **NOT authorized, NOT run** by this document — requires a separate, explicit founder authorization

**Public launch: NO-GO · P0: OPEN · Gate E: YES/FAIL (prior 0/20) · Gate E attempt 13 (run 28661876288): RUNNER_LOST_COMMUNICATION/INCONCLUSIVE (all preconditions passed; job ran ~46m43s into the canonical command, far past attempt 12's ~4m21s, then ended with a GitHub-provided "runner lost communication... CPU/Memory... network" annotation — distinct from attempt 12's generic "operation was canceled"; 0/20 routes confirmed; no artifacts, no retrievable job log) · Phase 3B: FAIL (0/20 unchanged) · Gate F: PENDING · Attempt 14: requires separate founder authorization, NOT AUTHORIZED, NOT RUN**
