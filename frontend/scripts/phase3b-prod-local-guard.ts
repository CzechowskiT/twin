/**
 * Phase 3B local execution guard — 2026-07-03.
 *
 * BLOCKS ALL local execution of the Phase 3B controlled-multitab harness
 * (prod and browser variants alike — both ultimately drive
 * `e2e/phase3b-controlled-multitab.spec.ts`) before Playwright is ever
 * imported or a browser is ever launched. The founder Mac is retired as a
 * Phase 3B execution host — see
 * docs/PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md and
 * docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md.
 *
 * The ONLY execution path for Gate E Phase 3B is the isolated,
 * `workflow_dispatch`-only GitHub Actions workflow:
 * .github/workflows/gate-e-phase3b-manual.yml.
 *
 * This file MUST NOT import "@playwright/test" or any Playwright module, and
 * MUST NOT be imported by anything that could trigger a browser launch as a
 * side effect. It is invoked as a standalone CLI step, first in the npm
 * script chain, via `npx --yes tsx scripts/phase3b-prod-local-guard.ts`.
 */

export const PHASE3B_LOCAL_EXECUTION_DISABLED_MESSAGE =
  "Local Phase 3B execution is disabled. Use the GitHub Actions workflow.";

/** The only workflow this guard recognizes as an authorized Phase 3B execution host. */
export const PHASE3B_AUTHORIZED_WORKFLOW = "gate-e-phase3b-manual";

/**
 * Returns true only when running inside the isolated GitHub Actions runner.
 * `GITHUB_ACTIONS` is set to the literal string `"true"` by every GitHub
 * Actions job automatically — it cannot be set by a local shell without the
 * operator deliberately faking a CI environment, which is out of scope for
 * this guard (this is a workflow-discipline guard, not a security boundary).
 *
 * Optional stricter check: when `GITHUB_WORKFLOW` is present (as it always is
 * on a GitHub-hosted runner), it must match the isolated Gate E Phase 3B
 * runner's workflow name. `GITHUB_WORKFLOW` is normally unset outside CI, so
 * this never blocks a genuine local shell for the wrong reason.
 */
export function isAuthorizedPhase3bExecutionEnvironment(env: NodeJS.ProcessEnv): boolean {
  if (env.GITHUB_ACTIONS !== "true") return false;
  if (env.GITHUB_WORKFLOW && env.GITHUB_WORKFLOW !== PHASE3B_AUTHORIZED_WORKFLOW) return false;
  return true;
}

export function assertPhase3bLocalExecutionAllowed(env: NodeJS.ProcessEnv): void {
  if (!isAuthorizedPhase3bExecutionEnvironment(env)) {
    // eslint-disable-next-line no-console -- deliberate operator-facing message, exact text required
    console.error(PHASE3B_LOCAL_EXECUTION_DISABLED_MESSAGE);
    process.exit(1);
  }
}

// Module-scope execution: this guard must run to completion (allow, or exit(1))
// the moment this file is invoked — no test runner, no deferred call, nothing
// else must happen first. This is what makes it safe to place first in the
// npm script chain, before Playwright is ever imported.
assertPhase3bLocalExecutionAllowed(process.env);
