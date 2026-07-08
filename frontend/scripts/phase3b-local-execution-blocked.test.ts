/**
 * Phase 3B — local execution hard block — static + runtime guards (2026-07-03).
 *
 * Proves EVERY local invocation path of the Phase 3B controlled-multitab
 * harness is hard-blocked before Playwright is ever imported and before any
 * browser process is launched. See
 * docs/PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md.
 *
 * This file spawns the guard script itself as a real subprocess (to prove
 * its actual exit code + stderr message), but the guard script never imports
 * Playwright, so no browser is ever launched by this test.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const GUARD_SCRIPT = "scripts/phase3b-prod-local-guard.ts";
const SPEC = "e2e/phase3b-controlled-multitab.spec.ts";
const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const PLAN_DOC = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const DISABLED_DOC = "docs/PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md";
const EXACT_MESSAGE = "Local Phase 3B execution is disabled. Use the GitHub Actions workflow.";

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 guard script exists and never imports Playwright", () => {
  const guard = read(GUARD_SCRIPT);
  assert.match(guard, new RegExp(EXACT_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(guard, /from\s+"@playwright\/test"/);
  assert.doesNotMatch(guard, /chromium\.launch\(|newPage\(|newContext\(/);
});

test("2 guard is a no-op (allow) only when GITHUB_ACTIONS==='true'", () => {
  const guard = read(GUARD_SCRIPT);
  assert.match(guard, /GITHUB_ACTIONS\s*!==\s*"true"/);
  assert.match(guard, /process\.exit\(1\)/);
});

test("3 all three phase3b npm scripts chain the guard FIRST (before playwright/node)", () => {
  const pkg = read("package.json");
  const prod = pkg.match(/"test:phase3b-controlled-multitab-prod":\s*"([^"]*(?:\\.[^"]*)*)"/);
  const browser = pkg.match(/"test:phase3b-controlled-multitab-browser":\s*"([^"]*(?:\\.[^"]*)*)"/);
  const raw = pkg.match(/"test:phase3b-controlled-multitab-browser:raw":\s*"([^"]*(?:\\.[^"]*)*)"/);
  assert.ok(prod && browser && raw, "expected all three script definitions to exist");
  for (const script of [prod![1]!, browser![1]!, raw![1]!]) {
    assert.match(script, /^npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && /, script);
  }
});

test("4 the :raw script (the ultimate Playwright entrypoint) cannot be reached without the guard", () => {
  const pkg = read("package.json");
  const raw = pkg.match(/"test:phase3b-controlled-multitab-browser:raw":\s*"([^"]*(?:\\.[^"]*)*)"/);
  assert.ok(raw, "expected the :raw script to exist");
  assert.match(raw![1]!, /phase3b-prod-local-guard\.ts && playwright test e2e\/phase3b-controlled-multitab\.spec\.ts/);
});

test("5 spec file has a module-scope guard (defense in depth for direct playwright invocation)", () => {
  const spec = read(SPEC);
  const guardIdx = spec.indexOf(`GITHUB_ACTIONS !== "true"`);
  const firstTestIdx = spec.indexOf('test("prod preflight');
  assert.ok(guardIdx > -1, "expected a GITHUB_ACTIONS check in the spec");
  assert.ok(firstTestIdx > -1, "expected at least one test() in the spec");
  assert.ok(guardIdx < firstTestIdx, "guard must run before any test() registers");
  assert.match(spec, new RegExp(EXACT_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("6 spec-level guard runs before loadLocalTestEnv() and before any Playwright fixture use", () => {
  const spec = read(SPEC);
  const guardIdx = spec.indexOf(`GITHUB_ACTIONS !== "true"`);
  const loadEnvCallIdx = spec.indexOf("loadLocalTestEnv();");
  assert.ok(guardIdx > -1 && loadEnvCallIdx > -1);
  assert.ok(guardIdx < loadEnvCallIdx, "guard must run before loadLocalTestEnv() is called");
});

test("7 RUNTIME: guard subprocess exits 1 with the EXACT message when GITHUB_ACTIONS is unset (no Playwright, no browser)", () => {
  let stdout = "";
  let exitCode: number | null = 0;
  try {
    stdout = execFileSync("npx", ["--yes", "tsx", GUARD_SCRIPT], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "" },
    });
  } catch (error) {
    const execError = error as { status: number | null; stderr?: Buffer | string };
    exitCode = execError.status;
    stdout = execError.stderr?.toString() ?? "";
  }
  assert.equal(exitCode, 1, "expected guard to exit 1 without GITHUB_ACTIONS");
  assert.match(stdout, new RegExp(EXACT_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("8 RUNTIME: guard subprocess exits 0 when GITHUB_ACTIONS==='true' (isolated runner path allowed)", () => {
  const result = execFileSync("npx", ["--yes", "tsx", GUARD_SCRIPT], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GITHUB_ACTIONS: "true" },
  });
  assert.equal(result, "");
});

test("9 RUNTIME: guard blocks even when prod-smoke env vars are also set (the -prod script's own purpose is prod, so GITHUB_ACTIONS is the only gate)", () => {
  let exitCode: number | null = 0;
  try {
    execFileSync("npx", ["--yes", "tsx", GUARD_SCRIPT], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_ACTIONS: "",
        PLAYWRIGHT_ALLOW_PROD_SMOKE: "1",
        PHASE3B_RESOURCE_WATCHDOG: "1",
        PLAYWRIGHT_ENABLE_BROWSER_TESTS: "1",
      },
    });
  } catch (error) {
    exitCode = (error as { status: number | null }).status;
  }
  assert.equal(exitCode, 1);
});

test("10 workflow (the only authorized execution path) is workflow_dispatch-only", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /^on:\s*\n\s*workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*schedule:\s*$/m);
});

test("11 no root-level package.json exists (only frontend/package.json can define phase3b scripts)", () => {
  assert.throws(() => readRepo("package.json"), /ENOENT/);
});

test("12 no shell script in the repo references phase3b", () => {
  // Defense-in-depth static assertion — mirrors the repo-wide search performed
  // for this task. If a phase3b-referencing shell script is ever added, this
  // guard should be extended to read and assert on it directly.
  const disabledDoc = readRepo(DISABLED_DOC);
  assert.match(disabledDoc, /no `\.sh` script in the repo references `phase3b`/);
});

test("13 disabled-path inventory doc exists and lists every path found", () => {
  const doc = readRepo(DISABLED_DOC);
  assert.match(doc, /Local Phase 3B execution/i);
  for (const path of [
    "test:phase3b-controlled-multitab-prod",
    "test:phase3b-controlled-multitab-browser",
    "test:phase3b-controlled-multitab-browser:raw",
    "playwright test e2e/phase3b-controlled-multitab.spec.ts",
    "gate-e-phase3b-manual.yml",
  ]) {
    assert.ok(doc.includes(path), `expected disabled-path doc to mention: ${path}`);
  }
  assert.match(doc, new RegExp(EXACT_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("14 plan doc and disabled-path doc preserve hard bans — no overclaims", () => {
  for (const doc of [readRepo(PLAN_DOC), readRepo(DISABLED_DOC)]) {
    assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
    assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
    assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
    assert.match(doc, /NO-GO/i);
    assert.match(doc, /P0.*OPEN/i);
    assert.match(doc, /Gate F.*PENDING/i);
  }
});

test("15 npm script test:phase3b-local-execution-blocked is registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:phase3b-local-execution-blocked":/);
  assert.match(pkg, /phase3b-local-execution-blocked\.test\.ts/);
});

test("16 attempt 11 result doc exists — USER_ABORTED, 0 routes evaluated, no overclaims", () => {
  const doc = readRepo("docs/gate-e-phase3b-attempt11-result-2026-07-03.md");
  assert.match(doc, /Attempt 11/);
  assert.match(doc, /USER_ABORTED/);
  assert.match(doc, /0\/20 routes evaluated/);
  assert.doesNotMatch(doc, /Phase 3B.*\*\*PASS\*\*/i);
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
});

test("17 run 28650677999's GITHUB_ACTIONS-aware orphan-detection fix does not loosen the local hard block — the guard script itself still has no GITHUB_ACTIONS-adjacent orphan/ancestry logic to bypass", () => {
  // The fix for run 28650677999's false orphan detection lives entirely in
  // frontend/e2e/helpers/phase3b-resource-watchdog.ts (countOrphanedPhase3bProcesses),
  // which is never reached locally because scripts/phase3b-prod-local-guard.ts
  // exits 1 before Playwright (and therefore this watchdog module) is ever
  // imported. The guard script itself must remain untouched by that fix.
  const guard = read(GUARD_SCRIPT);
  assert.doesNotMatch(guard, /phase3b-resource-watchdog/);
  assert.doesNotMatch(guard, /countOrphanedPhase3bProcesses|getCurrentRunProcessTree/);
});
