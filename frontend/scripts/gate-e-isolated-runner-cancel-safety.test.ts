/**
 * Gate E Phase 3B isolated-runner cancellation-safety hardening — static
 * guard (no browser, no workflow trigger, no prod request).
 *
 * Attempt 12 dispatch 2 (run 28652257796) passed every scripted
 * precondition and the Phase 3B "prod preflight" sub-test, then went
 * silent for ~4m21s before the GitHub Actions job was cancelled at the
 * infrastructure level — with zero artifacts uploaded, because a
 * job-level cancellation skips every subsequent step regardless of its
 * `if: always()` condition (see docs/gate-e-phase3b-attempt12-result-
 * 2026-07-03.md §3). This suite proves the hardening added in response:
 * heartbeat logging at every required checkpoint, best-effort status-file
 * persistence after every stage, explicit timeouts (job + canonical
 * command + confirmed route timeout), and an artifact-upload step that
 * still runs `if: always()` and includes the new status file — all
 * without changing Phase 3B pass/fail product logic or weakening the
 * resource watchdog. Proven statically only; this file never runs the
 * workflow or launches a browser.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const SPEC = "e2e/phase3b-controlled-multitab.spec.ts";
const STATUS_HELPER = "e2e/helpers/gate-e-attempt-status.ts";
const STATUS_CLI = "scripts/gate-e-attempt-status-write.ts";
const WATCHDOG_HELPER = "e2e/helpers/phase3b-resource-watchdog.ts";
const ATTEMPT12_RESULT = "docs/gate-e-phase3b-attempt12-result-2026-07-03.md";
const ISOLATED_RUNNER_PLAN = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

// --- Helper module -----------------------------------------------------

test("1 gate-e-attempt-status helper exists, exports writeGateEAttemptStatus, never throws", () => {
  const source = readFrontend(STATUS_HELPER);
  assert.match(source, /export function writeGateEAttemptStatus/);
  assert.match(source, /export function readGateEAttemptStatus/);
  assert.match(source, /try\s*\{[\s\S]*?\}\s*catch\s*\{[\s\S]*?return null/);
  assert.match(source, /gate-e-attempt-status\.json/);
});

test("2 gate-e-attempt-status status shape covers stage, timestamp, run id, repo sha, health/smoke, batch progress, route counts, classifications", () => {
  const source = readFrontend(STATUS_HELPER);
  for (const field of ["stage", "timestamp", "runId", "repoSha", "healthStatus", "smokeStatus", "batchProgress", "routeCounts", "classifications"]) {
    assert.match(source, new RegExp(`${field}[:?]`), `expected GateEAttemptStatus to include field: ${field}`);
  }
  assert.match(source, /totalBatches/);
  assert.match(source, /completedBatches/);
  assert.match(source, /currentBatch/);
  assert.match(source, /pass:\s*number/);
  assert.match(source, /partial:\s*number/);
  assert.match(source, /warn:\s*number/);
  assert.match(source, /fail:\s*number/);
});

test("3 gate-e-attempt-status-write CLI wrapper exists, reads GATE_E_STAGE, never prints a token", () => {
  const source = readFrontend(STATUS_CLI);
  assert.match(source, /GATE_E_STAGE/);
  assert.match(source, /writeGateEAttemptStatus/);
  assert.doesNotMatch(source, /TWIN_ACCESS_TOKEN/);
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)\([^)]*secrets\.[^)]*\)/i);
});

// --- Spec-level heartbeat + status persistence --------------------------

test("4 spec imports and uses writeGateEAttemptStatus", () => {
  const spec = readFrontend(SPEC);
  assert.match(spec, /from\s+"\.\/helpers\/gate-e-attempt-status"/);
  assert.match(spec, /writeGateEAttemptStatus\(/);
});

test("5 spec persists status + heartbeat after preflight passes", () => {
  const spec = readFrontend(SPEC);
  const preflightIdx = spec.indexOf('test("prod preflight');
  const batchLoopIdx = spec.indexOf("for (const batch of PHASE3B_ROUTE_BATCHES)");
  assert.ok(preflightIdx > -1 && batchLoopIdx > preflightIdx, "expected preflight test before batch loop");
  const preflightBlock = spec.slice(preflightIdx, batchLoopIdx);
  assert.match(preflightBlock, /\[gate-e-heartbeat\] preflight-complete/);
  assert.match(preflightBlock, /stage:\s*"preflight-complete"/);
});

test("6 spec persists status + heartbeat before AND after each batch", () => {
  const spec = readFrontend(SPEC);
  const batchLoopIdx = spec.indexOf("for (const batch of PHASE3B_ROUTE_BATCHES)");
  const afterLoop = spec.slice(batchLoopIdx);
  assert.match(afterLoop, /\[gate-e-heartbeat\] batch-start/);
  assert.match(afterLoop, /stage:\s*"batch-start"/);
  assert.match(afterLoop, /\[gate-e-heartbeat\] batch-complete/);
  assert.match(afterLoop, /stage:\s*"batch-complete"/);
  // batch-start must precede batch-complete in source order (before/after, not just "both present")
  const startIdx = afterLoop.indexOf('stage: "batch-start"');
  const completeIdx = afterLoop.indexOf('stage: "batch-complete"');
  assert.ok(startIdx > -1 && completeIdx > startIdx, "expected batch-start to precede batch-complete");
});

test("7 spec emits a heartbeat during the idle wait, at least every 60s", () => {
  const spec = readFrontend(SPEC);
  assert.match(spec, /idleWithHeartbeat/);
  assert.match(spec, /\[gate-e-heartbeat\] batch \$\{label\}/);
  const heartbeatMsMatch = spec.match(/GATE_E_HEARTBEAT_MS\s*=\s*([\d_]+)/);
  assert.ok(heartbeatMsMatch, "expected a GATE_E_HEARTBEAT_MS constant");
  const heartbeatMs = Number.parseInt(heartbeatMsMatch![1]!.replace(/_/g, ""), 10);
  assert.ok(heartbeatMs >= 30_000 && heartbeatMs <= 60_000, `expected heartbeat interval between 30-60s, got ${heartbeatMs}ms`);
  // idleWithHeartbeat must actually be called in place of a plain silent setTimeout for the idle wait
  assert.match(spec, /await idleWithHeartbeat\(idleMs, batch\.label\)/);
});

test("8 spec persists status + heartbeat on final cleanup (afterAll)", () => {
  const spec = readFrontend(SPEC);
  const afterAllIdx = spec.indexOf("test.afterAll(");
  const preflightIdx = spec.indexOf('test("prod preflight');
  assert.ok(afterAllIdx > -1 && preflightIdx > afterAllIdx, "expected afterAll before the preflight test");
  const afterAllBlock = spec.slice(afterAllIdx, preflightIdx);
  assert.match(afterAllBlock, /\[gate-e-heartbeat\] final-cleanup/);
  assert.match(afterAllBlock, /stage:\s*"final-cleanup"/);
});

test("9 spec accumulates cumulative route counts/classifications across batches (not overwritten per batch)", () => {
  const spec = readFrontend(SPEC);
  assert.match(spec, /cumulativeRouteCounts/);
  assert.match(spec, /cumulativeClassifications/);
  assert.match(spec, /cumulativeRouteCounts\.total\s*\+=\s*1/);
});

test("10 spec — GITHUB_RUN_ID / GITHUB_SHA read as ambient env vars, no new workflow env wiring required", () => {
  const spec = readFrontend(SPEC);
  assert.match(spec, /process\.env\.GITHUB_RUN_ID/);
  assert.match(spec, /process\.env\.GITHUB_SHA/);
});

test("11 route-level navigation timeout still explicitly bounded (ROUTE_GOTO_MS unchanged, present, used on page.goto)", () => {
  const spec = readFrontend(SPEC);
  const match = spec.match(/ROUTE_GOTO_MS\s*=\s*([\d_]+)/);
  assert.ok(match, "expected ROUTE_GOTO_MS constant");
  const ms = Number.parseInt(match![1]!.replace(/_/g, ""), 10);
  assert.ok(ms > 0 && ms <= 60_000, `expected a bounded route navigation timeout, got ${ms}ms`);
  assert.match(spec, /timeout:\s*ROUTE_GOTO_MS/);
});

test("12 per-batch/per-run Playwright timeouts still explicitly configured (test.describe.configure), unchanged in shape", () => {
  const spec = readFrontend(SPEC);
  assert.match(spec, /test\.describe\.configure\(\{\s*mode:\s*"serial",\s*retries:\s*0,\s*timeout:/);
});

// --- Workflow-level heartbeat + status persistence + timeouts ----------

test("13 workflow persists attempt status before the canonical command runs", () => {
  const workflow = readRepo(WORKFLOW);
  const beforeIdx = workflow.indexOf("before canonical command (heartbeat)");
  const canonicalIdx = workflow.indexOf("Gate E Phase 3B prod — controlled multitab (canonical command)");
  assert.ok(beforeIdx > -1, "expected a 'before canonical command' status step");
  assert.ok(canonicalIdx > beforeIdx, "expected the status step to run before the canonical command step");
  const block = workflow.slice(beforeIdx, canonicalIdx);
  assert.match(block, /\[gate-e-heartbeat\] before-canonical/);
  assert.match(block, /GATE_E_STAGE=before-canonical/);
});

test("14 workflow runs a background heartbeat (every 30-60s) during the canonical command step", () => {
  const workflow = readRepo(WORKFLOW);
  const canonicalIdx = workflow.indexOf("Gate E Phase 3B prod — controlled multitab (canonical command)");
  const nextStepIdx = workflow.indexOf("- name:", canonicalIdx + 1);
  const block = workflow.slice(canonicalIdx, nextStepIdx);
  assert.match(block, /sleep 30/);
  assert.match(block, /\[gate-e-heartbeat\] canonical command still running/);
  assert.match(block, /HEARTBEAT_PID/);
  assert.match(block, /kill "\$HEARTBEAT_PID"/);
});

test("15 workflow persists attempt status after the canonical command step, if: always()", () => {
  const workflow = readRepo(WORKFLOW);
  const idx = workflow.indexOf("canonical command finished (heartbeat)");
  assert.ok(idx > -1, "expected a 'canonical command finished' status step");
  const block = workflow.slice(idx, idx + 400);
  assert.match(block, /if:\s*always\(\)/);
  assert.match(block, /GATE_E_STAGE=canonical-complete/);
});

test("16 workflow final cleanup step logs a heartbeat and persists workflow-cleanup status, if: always()", () => {
  const workflow = readRepo(WORKFLOW);
  const idx = workflow.indexOf("Cleanup — kill any leftover browser/phase3b processes");
  assert.ok(idx > -1, "expected the cleanup step");
  const nextStepIdx = workflow.indexOf("- name:", idx + 1);
  const block = workflow.slice(idx, nextStepIdx);
  assert.match(block, /if:\s*always\(\)/);
  assert.match(block, /\[gate-e-heartbeat\] final-cleanup/);
  assert.match(block, /GATE_E_STAGE=workflow-cleanup/);
});

test("17 workflow — job timeout bounded (10-30 min, route-level sharding since 2026-07-06) AND canonical command step has its own explicit, tighter timeout-minutes", () => {
  const workflow = readRepo(WORKFLOW);
  const jobTimeoutMatch = workflow.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(jobTimeoutMatch, "expected a job-level timeout-minutes");
  const jobTimeout = Number.parseInt(jobTimeoutMatch![1]!, 10);
  assert.ok(jobTimeout >= 10 && jobTimeout <= 30, `expected job timeout 10-30min (route-level sharding), got ${jobTimeout}`);

  const canonicalIdx = workflow.indexOf("Gate E Phase 3B prod — controlled multitab (canonical command)");
  const nextStepIdx = workflow.indexOf("- name:", canonicalIdx + 1);
  const canonicalBlock = workflow.slice(canonicalIdx, nextStepIdx);
  const stepTimeoutMatch = canonicalBlock.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(stepTimeoutMatch, "expected an explicit timeout-minutes on the canonical command step");
  const stepTimeout = Number.parseInt(stepTimeoutMatch![1]!, 10);
  assert.ok(stepTimeout > 0 && stepTimeout < jobTimeout, `expected canonical step timeout (${stepTimeout}) to be strictly less than job timeout (${jobTimeout})`);
});

test("18 workflow upload-artifact step is if: always() and includes the attempt-status.json path", () => {
  const workflow = readRepo(WORKFLOW);
  const uploadIdx = workflow.indexOf("actions/upload-artifact@v4");
  assert.ok(uploadIdx > -1, "expected an upload-artifact step");
  const nameIdx = workflow.lastIndexOf("- name:", uploadIdx);
  const block = workflow.slice(nameIdx, uploadIdx + 400);
  assert.match(block, /if:\s*always\(\)/);
  assert.match(block, /frontend\/\.diagnostics\/\*\*/);
  assert.match(block, /gate-e-attempt-status\.json/);
  assert.match(block, /frontend\/playwright-report\/\*\*/);
  assert.match(block, /frontend\/test-results\/\*\*/);
});

test("19 workflow public-health / HTTP smoke / pre-run cleanup stages each persist a status checkpoint", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /GATE_E_STAGE=workflow-start/);
  assert.match(workflow, /GATE_E_STAGE=public-health-complete/);
  assert.match(workflow, /GATE_E_STAGE=http-smoke-complete/);
  assert.match(workflow, /GATE_E_STAGE=pre-run-cleanup-complete/);
});

test("20 workflow never exposes TWIN_ACCESS_TOKEN in any new heartbeat/status step", () => {
  const workflow = readRepo(WORKFLOW);
  const heartbeatSteps = workflow.match(/- name: Persist attempt status[\s\S]*?(?=\n\s*- name:|\n\s*$)/g) ?? [];
  assert.ok(heartbeatSteps.length >= 6, `expected at least 6 'Persist attempt status' steps, found ${heartbeatSteps.length}`);
  for (const step of heartbeatSteps) {
    assert.doesNotMatch(step, /TWIN_ACCESS_TOKEN/);
    assert.doesNotMatch(step, /secrets\./);
  }
});

// --- No product-behavior or watchdog regressions ------------------------

test("21 resource watchdog module unchanged in shape — still exports assertResourceSafeToStart/assertNoWatchdogViolation, still never widens kill scope", () => {
  const watchdog = readFrontend(WATCHDOG_HELPER);
  assert.match(watchdog, /export function assertResourceSafeToStart/);
  assert.match(watchdog, /export function assertNoWatchdogViolation/);
  assert.match(watchdog, /export function createPhase3bResourceWatchdog/);
  assert.match(watchdog, /Never touches any process outside that\s*\n \* tree/);
});

test("22 workers=1 / retries=0 still source-enforced (this hardening task does not touch concurrency)", () => {
  const workflow = readRepo(WORKFLOW);
  const spec = readFrontend(SPEC);
  assert.match(workflow, /workers: 1,/);
  assert.match(workflow, /retries: process\.env\.CI \? 1 : 0/);
  assert.match(spec, /retries:\s*0/);
});

test("23 workflow still workflow_dispatch-only, still requires 3 confirmations, never deploys, never claims Launch GO/Gate D/Gate F YES/P0 CLOSED", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /^on:\s*\n\s*workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*schedule:\s*$/m);
  assert.match(workflow, /confirm_gate_e:/);
  assert.match(workflow, /confirm_prod_smoke:/);
  assert.match(workflow, /confirm_no_launch_go:/);
  assert.doesNotMatch(workflow, /vercel\s+deploy/i);
  assert.doesNotMatch(workflow, /Gate D\s*[:=]\s*(YES|PASS)/i);
  assert.doesNotMatch(workflow, /Launch\s*(stance)?\s*[:=]\s*\*?\*?GO\*?\*?/i);
  assert.doesNotMatch(workflow, /Gate F\s*[:=]\s*\*?\*?YES\*?\*?/i);
});

test("24 no attempt 13 dispatch, no auto-retry logic anywhere in this task's diff surface", () => {
  const workflow = readRepo(WORKFLOW);
  const spec = readFrontend(SPEC);
  const statusHelper = readFrontend(STATUS_HELPER);
  const statusCli = readFrontend(STATUS_CLI);
  for (const source of [workflow, spec, statusHelper, statusCli]) {
    assert.doesNotMatch(source, /gh\s+workflow\s+run/);
    assert.doesNotMatch(source, /gh\s+api[^\n]*dispatches/);
  }
});

// --- Docs updated, no overclaims ----------------------------------------

test("25 attempt12 result doc references this cancellation-hardening follow-up without changing its own classification", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /RUNNER_CANCELLED/);
  assert.match(doc, /cancellation.hardening|Cancellation.[Hh]ardening/i);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
});

test("26 isolated runner plan doc references the cancellation-hardening addition, no overclaims", () => {
  const doc = readRepo(ISOLATED_RUNNER_PLAN);
  assert.match(doc, /[Hh]eartbeat/);
  assert.match(doc, /gate-e-attempt-status\.json/);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.match(doc, /NO-GO/i);
});

test("27 evidence index references the cancellation-hardening work, no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /[Cc]ancellation.hardening|heartbeat/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("28 npm script test:gate-e-isolated-runner-cancel-safety registered", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-isolated-runner-cancel-safety":/);
  assert.match(pkg, /gate-e-isolated-runner-cancel-safety\.test\.ts/);
});
