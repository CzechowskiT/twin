# Phase 3B macOS Process Detection — 2026-07-03

**Status:** **HARNESS PATCH + STATIC TESTS ONLY — NO BROWSER RUN, NO PHASE 3B EXECUTION, NO PROD MUTATION**
**Purpose:** Fix the process-detection gap surfaced by [attempt 10](./gate-e-phase3b-attempt10-result-2026-07-03.md): cleanup reported `chrome-headless-shell=0` while the operator observed real Chrome/Chromium memory pressure — the watchdog's detection was too narrow (name-only, single process name) to see it, and any fix that simply widens name-based `pkill` risks killing the operator's own, unrelated Chrome browser. This document and its accompanying code close both problems together.
**This document does not authorize attempt 11, does not run Playwright, Phase 3B, or any browser/Chrome process, and does not touch backend/API/auth/DB/env/`smoke.yml`.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**

**Related:** [attempt 10 result](./gate-e-phase3b-attempt10-result-2026-07-03.md) · [attempt 9 result](./gate-e-phase3b-attempt9-result-2026-07-02.md) · [resource watchdog](./PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md) · [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Why This Exists

The [Phase 3B resource watchdog](./PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md) shipped 2026-07-03 to close the "no automated resource guard" gap that forced attempt 9's manual pre-run abort. It detected exactly one process name: `chrome-headless-shell`.

During [attempt 10](./gate-e-phase3b-attempt10-result-2026-07-03.md), the operator manually aborted the run again — this time reporting that `chrome-headless-shell` count was correctly `0` at the point of cleanup, **but they visually observed real Chrome/Chromium memory pressure on the host** (Activity Monitor / system pressure, not this watchdog's own counters). Two independent problems were exposed:

1. **Detection was too narrow.** `chrome-headless-shell` is only one of several process names a Chromium-family browser can run under on macOS. A Playwright run using a different channel (`chromium`, `chrome`, or a `Google Chrome for Testing` build) spawns `Chromium`, `Google Chrome Helper`, `Google Chrome Helper (Renderer)`, `Google Chrome Helper (GPU)`, `Google Chrome Helper (Plugin)`, or `Google Chrome for Testing` — **none of which the watchdog was counting at all**. The watchdog could legitimately report `0` while a real, uncounted process family was under load.
2. **Naively widening detection is unsafe.** `Google Chrome Helper (Renderer)` is exactly the process name **ordinary, everyday Google Chrome** uses for each of its own tabs. If the fix were "widen the `pkill -f` pattern to also match these names," it would risk terminating the **operator's own, unrelated browser tabs** the next time cleanup ran — a strictly worse outcome than the original narrow-but-safe behavior.

This document's fix addresses both together: **broaden what is *detected/reported*, but narrow what is ever *killed* to a provably-owned process tree.**

---

## 2. What Shipped

| Component | File | Purpose |
|---|---|---|
| Widened detection patterns | `frontend/e2e/helpers/phase3b-resource-watchdog.ts` — `PHASE3B_ALL_CHROME_FAMILY_PATTERNS` | `chrome-headless-shell`, `Chromium`, `Google Chrome Helper` (+ Renderer/GPU/Plugin variants), `Google Chrome for Testing` — everything a Playwright-launched Chromium-family browser can be named on macOS |
| Ownership-tree tracking | `getOwnedProcessTree(rootPid)` | Recursive `pgrep -P` child-PID walk from a known Playwright browser PID — the only way any of the ambiguous names above is ever eligible for cleanup |
| Ownership assessment | `assessChromeProcessOwnership(browserPid)` | Classifies every detected Chrome-family process as **owned** (proven descendant of `browserPid`) or **unowned** (everything else — including a real daily-driver Chrome); returns `NEEDS_MANUAL_REVIEW` whenever `browserPid` is unknown or unowned matches exist |
| Scoped cleanup | `cleanupOwnedChromeProcesses(browserPid)` | Kills **only** `report.ownedPids`, via `process.kill(pid, "SIGTERM")` — never `pkill` by an ambiguous name |
| Before/after reporting | `Phase3bResourceWatchdogHandle.captureOwnershipSnapshot()` / `getOwnershipReport()` | Lets the spec log the owned-PID-tree state before and after cleanup |
| Spec wiring | `frontend/e2e/phase3b-controlled-multitab.spec.ts` — `tryGetBrowserPid()`, `resourceWatchdog.setBrowserPid()`, `test.afterAll` snapshot write | Best-effort late-binds the real Playwright browser PID once the `browser` fixture resolves, and always writes a final ownership snapshot to `.diagnostics/phase3b-process-ownership-final.json` |
| Static guard | `frontend/scripts/phase3b-resource-watchdog.test.ts` (`npm run test:phase3b-resource-watchdog`) | Proves the above, including that no ambiguous name is ever passed to `pkill` |

### 2.1 Detection vs. cleanup — the core distinction

| | Before (2026-07-03 watchdog) | After (this hardening) |
|---|---|---|
| **Detected** | `chrome-headless-shell` only | `chrome-headless-shell`, `Chromium`, `Google Chrome Helper` (+3 variants), `Google Chrome for Testing` |
| **Killed by name** | `pkill -f chrome-headless-shell` | Unchanged — still the only name-based kill, because it is the only name no ordinary user process is ever given |
| **Killed by PID tree** | N/A | Only PIDs proven to descend from a known Playwright `browser.process()?.pid` (`getOwnedProcessTree`) |
| **Ambiguous match, ownership unproven** | N/A (not detected) | Reported as `NEEDS_MANUAL_REVIEW` with process names + PIDs; **never killed** |
| **Plain `Google Chrome` (the app itself, not a Helper)** | Not detected, not touched | Still not detected, still never touched, by design (§3) |

### 2.2 Known limitation — `browser.process()` is not part of Playwright Test's public `Browser` type

Playwright Test's `browser` fixture type does not expose the underlying OS process (`browser.process()` exists only on `BrowserServer`/`ElectronApplication`, not the `Browser` a test receives). `tryGetBrowserPid()` reads it defensively off the runtime object when present and returns `null` otherwise. **This means ownership may legitimately be unprovable even during a real run** — in that case the watchdog and `assessChromeProcessOwnership(null)` correctly report `NEEDS_MANUAL_REVIEW` rather than guessing, and no ambiguous-name process is ever killed. This is a known, explicit limitation, not a gap papered over.

---

## 3. Never Kill User Chrome — the Explicit Rule

- `PHASE3B_SAFE_KILL_PROCESS_PATTERNS = ["chrome-headless-shell"]` is the **only** name ever passed to `pkill -f`. No ordinary user process (including a real daily-driver Chrome/Chromium) is ever named this.
- Every other detected name (`PHASE3B_AMBIGUOUS_CHROME_PROCESS_PATTERNS`) is **never** passed to `pkill`. It is only ever terminated PID-by-PID, and only for PIDs already proven (via `getOwnedProcessTree`) to descend from a specific, known Playwright browser process.
- Plain `Google Chrome` (the browser application process itself, as opposed to its `Helper` children) is not in either pattern list at all — it is never a detection target, let alone a kill target.
- `assertResourceSafeToStart()` (the pre-run refusal gate) was deliberately **not** widened to also refuse to start merely because ambiguous Chrome-family processes exist on the host — an operator having their own Chrome open is normal, not evidence of a leftover run, and must never block a legitimate attempt.
- When ownership cannot be proven (`browserPid` unavailable, or unowned matches exist alongside owned ones), the status is `NEEDS_MANUAL_REVIEW` and the report lists process names + PIDs for a human to review — this is the "exception queue," not automated force-kill.

---

## 4. What This Does Not Do

- **Does not authorize attempt 11.** See [attempt 10 result](./gate-e-phase3b-attempt10-result-2026-07-03.md) §5 — attempt 11 remains **BLOCKED** until this fix is merged **and** a separate, explicit founder authorization is obtained.
- **Does not run Playwright, Phase 3B, or any browser.** Every check in this document and its static guard is a source-code assertion or a read-only `pgrep`/`ps` call against whatever processes already exist on the machine at test time.
- **Does not change the application-level concurrency ceiling** proven by the [attempt 7 execution guarantee](./GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md).
- **Does not touch backend/API/auth/DB/env/`smoke.yml`.**
- **Does not mutate anything in production.**

---

## 5. Verification Performed

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Static guard suite | `npm run test:phase3b-resource-watchdog` | extended with attempt-10 hardening tests, no browser |
| Attempt 9 static guard (unaffected) | `npm run test:gate-e-attempt9-result` | unchanged, still PASS |
| Attempt 7 execution guarantee (unaffected) | `npm run test:gate-e-attempt7-execution-guarantee` | unchanged, still PASS |
| Launch readiness evidence guard | `npm run test:launch-readiness-evidence-guard` | still PASS after minimal evidence-index update |
| Readiness consistency lock | `npm run test:readiness-consistency-lock` | unaffected — no attempt-10/11 docs are in its guarded key-doc set |
| Frontend build | `npm run build` | succeeds |
| `smoke.yml` | grep for `playwright test` / `phase3b-controlled-multitab` | 0 matches — unchanged, browser still disabled by default in CI |

No Playwright browser was launched, no Chrome-family process was spawned by this task, and no Phase 3B route was evaluated to produce this document.

---

## 6. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO Playwright run | Confirmed — only static checks and read-only `pgrep`/`ps` calls |
| NO Gate E Phase 3B prod execution | Confirmed — 0 routes evaluated |
| NO browser/Chrome processes launched by this task | Confirmed |
| NO attempt 11 | Confirmed — not run, not authorized by this document |
| NO prod mutation | Confirmed — no network calls to prod were made |
| NO backend/API/auth/DB/env/`smoke.yml` changes | Confirmed — diff limited to `frontend/e2e/`, `frontend/scripts/`, `frontend/package.json`, and `docs/` |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |
| Never kill user Chrome unless confidently owned | Confirmed — see §3; static guard test 34 proves `pkill` is never called with an ambiguous name |

---

## Explicit Non-Claims

- **Attempt 11:** **NOT authorized, NOT run** by this document — still requires a separate, explicit founder decision
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this document adds no route-level evidence in either direction
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Default CI browser:** **DISABLED** (`smoke.yml` unchanged)

**Public launch: NO-GO · P0: OPEN · Phase 3B: FAIL (prior 0/20, unchanged) · Gate F: PENDING · macOS process detection: hardened, ownership-scoped, statically verified · Attempt 11: still requires a merged fix AND separate founder authorization, NOT AUTHORIZED, NOT RUN**
