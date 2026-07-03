/**
 * Gate E Phase 3B isolated GitHub Actions runner — static guard (no browser,
 * no workflow trigger, no prod request).
 *
 * Proves the manual-only `.github/workflows/gate-e-phase3b-manual.yml`
 * workflow is wired correctly — workflow_dispatch-only trigger, required
 * confirmation inputs, secret handling that never echoes the token value,
 * canonical Gate E Phase 3B prod env vars, a bounded job timeout, artifact
 * upload, and no Launch GO / Gate D / deploy claims — without ever running
 * the workflow itself. See docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const PLAN_DOC = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const SMOKE_WORKFLOW = ".github/workflows/smoke.yml";

const CANONICAL_PROD_ENV_PARTS = [
  "PHASE3B_RESOURCE_WATCHDOG",
  "PLAYWRIGHT_ALLOW_PROD_SMOKE",
  "PLAYWRIGHT_SKIP_WEBSERVER",
  "PLAYWRIGHT_BASE_URL: https://twin-sooty.vercel.app",
] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 workflow file exists and is named gate-e-phase3b-manual", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /name:\s*gate-e-phase3b-manual/);
});

test("2 workflow trigger is workflow_dispatch ONLY — no push/pull_request/schedule", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /^on:\s*\n\s*workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*schedule:\s*$/m);
});

test("3 workflow requires all three confirmation inputs", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /confirm_gate_e:/);
  assert.match(workflow, /confirm_prod_smoke:/);
  assert.match(workflow, /confirm_no_launch_go:/);
  const requiredMatches = workflow.match(/required:\s*true/g) ?? [];
  assert.ok(requiredMatches.length >= 3, "expected at least 3 required:true inputs");
});

test("4 workflow validates confirmation inputs equal exactly 'yes' before checkout", () => {
  const workflow = readRepo(WORKFLOW);
  const validateIdx = workflow.indexOf("Validate hard-ban confirmation inputs");
  const checkoutIdx = workflow.indexOf("actions/checkout@v4");
  assert.ok(validateIdx > -1, "expected a validation step");
  assert.ok(checkoutIdx > -1, "expected a checkout step");
  assert.ok(validateIdx < checkoutIdx, "validation must run before checkout");
  assert.match(workflow, /inputs\.confirm_gate_e.*!=\s*"yes"/);
  assert.match(workflow, /inputs\.confirm_prod_smoke.*!=\s*"yes"/);
  assert.match(workflow, /inputs\.confirm_no_launch_go.*!=\s*"yes"/);
  assert.match(workflow, /exit 1/);
});

test("5 TWIN_ACCESS_TOKEN sourced from GitHub secrets, never echoed as a value", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /TWIN_ACCESS_TOKEN:\s*\$\{\{\s*secrets\.TWIN_ACCESS_TOKEN\s*\}\}/);
  // The only allowed print of the token is a boolean presence check.
  assert.match(workflow, /TWIN_ACCESS_TOKEN present.*true.*false/);
  assert.doesNotMatch(workflow, /echo\s+["']?\$TWIN_ACCESS_TOKEN["']?\s*$/m);
  assert.doesNotMatch(workflow, /console\.(log|error)\([^)]*TWIN_ACCESS_TOKEN[^)]*\)/);
});

test("6 canonical Gate E Phase 3B prod env vars present on the phase3b step", () => {
  const workflow = readRepo(WORKFLOW);
  for (const part of CANONICAL_PROD_ENV_PARTS) {
    assert.ok(workflow.includes(part), `expected workflow to include: ${part}`);
  }
  assert.match(workflow, /npm run test:phase3b-controlled-multitab-prod/);
});

test("7 workflow verifies workers=1 / retries=0 at the source level (no override)", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /workers: 1,/);
  assert.match(workflow, /retries: process\.env\.CI \? 1 : 0/);
  assert.doesNotMatch(workflow, /--workers=[2-9]/);
  assert.doesNotMatch(workflow, /--repeat-each/);
});

test("8 workflow runs public-health 10x poll and 10-route HTTP smoke, read-only", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /public-health.*10.{0,10}poll|10x poll/i);
  assert.match(workflow, /seq 1 10/);
  const routes = [
    "/for-candidates",
    "/for-recruiters",
    "/for-companies",
    "/for-investors",
    "/investor",
    "/investor/product-proof",
    "/demo",
    "/how-it-works",
    "/faq",
  ];
  for (const route of routes) {
    assert.ok(workflow.includes(route), `expected HTTP smoke to include route: ${route}`);
  }
});

test("9 job timeout is bounded between 45 and 60 minutes", () => {
  const workflow = readRepo(WORKFLOW);
  const match = workflow.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(match, "expected a job-level timeout-minutes");
  const minutes = Number.parseInt(match![1]!, 10);
  assert.ok(minutes >= 45 && minutes <= 60, `expected timeout between 45-60 minutes, got ${minutes}`);
});

test("10 artifacts uploaded — .diagnostics, playwright report, test-results", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /upload-artifact@v4/);
  assert.match(workflow, /frontend\/\.diagnostics\/\*\*/);
  assert.match(workflow, /frontend\/playwright-report\/\*\*/);
  assert.match(workflow, /frontend\/test-results\/\*\*/);
});

test("11 cleanup step exists and always runs, even on failure", () => {
  const workflow = readRepo(WORKFLOW);
  const cleanupIdx = workflow.indexOf("Cleanup");
  assert.ok(cleanupIdx > -1, "expected a cleanup step");
  const cleanupBlock = workflow.slice(cleanupIdx, cleanupIdx + 400);
  assert.match(cleanupBlock, /if:\s*always\(\)/);
  assert.match(cleanupBlock, /pkill/);
});

test("12 workflow never deploys, never claims Gate D or Launch GO", () => {
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /vercel\s+deploy/i);
  assert.doesNotMatch(workflow, /railway\s+(up|deploy)/i);
  assert.doesNotMatch(workflow, /Gate D\s*[:=]\s*(YES|PASS)/i);
  assert.doesNotMatch(workflow, /Launch\s*(stance)?\s*[:=]\s*\*?\*?GO\*?\*?/i);
  assert.match(workflow, /does not.{0,20}(deploy|constitute Launch GO)/i);
  assert.match(workflow, /P0.*OPEN|remains OPEN/i);
  assert.match(workflow, /Gate F.*PENDING|remains PENDING/i);
});

test("13 concurrency group prevents overlapping prod attempts", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /group:\s*gate-e-phase3b-manual/);
});

test("14 npm ci runs in frontend working directory", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /working-directory:\s*frontend/);
  assert.match(workflow, /npm ci/);
});

test("15 npm script test:gate-e-isolated-runner-guard registered", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-isolated-runner-guard":/);
  assert.match(pkg, /gate-e-isolated-runner-guard\.test\.ts/);
});

test("16 test:phase3b-controlled-multitab-prod/-browser/-browser:raw HARD BLOCK local execution via the guard script first", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:phase3b-controlled-multitab-prod":\s*"npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && /);
  assert.match(pkg, /"test:phase3b-controlled-multitab-browser":\s*"npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && /);
  assert.match(pkg, /"test:phase3b-controlled-multitab-browser:raw":\s*"npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && playwright test /);

  const guard = readFrontend("scripts/phase3b-prod-local-guard.ts");
  assert.match(guard, /Local Phase 3B execution is disabled\. Use the GitHub Actions workflow\./);
  assert.match(guard, /GITHUB_ACTIONS/);
  assert.doesNotMatch(guard, /from "@playwright\/test"/);
});

test("17 playwright.config.ts reporter change is CI-only; local list-only behavior unchanged", () => {
  const config = readFrontend("playwright.config.ts");
  assert.match(config, /reporter:\s*process\.env\.CI\s*\?\s*\[\["list"\],\s*\["html"/);
  assert.match(config, /workers: 1,/);
  assert.match(config, /retries: process\.env\.CI \? 1 : 0/);
});

test("18 plan doc exists — retirement rationale, flow, secrets, result interpretation", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /Founder Mac Is Retired/i);
  assert.match(doc, /Manual GitHub Actions Flow/i);
  assert.match(doc, /Required Secrets Setup/i);
  assert.match(doc, /TWIN_ACCESS_TOKEN/);
  assert.match(doc, /Result Interpretation/i);
  assert.match(doc, /Attempt 11\+|Attempt 11/);
  assert.match(doc, /founder Mac must not run Playwright/i);
});

test("19 plan doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(PLAN_DOC);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
});

test("20 plan doc — attempt 11 explicitly not authorized or triggered by this task", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /[Aa]ttempt 11.{0,40}(not authorized|NOT authorized|BLOCKED)/);
  assert.match(doc, /does not.{0,20}trigger any run|NOT TRIGGERED/i);
});

test("21 smoke.yml unchanged — no Playwright, no phase3b reference", () => {
  const smokeWorkflow = readRepo(SMOKE_WORKFLOW);
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("22 evidence index references the isolated runner plan with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03/);
  assert.match(index, /isolated.{0,20}runner/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("23 no test in this file or the workflow prints an actual token value", () => {
  const source = readFrontend("scripts/gate-e-isolated-runner-guard.test.ts");
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)\([^)]*TWIN_ACCESS_TOKEN\s*[,)]/);
});

// --- Run 28650677999 (2026-07-03) — CI false orphan detection fix ----------

test("24 pre-run cleanup step exists, runs before the Phase 3B step, prints before/after counts, never exposes the token", () => {
  const workflow = readRepo(WORKFLOW);
  const cleanupIdx = workflow.indexOf("Pre-run cleanup");
  const phase3bIdx = workflow.indexOf("Gate E Phase 3B prod — controlled multitab");
  assert.ok(cleanupIdx > -1, "expected a pre-run cleanup step");
  assert.ok(phase3bIdx > -1, "expected the Phase 3B run step");
  assert.ok(cleanupIdx < phase3bIdx, "pre-run cleanup must run before the Phase 3B step");
  const block = workflow.slice(cleanupIdx, phase3bIdx);
  assert.match(block, /Before cleanup/);
  assert.match(block, /After cleanup/);
  assert.match(block, /pgrep -fc chrome-headless-shell/);
  assert.match(block, /pkill -f chrome-headless-shell/);
  assert.match(block, /2>\/dev\/null \|\| (true|echo 0\))/, "pre-run cleanup must never fail the job when nothing matches");
  assert.doesNotMatch(block, /secrets\./);
  assert.doesNotMatch(block, /TWIN_ACCESS_TOKEN/);
});

test("25 pre-run cleanup step does not gate on 'if: always()' — it must run before the job could have failed", () => {
  const workflow = readRepo(WORKFLOW);
  const cleanupIdx = workflow.indexOf("Pre-run cleanup");
  const nextStepIdx = workflow.indexOf("- name:", cleanupIdx + 1);
  const block = workflow.slice(cleanupIdx, nextStepIdx);
  assert.doesNotMatch(block, /if:\s*always\(\)/);
});

test("26 static preflight guards, hard-ban confirmations, and no-overclaims job summary are all unaffected by the pre-run cleanup addition", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /Validate hard-ban confirmation inputs/);
  assert.match(workflow, /Static preflight guards/);
  assert.match(workflow, /Explicit non-claims/);
  assert.match(workflow, /does not.{0,20}constitute Launch GO/i);
  assert.match(workflow, /remains OPEN/i);
  assert.match(workflow, /remains PENDING/i);
});

test("27 evidence index and isolated runner plan record run 28650677999's false-positive orphan detection", () => {
  const index = readRepo(EVIDENCE_INDEX);
  const plan = readRepo(PLAN_DOC);
  assert.match(index, /28650677999/);
  assert.match(plan, /28650677999/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(plan, /Phase 3B:\s*\*\*PASS\*\*/i);
});

// --- Gate E Phase 3B split-batch execution (2026-07-03) ---------------------
// See docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md and the
// dedicated frontend/scripts/gate-e-phase3b-split-batch.test.ts for the full
// battery of split-batch assertions; this file only adds the minimum needed
// to prove the pre-split invariants (single-job assumptions this file
// originally encoded) still hold true per matrix batch job.

test("28 gate-e-phase3b-prod is now a 3-way sequential matrix (public-candidate, recruiter, company), never more than 1 batch in flight", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /matrix:\s*\n\s*batch:\s*\[public-candidate,\s*recruiter,\s*company\]/);
  assert.match(workflow, /max-parallel:\s*1/);
  assert.match(workflow, /fail-fast:\s*false/);
});

test("29 every pre-split invariant (timeout bound, artifact upload, cleanup, non-claims) still holds inside the matrix job body", () => {
  const workflow = readRepo(WORKFLOW);
  const prodJobIdx = workflow.indexOf("gate-e-phase3b-prod:");
  const aggregateJobIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  assert.ok(prodJobIdx > -1 && aggregateJobIdx > prodJobIdx, "expected gate-e-phase3b-prod before gate-e-phase3b-aggregate");
  const prodJobBlock = workflow.slice(prodJobIdx, aggregateJobIdx);
  const match = prodJobBlock.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(match, "expected a job-level timeout-minutes inside the matrix job");
  const minutes = Number.parseInt(match![1]!, 10);
  assert.ok(minutes >= 45 && minutes <= 60, `expected timeout between 45-60 minutes, got ${minutes}`);
  assert.match(prodJobBlock, /upload-artifact@v4/);
  assert.match(prodJobBlock, /if:\s*always\(\)/);
  assert.match(prodJobBlock, /pkill/);
  assert.match(prodJobBlock, /does \*\*not\*\* constitute Launch GO/i);
});

test("30 a new gate-e-phase3b-aggregate job exists, runs after every matrix batch reaches a conclusion, and never fails on a missing batch", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  assert.ok(aggregateIdx > -1, "expected a gate-e-phase3b-aggregate job");
  const block = workflow.slice(aggregateIdx);
  assert.match(block, /needs:\s*gate-e-phase3b-prod/);
  assert.match(block, /if:\s*always\(\)/);
  assert.match(block, /continue-on-error:\s*true/);
  assert.match(block, /gate-e-phase3b-evidence-aggregate-\$\{\{\s*github\.run_id\s*\}\}/);
});

test("31 aggregation job carries the same explicit non-claims footer as the batch job — no new Launch GO/Gate D/Gate F/P0 claims", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.doesNotMatch(block, /vercel\s+deploy/i);
  assert.doesNotMatch(block, /railway\s+(up|deploy)/i);
  assert.doesNotMatch(block, /Gate D\s*[:=]\s*(YES|PASS)/i);
  assert.doesNotMatch(block, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.match(block, /remains OPEN/i);
  assert.match(block, /remains PENDING/i);
});

test("32 npm script test:gate-e-phase3b-split-batch is registered and wired into the matrix job's static preflight guards", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-phase3b-split-batch":/);
  assert.match(pkg, /gate-e-phase3b-split-batch\.test\.ts/);
  const workflow = readRepo(WORKFLOW);
  const preflightIdx = workflow.indexOf("Static preflight guards");
  const block = workflow.slice(preflightIdx, preflightIdx + 800);
  assert.match(block, /test:gate-e-phase3b-split-batch/);
});
