# Phase 3B — Local Execution Disabled — 2026-07-03

**Status:** **HARD BLOCK SHIPPED — local Phase 3B execution on the founder Mac (or any non-GitHub-Actions machine) is no longer possible, by any path.**
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**
**Related:** [isolated runner plan](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md) · [attempt 11 result](./gate-e-phase3b-attempt11-result-2026-07-03.md) · [attempt 10 result](./gate-e-phase3b-attempt10-result-2026-07-03.md)

---

## 1. Why

Eleven chronological Gate E Phase 3B prod attempts ran (or tried to run) on the founder's local Mac (see [isolated runner plan §1](./GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md#1-why-the-founder-mac-is-retired-for-phase-3b) and [attempt 11 result](./gate-e-phase3b-attempt11-result-2026-07-03.md)). None were stopped by a genuine product defect — every stop was a **host** condition (resource pressure, process-detection ambiguity, battery power, shared-machine Chrome noise). Warnings and opt-in env-var gates were not sufficient: attempt 11 shows the harness can still be launched locally even with a resource watchdog and ownership-scoped detection in place. **The fix is a hard block, not another warning.**

From this point forward, **every** local invocation of the Phase 3B controlled-multitab harness — prod or browser variant, via `npm run`, or by invoking Playwright directly — exits immediately with:

```
Local Phase 3B execution is disabled. Use the GitHub Actions workflow.
```

**before Playwright is ever imported and before any browser process is launched.** The only execution path is the isolated, `workflow_dispatch`-only GitHub Actions workflow: [`.github/workflows/gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml).

---

## 2. Every Execution Path Found, and How Each Is Now Blocked

| # | Path | Before this task | After this task |
|---|------|-------------------|------------------|
| 1 | `npm run test:phase3b-controlled-multitab-prod` (`frontend/package.json`) | Ran if `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` + `PHASE3B_RESOURCE_WATCHDOG=1` were set — no CI/host check | **Hard blocked.** Chains `npx --yes tsx scripts/phase3b-prod-local-guard.ts` first; exits 1 with the exact message unless `GITHUB_ACTIONS==='true'` |
| 2 | `npm run test:phase3b-controlled-multitab-browser` (`frontend/package.json`) | Ran if `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1` **or** `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` — the latter meant this "browser" script could also be used to reach prod, bypassing the `-prod` script's own gates entirely | **Hard blocked** — same guard chained first, closing the `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`-via-browser-script loophole |
| 3 | `npm run test:phase3b-controlled-multitab-browser:raw` (`frontend/package.json`) | Ran Playwright directly (`playwright test e2e/phase3b-controlled-multitab.spec.ts --workers=1`) with **no gate at all** — anyone who knew this script existed could call it directly and skip every check in #1/#2 | **Hard blocked** — the guard is chained on the `:raw` script itself, so there is no way to reach Playwright through *any* npm script name without passing the guard first |
| 4 | Direct `npx playwright test e2e/phase3b-controlled-multitab.spec.ts` (bypassing npm entirely) | Not gated by any npm script guard, since npm scripts are never consulted for a direct `playwright test` invocation | **Hard blocked** — a module-scope check was added to the top of `frontend/e2e/phase3b-controlled-multitab.spec.ts` itself: `if (process.env.GITHUB_ACTIONS !== "true") { console.error(...); process.exit(1); }`, evaluated at module load, before any `test()` registers and before any browser/context/page fixture is created |
| 5 | `npx playwright test` (whole-suite run, no path filter) | Would have attempted to load and run every spec in `frontend/e2e/`, including `phase3b-controlled-multitab.spec.ts` | Same module-scope guard in #4 applies — that spec file alone refuses to load outside CI, regardless of how the Playwright CLI was invoked |
| 6 | Root `package.json` scripts | N/A | **N/A — no root-level `package.json` exists in this repo** (only `frontend/package.json`); confirmed by directory listing |
| 7 | Shell scripts (`*.sh`) | N/A | **N/A — no `.sh` script in the repo references `phase3b`** (confirmed by repo-wide search) |
| 8 | CI workflows other than the isolated runner | N/A | **N/A — `.github/workflows/smoke.yml` has never referenced Playwright or `phase3b-controlled-multitab`**, statically proven by `test:phase3b-controlled-multitab` test 6 and `test:gate-e-isolated-runner-guard` test 21 |
| 9 | Docs with copy-pasteable commands (e.g. prior `gate-e-phase3b-attempt*-result-*.md`, `GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md`, `PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md`) | Listed the canonical `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 ... npm run test:phase3b-controlled-multitab-prod` command as historical evidence | **Left as historical record (unchanged — they document what was run and when)**, but copy-pasting any of those commands today hits the hard block in #1 regardless of source; no doc anywhere instructs a fresh local run |
| 10 | GitHub Actions — `gate-e-phase3b-manual.yml` (`workflow_dispatch`) | Existed (prior partial work), ran the same `npm run test:phase3b-controlled-multitab-prod` command | **This is now the only path that can ever reach Playwright for this harness** — `GITHUB_ACTIONS` is set to `"true"` automatically by every GitHub Actions job, satisfying the guard |

---

## 3. What Actually Enforces the Block

| Component | File | Enforces |
|---|---|---|
| CLI guard | `frontend/scripts/phase3b-prod-local-guard.ts` | Standalone script, no Playwright import. Exits 1 with the exact required message unless `GITHUB_ACTIONS==='true'` (optionally, if `GITHUB_WORKFLOW` is set, it must equal `gate-e-phase3b-manual`). Chained first (`&&`) in `test:phase3b-controlled-multitab-prod`, `-browser`, and `-browser:raw`. |
| Spec-level guard | `frontend/e2e/phase3b-controlled-multitab.spec.ts` | Same check duplicated at module scope, immediately after imports, before `loadLocalTestEnv()` and before any `test()` registers — defense in depth against direct `playwright test` invocation. |
| Static guard #1 | `frontend/scripts/gate-e-isolated-runner-guard.test.ts` (`npm run test:gate-e-isolated-runner-guard`) | Proves the isolated workflow's trigger/confirmation/secret/env/timeout/artifact wiring, and that the three phase3b npm scripts chain the guard first — 23 tests, no browser. |
| Static guard #2 | `frontend/scripts/phase3b-local-execution-blocked.test.ts` (`npm run test:phase3b-local-execution-blocked`) | Proves the guard exists, is chained first, requires `GITHUB_ACTIONS`, and actually exits 1 with the exact message when spawned as a real (non-Playwright) subprocess without `GITHUB_ACTIONS` set — and exits 0 when it is set. No browser. |

---

## 4. Verification Performed (this task, no Playwright/browser)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` (frontend) | 0 errors |
| Guard exits 1 locally, exact message, before Playwright | `npm run test:phase3b-controlled-multitab-prod` (no `GITHUB_ACTIONS`) | Fails in < 0.5s with exactly `Local Phase 3B execution is disabled. Use the GitHub Actions workflow.` — no Playwright process, no `chrome-headless-shell` |
| Guard blocks even with other env vars set | `PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PHASE3B_RESOURCE_WATCHDOG=1 npm run test:phase3b-controlled-multitab-prod` | Same immediate failure |
| Browser variant also blocked | `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:phase3b-controlled-multitab-browser` | Same immediate failure |
| Guard passes in CI | `GITHUB_ACTIONS=true npx --yes tsx scripts/phase3b-prod-local-guard.ts` | Exits 0 |
| `test:gate-e-isolated-runner-guard` | `npm run test:gate-e-isolated-runner-guard` | 23/23 PASS |
| `test:phase3b-local-execution-blocked` | `npm run test:phase3b-local-execution-blocked` | PASS (new) |
| `test:phase3b-resource-watchdog` (unaffected) | `npm run test:phase3b-resource-watchdog` | 41/41 PASS, unchanged |
| `test:phase3b-controlled-multitab` (unaffected) | `npm run test:phase3b-controlled-multitab` | 16/16 PASS, unchanged |
| Frontend build | `npm run build` | succeeds |
| No browser process spawned | `ps aux \| grep -i chrome-headless-shell` | 0 matches throughout this task |

---

## 5. Hard Bans Honoured (this task)

| Ban | Honoured |
|---|---|
| NO Playwright run | Confirmed — only `tsc`/`tsx`/`node`/`npm run build` were executed; the guard scripts themselves never import Playwright |
| NO browser | Confirmed — 0 `chrome-headless-shell`/Chrome-family processes spawned by this task |
| NO Gate E execution | Confirmed — the isolated workflow is `workflow_dispatch`-only and was not triggered |
| NO deploy | Confirmed — no Vercel/Railway command run |
| NO backend/API/auth/DB changes | Confirmed — diff limited to `frontend/scripts/`, `frontend/package.json`, `frontend/e2e/phase3b-controlled-multitab.spec.ts` (guard only), `frontend/playwright.config.ts` (unchanged by this task), `.github/workflows/`, and `docs/` |
| NO Launch GO | Launch remains **NO-GO** |
| NO P0 closure | P0 remains **OPEN** |
| NO Gate F YES | Gate F remains **PENDING** |

---

## Explicit Non-Claims

- **Local Phase 3B execution:** **DISABLED** — every path in §2 verified hard-blocked
- **Attempt 11:** **USER_ABORTED**, 0/20 routes evaluated — see [attempt 11 result](./gate-e-phase3b-attempt11-result-2026-07-03.md)
- **Attempt 12+:** Not authorized, not run — can only ever run via the isolated GitHub Actions workflow, and still requires its own separate, explicit founder authorization
- **Phase 3B (overall):** **FAIL** — prior 0/20 unchanged; this task adds no new route-level evidence
- **Public launch:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**
- **Founder Mac:** retired as a Phase 3B execution host — not just discouraged, now technically incapable of running it

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING · Phase 3B: FAIL (prior 0/20, unchanged) · Local Phase 3B execution: DISABLED (all paths hard-blocked) · Attempt 11: USER_ABORTED (0/20 routes evaluated) · Founder Mac: retired for Phase 3B**
