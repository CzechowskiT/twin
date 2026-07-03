/**
 * Phase 3B resource watchdog — static guards (2026-07-03), no browser.
 *
 * Proves, from the implementation, that production Phase 3B runs cannot
 * start without an explicit resource-safety opt-in and that the watchdog is
 * actually wired into the spec's preflight — not merely an unused helper —
 * closing the gap that forced attempt 9's manual pre-run abort (see
 * docs/gate-e-phase3b-attempt9-result-2026-07-02.md and
 * docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PHASE3B_RESOURCE_WATCHDOG_ENV_VAR,
  PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES,
  PHASE3B_WATCHDOG_MAX_RUN_MS,
  PHASE3B_WATCHDOG_POLL_MS,
  assertNoWatchdogViolation,
  assertResourceSafeToStart,
  countChromeHeadlessShellProcesses,
  countOrphanedPhase3bProcesses,
  createPhase3bResourceWatchdog,
  isProcessInspectionAvailable,
  killChromeHeadlessShellProcesses,
  requirePhase3bResourceWatchdogEnabled,
} from "../e2e/helpers/phase3b-resource-watchdog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const WATCHDOG_HELPER = "e2e/helpers/phase3b-resource-watchdog.ts";
const PHASE3B_SPEC = "e2e/phase3b-controlled-multitab.spec.ts";
const WATCHDOG_DOC = "docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md";
const SAFETY_PLAN_DOC = "docs/GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md";
const ATTEMPT9_RESULT = "docs/gate-e-phase3b-attempt9-result-2026-07-02.md";

test("1 env var constant is exactly PHASE3B_RESOURCE_WATCHDOG", () => {
  assert.equal(PHASE3B_RESOURCE_WATCHDOG_ENV_VAR, "PHASE3B_RESOURCE_WATCHDOG");
});

test("2 requirePhase3bResourceWatchdogEnabled is a no-op for non-prod runs", () => {
  assert.doesNotThrow(() => requirePhase3bResourceWatchdogEnabled(false, {}));
  assert.doesNotThrow(() => requirePhase3bResourceWatchdogEnabled(false, { PHASE3B_RESOURCE_WATCHDOG: "0" }));
});

test("3 requirePhase3bResourceWatchdogEnabled throws for prod runs without the env var set to '1'", () => {
  assert.throws(() => requirePhase3bResourceWatchdogEnabled(true, {}), /PHASE3B_RESOURCE_WATCHDOG=1/);
  assert.throws(
    () => requirePhase3bResourceWatchdogEnabled(true, { PHASE3B_RESOURCE_WATCHDOG: "0" }),
    /PHASE3B_RESOURCE_WATCHDOG=1/,
  );
  assert.throws(
    () => requirePhase3bResourceWatchdogEnabled(true, { PHASE3B_RESOURCE_WATCHDOG: "true" }),
    /PHASE3B_RESOURCE_WATCHDOG=1/,
  );
});

test("4 requirePhase3bResourceWatchdogEnabled does not throw for prod runs with the env var set to '1'", () => {
  assert.doesNotThrow(() => requirePhase3bResourceWatchdogEnabled(true, { PHASE3B_RESOURCE_WATCHDOG: "1" }));
});

test("5 process-count helpers return non-negative finite numbers (real pgrep call, read-only)", () => {
  const chromeCount = countChromeHeadlessShellProcesses();
  const orphanCount = countOrphanedPhase3bProcesses();
  assert.ok(Number.isFinite(chromeCount) && chromeCount >= 0);
  assert.ok(Number.isFinite(orphanCount) && orphanCount >= 0);
});

test("6 assertResourceSafeToStart does not throw when no chrome-headless-shell/phase3b processes are running", () => {
  // In this CI/dev environment no Phase 3B browser has been launched, so this
  // must pass without needing to mock child_process.
  assert.doesNotThrow(() => assertResourceSafeToStart());
});

test("7 killChromeHeadlessShellProcesses never throws, even with nothing to kill", () => {
  assert.doesNotThrow(() => killChromeHeadlessShellProcesses());
});

test("8 isProcessInspectionAvailable returns a boolean", () => {
  assert.equal(typeof isProcessInspectionAvailable(), "boolean");
});

test("9 watchdog handle: no violation immediately after creation; stop() is idempotent-safe", () => {
  const handle = createPhase3bResourceWatchdog({ pollMs: 60_000 });
  assert.equal(handle.getViolation(), null);
  assert.doesNotThrow(() => assertNoWatchdogViolation(handle));
  handle.stop();
  handle.stop();
});

test("10 watchdog detects a synthetic RUN_TIMEOUT_EXCEEDED violation and stops without throwing", async () => {
  let observed: unknown = null;
  const handle = createPhase3bResourceWatchdog({
    pollMs: 10,
    maxRunMs: 5,
    onViolation: (violation) => {
      observed = violation;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  handle.stop();
  assert.ok(observed, "expected onViolation to have fired");
  assert.equal((observed as { kind: string }).kind, "RUN_TIMEOUT_EXCEEDED");
  const violation = handle.getViolation();
  assert.ok(violation);
  assert.equal(violation!.kind, "RUN_TIMEOUT_EXCEEDED");
  assert.throws(() => assertNoWatchdogViolation(handle), /wall-clock budget/);
});

test("11 watchdog detects a synthetic PROCESS_COUNT_EXCEEDED violation via maxChromeHeadlessShellProcesses=-1", async () => {
  const handle = createPhase3bResourceWatchdog({ pollMs: 10, maxChromeHeadlessShellProcesses: -1 });
  await new Promise((resolve) => setTimeout(resolve, 100));
  handle.stop();
  const violation = handle.getViolation();
  assert.ok(violation);
  assert.equal(violation!.kind, "PROCESS_COUNT_EXCEEDED");
  assert.throws(() => assertNoWatchdogViolation(handle), /chrome-headless-shell process count/);
});

test("12 default thresholds are sane (bounded, below per-batch Playwright timeouts)", () => {
  assert.ok(PHASE3B_WATCHDOG_POLL_MS > 0 && PHASE3B_WATCHDOG_POLL_MS <= 30_000);
  assert.ok(
    PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES > 0 &&
      PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES < 1000,
  );
  assert.ok(PHASE3B_WATCHDOG_MAX_RUN_MS > 0 && PHASE3B_WATCHDOG_MAX_RUN_MS < 900_000);
});

test("13 helper never calls chromium.launch/newPage/newContext — inspection/cleanup only", () => {
  const helper = read(WATCHDOG_HELPER);
  assert.doesNotMatch(helper, /chromium\.launch\(|newPage\(|newContext\(/);
  assert.match(helper, /execFileSync\("pgrep"/);
  assert.match(helper, /execFileSync\("pkill"/);
});

test("14 spec imports and calls requirePhase3bResourceWatchdogEnabled at module scope (before any test runs)", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /import\s*\{[\s\S]*requirePhase3bResourceWatchdogEnabled[\s\S]*\}\s*from\s*"\.\/helpers\/phase3b-resource-watchdog"/);
  assert.match(spec, /^requirePhase3bResourceWatchdogEnabled\(IS_PROD\);$/m);
});

test("15 spec calls assertResourceSafeToStart and creates the watchdog only for prod runs", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /if \(IS_PROD\) \{\s*assertResourceSafeToStart\(\);\s*resourceWatchdog = createPhase3bResourceWatchdog\(\);/);
});

test("16 spec checks assertNoWatchdogViolation at least twice per batch (start and post-idle)", () => {
  const spec = read(PHASE3B_SPEC);
  const matches = spec.match(/assertNoWatchdogViolation\(resourceWatchdog\)/g) ?? [];
  assert.ok(matches.length >= 2, `expected at least 2 watchdog checkpoints per batch, found ${matches.length}`);
});

test("17 spec stops the watchdog in test.afterAll (always runs, pass or fail)", () => {
  const spec = read(PHASE3B_SPEC);
  assert.match(spec, /test\.afterAll\(\(\) => \{\s*resourceWatchdog\?\.stop\(\);\s*\}\)/);
});

test("18 npm script test:phase3b-controlled-multitab-prod refuses to run without PHASE3B_RESOURCE_WATCHDOG=1", () => {
  const pkg = read("package.json");
  assert.match(
    pkg,
    /"test:phase3b-controlled-multitab-prod":\s*"node -e \\"if\(process\.env\.PLAYWRIGHT_ALLOW_PROD_SMOKE!=='1'\)/,
  );
  assert.match(pkg, /PHASE3B_RESOURCE_WATCHDOG!=='1'/);
  assert.match(pkg, /Set PHASE3B_RESOURCE_WATCHDOG=1 to run production phase3b multitab/);
});

test("19 npm script test:phase3b-resource-watchdog is registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-resource-watchdog/);
  assert.match(pkg, /phase3b-resource-watchdog\.test\.ts/);
});

test("20 watchdog doc exists with an explicit closure of the attempt-7 execution-guarantee residual risk", () => {
  const doc = readRepo(WATCHDOG_DOC);
  assert.match(doc, /Phase 3B Resource Watchdog/i);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG/);
  assert.match(doc, /GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29/);
  assert.match(doc, /attempt 9/i);
  assert.match(doc, /attempt 10/i);
});

test("21 watchdog doc preserves hard bans — no overclaims", () => {
  const doc = readRepo(WATCHDOG_DOC);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.doesNotMatch(doc, /attempt 10.{0,60}(is authorized|now authorized)/i);
  assert.match(doc, /attempt 10.{0,60}(still requires|separate).{0,80}founder/i);
});

test("22 attempt 7 safety plan references the watchdog doc (traceability, residual risk closed)", () => {
  const plan = readRepo(SAFETY_PLAN_DOC);
  assert.match(plan, /Separate Founder Authorization/i);
  assert.match(plan, /PHASE3B_RESOURCE_WATCHDOG_2026-07-03/);
});

test("23 attempt 9 result doc's watchdog references match what actually shipped", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /phase3b-resource-watchdog\.ts/);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG/);
  assert.match(doc, /phase3b-resource-watchdog\.test\.ts/);
  const helper = readRepo("frontend/" + WATCHDOG_HELPER);
  assert.match(helper, /export function assertResourceSafeToStart/);
  const guardTest = readRepo("frontend/scripts/phase3b-resource-watchdog.test.ts");
  assert.ok(guardTest.length > 0);
});

test("24 smoke.yml unchanged — no Playwright, default CI browser still disabled", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("25 helper never logs/prints TWIN_ACCESS_TOKEN or process env contents wholesale", () => {
  const helper = read(WATCHDOG_HELPER);
  assert.doesNotMatch(helper, /console\.(log|error|info|warn)\(/);
  assert.doesNotMatch(helper, /ACCESS_TOKEN/);
});
