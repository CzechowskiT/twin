# Gate E Phase 3B — Attempt 7 Safety Plan — 2026-06-29

**Status:** **PLANNING ONLY — NOT AUTHORIZED — NOT RUN**
**Purpose:** Define the resource-safety preconditions and execution constraints required before any Gate E Phase 3B attempt 7 is run, following [attempt 6's `ABORTED_RESOURCE_SAFETY`](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md).
**This document does not authorize attempt 7.** It does not run Phase 3B, Playwright, or any browser. It changes no backend/API/auth/DB/env code.
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [attempt 6 abort](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) · [attempt 5 result](./gate-e-phase3b-attempt5-with-token-result-2026-06-29.md) · [attempt 1 abort](./gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why This Plan Exists

Two of eight Gate E Phase 3B prod attempts have now been aborted for **local resource safety** rather than reaching a route-level result:

- **Attempt 1** — [ABORTED_RESOURCE_SAFETY](./gate-e-phase3b-attempt-1-aborted-resource-safety-2026-06-28.md) — elevated WindowServer/renderer CPU during static preflight, stopped before the prod command ran at all.
- **Attempt 6** — [ABORTED_RESOURCE_SAFETY](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md) — multiple `chrome-headless-shell` instances saturated CPU with elevated `kernel_task` **during** the run, stopped mid-execution.

Both the `TWIN_ACCESS_TOKEN` loader (Slice 40, PR #360/#361) and the ESM/CommonJS harness load crash (PR #362, surfaced and fixed in attempt 5) are now fixed. Attempt 6 shows that fixing those two defects is **necessary but not sufficient** — a **third** class of failure (uncontrolled browser/process resource consumption) can still prevent route-level evidence from being produced. This plan exists to close that gap **before** any attempt 7 is authorized or run.

---

## 2. Attempt 7 Requires Separate Founder Authorization

**This document does not set Gate E attempt 7 = YES.** Per hard-ban discipline established across attempts 1–6, resuming a browser-dependent gate after an abort is never automatic.

**Exact next-founder question:**

> **"Gate E attempt 7 with resource-safety limits = YES?"**

Until the founder answers this question explicitly with **YES**, attempt 7 remains **NOT AUTHORIZED** and **must not be run**.

---

## 3. Preconditions Before Attempt 7 (Machine Resource Baseline)

All of the following must be verified **clean, immediately before** any attempt 7 browser invocation:

| # | Precondition | Verification |
|---|---------------|--------------|
| 1 | No `chrome-headless-shell` processes running | `pgrep -c chrome-headless-shell` == `0` |
| 2 | No orphan Playwright/npm test processes | `ps aux \| grep -E 'playwright\|phase3b'` returns no matches (besides the grep itself) |
| 3 | CPU idle high enough | `top -l 1 -n 0` / `uptime` load average at or near baseline for the machine, not already elevated before the run starts |
| 4 | Power connected | AC power confirmed connected (not running on battery alone) |
| 5 | No other heavy foreground work | No concurrent large builds, other browser automation, or video/screen-recording sessions running |
| 6 | Founder Gate E attempt 7 = YES | Explicit answer to the §2 question, obtained **before** starting |

**If any precondition fails:** do **not** start attempt 7. Wait for the resource condition to clear, or address the blocking process, then re-check all preconditions from the top.

---

## 4. Execution Constraints Attempt 7 Must Enforce

| # | Constraint | Detail |
|---|------------|--------|
| 1 | `workers=1` | Already enforced by `test:phase3b-controlled-multitab-browser:raw` (`playwright test e2e/phase3b-controlled-multitab.spec.ts --workers=1`) — **must remain** in place; do not override with a higher worker count |
| 2 | Hard cap on browser/page concurrency | Phase 3B batches are already bounded to **≤8 tabs per batch** (7+7+6 across 20 routes) per `PHASE3B_ALL_ROUTES`/`phase3b-controlled-routes.ts` — this cap must not be raised for attempt 7 |
| 3 | Explicit cleanup before the run | Re-run the §3 preconditions check immediately before invoking the canonical command |
| 4 | Explicit cleanup after the run | Whether the run PASSes, FAILs, or is aborted, verify `chrome-headless-shell` count returns to **0** and no orphan Playwright/npm processes remain before considering the attempt closed |
| 5 | No automatic retry | If attempt 7 also has to be aborted for any reason, it must be documented (attempt 8) — **no immediate re-run in the same session** |
| 6 | Stop on process-count anomaly | If, **during** the run, `chrome-headless-shell` process count exceeds what a single `workers=1` Playwright run is expected to spawn (i.e. more than one browser process actively driving the current batch), **stop immediately** — do not wait for the batch to finish |
| 7 | Stop on CPU/`kernel_task` runaway | If `kernel_task` or overall CPU climbs into sustained high-load territory (the same signal that triggered attempts 1 and 6) **during** the run, **stop immediately** — treat this the same as a route-level STOP condition, not something to wait out |

---

## 5. Harness Gap Check — Concurrency Cap Enforcement

Before attempt 7 is authorized, the harness itself must be confirmed capable of enforcing the constraints in §4, not merely relying on the operator to notice a problem after the fact:

| Check | If TRUE | If FALSE |
|-------|---------|----------|
| Does `test:phase3b-controlled-multitab-browser:raw` / `:prod` already pass `--workers=1` unconditionally (not overridable via env/CLI without editing `package.json`)? | Proceed — constraint already enforced at the script level | **Patch the harness first** — hard-code or guard `--workers=1` so a future invocation cannot accidentally run with higher concurrency |
| Does the Playwright config for this spec use a single browser context per batch (not one context per tab beyond the documented 7+7+6 cap)? | Proceed | **Patch the harness first** — bound context/page creation to the documented batch sizes before attempt 7 |
| Is there any existing timeout/kill-switch if the browser process count exceeds expected for a `workers=1` run? | Proceed with the manual §4.6 stop rule as a backstop | **Do not run attempt 7 relying on manual observation alone** — first add a lightweight automated guard (e.g. a wrapper that polls `chrome-headless-shell` count and aborts if it exceeds a small fixed threshold) before scheduling attempt 7 |

**If the current script cannot enforce the concurrency cap in an automated, verifiable way: do not run attempt 7.** Patch the harness first (a small, docs-and-tests-adjacent change, reviewed like any other harness fix), verify the patch statically, and only then bring the "Gate E attempt 7 with resource-safety limits = YES?" question back to the founder.

---

## 6. Hard Bans (Attempt 7 Planning and Execution)

| Ban | Scope |
|-----|-------|
| NO Launch GO | This plan does not change `LAUNCH_STANCE`; launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** regardless of attempt 7's eventual outcome |
| NO Gate F YES | Gate F remains **PENDING** |
| NO stress/CPU storm | Attempt 7 is a single controlled `workers=1` run, not a load/stress test |
| NO backend/API/auth/DB/env changes | Attempt 7 (and this planning document) touch frontend test harness, docs, and static guards only |
| NO automatic retry | Any attempt 7 abort requires a fresh, separately-authorized attempt 8 — never an automatic re-run |
| NO running Phase 3B / Playwright / any browser from this planning document | This document is planning-only; it does not execute attempt 7 |

---

## 7. What Happens After This Plan

1. This document is published for founder review alongside [attempt 6's abort record](./gate-e-phase3b-attempt6-resource-safety-abort-2026-06-29.md).
2. The founder is asked the exact §2 question: **"Gate E attempt 7 with resource-safety limits = YES?"**
3. If the harness gap check (§5) reveals any unenforced constraint, that is patched and statically verified **first**, independent of the founder's answer to §2.
4. Only once §2 = **YES** and §5 is fully green does an attempt 7 execution task get scheduled — as its own separate run, with its own separate documentation, following the same evidence-and-non-overclaim discipline as attempts 1–6.

---

## Explicit Non-Claims

- **Attempt 7:** **NOT authorized, NOT run** by this document
- **Phase 3B:** **FAIL** — prior 0/20 unchanged; attempt 6 produced no new route-level evidence
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Default CI browser:** **DISABLED**

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (attempt 6 NOT COMPLETED, INCONCLUSIVE) · Gate F: PENDING · Attempt 7: NOT AUTHORIZED**
