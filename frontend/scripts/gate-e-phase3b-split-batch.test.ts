/**
 * Gate E Phase 3B split-batch isolated-runner execution — static guard (no
 * browser, no workflow trigger, no prod request).
 *
 * Proves the batch-filter helper, the batch-specific npm scripts, the
 * `.github/workflows/gate-e-phase3b-manual.yml` matrix + aggregation job
 * wiring, per-batch attempt-status persistence, and the split-batch plan
 * doc — without ever running Playwright or dispatching the workflow. See
 * docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md.
 */
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  isPhase3bBatchLabel,
  PHASE3B_BATCH_LABELS,
  PHASE3B_ROUTE_BATCHES,
  selectPhase3bRouteBatches,
} from "../e2e/helpers/phase3b-controlled-routes";
import {
  getGateEBatchAttemptStatusFileName,
  writeGateEAttemptStatus,
} from "../e2e/helpers/gate-e-attempt-status";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const PLAN_DOC = "docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md";
const ISOLATED_RUNNER_PLAN = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 PHASE3B_BATCH_LABELS matches PHASE3B_ROUTE_BATCHES exactly (public-candidate, recruiter, company)", () => {
  assert.deepEqual(PHASE3B_BATCH_LABELS, ["public-candidate", "recruiter", "company"]);
  assert.equal(PHASE3B_BATCH_LABELS.length, PHASE3B_ROUTE_BATCHES.length);
  for (const batch of PHASE3B_ROUTE_BATCHES) {
    assert.ok(PHASE3B_BATCH_LABELS.includes(batch.label), batch.label);
  }
});

test("2 isPhase3bBatchLabel accepts exactly the 3 known labels and rejects anything else", () => {
  assert.equal(isPhase3bBatchLabel("public-candidate"), true);
  assert.equal(isPhase3bBatchLabel("recruiter"), true);
  assert.equal(isPhase3bBatchLabel("company"), true);
  assert.equal(isPhase3bBatchLabel("all"), false);
  assert.equal(isPhase3bBatchLabel(""), false);
  assert.equal(isPhase3bBatchLabel("Public-Candidate"), false);
  assert.equal(isPhase3bBatchLabel("recruiterr"), false);
});

test("3 selectPhase3bRouteBatches returns all 3 batches, unfiltered, when PHASE3B_BATCH is unset or blank", () => {
  const unset = selectPhase3bRouteBatches({} as NodeJS.ProcessEnv);
  assert.equal(unset.length, 3);
  assert.deepEqual(
    unset.map((b) => b.label),
    ["public-candidate", "recruiter", "company"],
  );

  const blank = selectPhase3bRouteBatches({ PHASE3B_BATCH: "  " } as unknown as NodeJS.ProcessEnv);
  assert.equal(blank.length, 3);
});

test("4 selectPhase3bRouteBatches filters to exactly one batch for each valid PHASE3B_BATCH value", () => {
  for (const label of PHASE3B_BATCH_LABELS) {
    const filtered = selectPhase3bRouteBatches({ PHASE3B_BATCH: label } as unknown as NodeJS.ProcessEnv);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.label, label);
    const full = PHASE3B_ROUTE_BATCHES.find((b) => b.label === label);
    assert.deepEqual(filtered[0]!.routes, full!.routes);
  }
});

test("5 selectPhase3bRouteBatches throws loudly on an unknown PHASE3B_BATCH value (never silently runs all or none)", () => {
  assert.throws(
    () => selectPhase3bRouteBatches({ PHASE3B_BATCH: "not-a-real-batch" } as unknown as NodeJS.ProcessEnv),
    /Unknown PHASE3B_BATCH/,
  );
  assert.throws(() =>
    selectPhase3bRouteBatches({ PHASE3B_BATCH: "Recruiter" } as unknown as NodeJS.ProcessEnv),
  );
});

test("6 batch route partition is a lossless, non-overlapping split of the full 20-route inventory", () => {
  const allFromBatches = PHASE3B_ROUTE_BATCHES.flatMap((b) => b.routes);
  const unique = new Set(allFromBatches);
  assert.equal(unique.size, allFromBatches.length, "no route appears in more than one batch");
  assert.equal(allFromBatches.length, 20);
});

test("7 npm scripts test:phase3b-controlled-multitab-prod:<batch> exist for all 3 batches and set PHASE3B_BATCH", () => {
  const pkg = readFrontend("package.json");
  for (const label of PHASE3B_BATCH_LABELS) {
    const scriptName = `test:phase3b-controlled-multitab-prod:${label}`;
    const re = new RegExp(
      `"${scriptName}":\\s*"PHASE3B_BATCH=${label} npm run test:phase3b-controlled-multitab-prod"`,
    );
    assert.match(pkg, re, `expected package.json to register ${scriptName}`);
  }
});

test("8 batch npm scripts delegate to the guarded test:phase3b-controlled-multitab-prod — local hard block still applies first", () => {
  const pkg = readFrontend("package.json");
  assert.match(
    pkg,
    /"test:phase3b-controlled-multitab-prod":\s*"npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && /,
    "the underlying -prod script must still run the local guard before anything else",
  );
  for (const label of PHASE3B_BATCH_LABELS) {
    assert.match(
      pkg,
      new RegExp(`"test:phase3b-controlled-multitab-prod:${label}":\\s*"PHASE3B_BATCH=${label} npm run test:phase3b-controlled-multitab-prod"`),
    );
  }
});

test("9 npm script test:gate-e-phase3b-split-batch (this file) is registered", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-phase3b-split-batch":/);
  assert.match(pkg, /gate-e-phase3b-split-batch\.test\.ts/);
});

test("10 GateEAttemptStatus has a batch field and getGateEBatchAttemptStatusFileName produces a batch-scoped file name", () => {
  for (const label of PHASE3B_BATCH_LABELS) {
    assert.equal(getGateEBatchAttemptStatusFileName(label), `gate-e-attempt-status-${label}.json`);
  }
});

test("11 writeGateEAttemptStatus records the batch field and round-trips a real batch value (isolated, self-cleaning)", () => {
  // This function has a real (best-effort) disk side effect
  // (frontend/.diagnostics/gate-e-attempt-status*.json), so this test
  // removes any pre-existing status files first and cleans up after
  // itself, to stay deterministic and avoid polluting the working tree.
  const statusFiles = [
    "gate-e-attempt-status.json",
    ...PHASE3B_BATCH_LABELS.map((label) => getGateEBatchAttemptStatusFileName(label)),
  ].map((name) => join(root, ".diagnostics", name));
  for (const file of statusFiles) rmSync(file, { force: true });

  try {
    const withBatch = writeGateEAttemptStatus({ stage: "workflow-start", batch: "recruiter" });
    assert.ok(withBatch === null || withBatch.batch === "recruiter", "batch should round-trip when provided (or write disabled)");

    const updatedBatch = writeGateEAttemptStatus({ stage: "batch-complete", batch: "company" });
    assert.ok(updatedBatch === null || updatedBatch.batch === "company", "a later stage's batch should overwrite the earlier one");
  } finally {
    for (const file of statusFiles) rmSync(file, { force: true });
  }
});

test("12 spec file resolves route batches via selectPhase3bRouteBatches (batch mode) with a route-mode override via selectPhase3bRoute (2026-07-06), not the raw PHASE3B_ROUTE_BATCHES import", () => {
  const spec = readFrontend("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /selectPhase3bRouteBatches/);
  assert.match(spec, /selectPhase3bRoute\(process\.env\)/);
  assert.match(spec, /:\s*selectPhase3bRouteBatches\(process\.env\)/);
  assert.match(spec, /PHASE3B_BATCH_ENV\s*=\s*PHASE3B_ROUTE_ENV/);
  assert.match(spec, /batch:\s*PHASE3B_BATCH_ENV/);
});

test("13 gate-e-attempt-status-write.ts CLI wrapper threads PHASE3B_BATCH through to writeGateEAttemptStatus", () => {
  const writer = readFrontend("scripts/gate-e-attempt-status-write.ts");
  assert.match(writer, /PHASE3B_BATCH/);
  assert.match(writer, /batch:\s*process\.env\.PHASE3B_BATCH/);
});

// --- Superseded 2026-07-06: gate-e-phase3b-prod is no longer a batch matrix ---
// Attempt 14 (run 28771385932, 2026-07-06) showed all 3 batch-level matrix
// jobs from this section killed by RUNNER_SHUTDOWN_SIGNAL with 0/20 routes
// confirmed. The live workflow now shards by ROUTE (20 jobs), not by BATCH
// (3 jobs) — see docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md and
// frontend/scripts/gate-e-phase3b-route-sharding.test.ts for the current
// workflow-shape assertions. The PHASE3B_BATCH selection function, its
// batch-scoped npm scripts (tests 1-13 above), and the underlying
// PHASE3B_ROUTE_BATCHES data are all still present and still work — this
// section only proves the *live workflow* has actually moved off the
// batch-matrix shape, not merely gained a route-matrix alongside it.

test("14 workflow gate-e-phase3b-prod job is NO LONGER a matrix over the 3 route batches — superseded by 20-route sharding", () => {
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /matrix:\s*\n\s*batch:\s*\[public-candidate,\s*recruiter,\s*company\]/);
  assert.doesNotMatch(workflow, /PHASE3B_BATCH:\s*\$\{\{\s*matrix\.batch\s*\}\}/);
  assert.match(workflow, /matrix:\s*\n\s*include:/);
  assert.match(workflow, /strategy:\s*\n\s*fail-fast:\s*false\s*\n\s*max-parallel:\s*1/);
});

test("15 workflow canonical command step no longer calls a matrix.batch-keyed npm script — it calls the generic per-route script instead", () => {
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /npm run test:phase3b-controlled-multitab-prod:\$\{\{\s*matrix\.batch\s*\}\}/);
  assert.match(workflow, /npm run test:phase3b-controlled-multitab-prod:route/);
});

test("16 workflow no longer uploads a matrix.batch-named artifact — it uploads a matrix.slug-named artifact instead, still if: always()", () => {
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /gate-e-phase3b-evidence-\$\{\{\s*matrix\.batch\s*\}\}/);
  const uploadIdx = workflow.indexOf("gate-e-phase3b-evidence-${{ matrix.slug }}-${{ github.run_id }}");
  assert.ok(uploadIdx > -1, "expected a slug-scoped artifact name");
  const precedingBlock = workflow.slice(Math.max(0, uploadIdx - 400), uploadIdx);
  assert.match(precedingBlock, /if:\s*always\(\)/);
  assert.match(precedingBlock, /upload-artifact@v4/);
});

test("17 workflow has a gate-e-phase3b-aggregate job that needs the matrix job and always runs", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  assert.ok(aggregateIdx > -1, "expected a gate-e-phase3b-aggregate job");
  const block = workflow.slice(aggregateIdx, aggregateIdx + 600);
  assert.match(block, /needs:\s*gate-e-phase3b-prod/);
  assert.match(block, /if:\s*always\(\)/);
});

test("18 aggregation job downloads all batch artifacts by pattern and tolerates a missing batch (continue-on-error)", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.match(block, /download-artifact@v4/);
  assert.match(block, /pattern:\s*gate-e-phase3b-evidence-\*-\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(block, /continue-on-error:\s*true/);
});

test("19 aggregation merge step uses os.walk (not glob) so it can see files under the hidden .diagnostics directory (step renamed to per-route in route sharding, same os.walk discipline)", () => {
  const workflow = readRepo(WORKFLOW);
  const mergeIdx = workflow.indexOf("Merge per-route diagnostics");
  assert.ok(mergeIdx > -1, "expected a merge step");
  const block = workflow.slice(mergeIdx, mergeIdx + 4000);
  assert.match(block, /os\.walk\(root\)/);
  assert.doesNotMatch(block, /glob\.glob\(/, "glob() does not descend into dot-directories like .diagnostics by default");
});

test("20 aggregation job uploads its own aggregate artifact and writes the standard non-claims footer", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.match(block, /gate-e-phase3b-evidence-aggregate-\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(block, /does \*\*not\*\* constitute Launch GO/i);
  assert.match(block, /remains OPEN/i);
  assert.match(block, /remains PENDING/i);
});

test("21 aggregation job never claims a Phase 3B PASS or overrides per-batch route evidence", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.doesNotMatch(block, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.match(block, /does no new pass\/fail|draws no new pass\/fail/i);
});

test("22 split-batch plan doc exists — rationale, job flow, result interpretation, no overclaims", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /Split-Batch/i);
  assert.match(doc, /fail-fast:\s*false/);
  assert.match(doc, /max-parallel:\s*1/);
  assert.match(doc, /gate-e-phase3b-aggregate/);
  assert.match(doc, /Result Interpretation/i);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
});

test("23 split-batch plan doc does not authorize or dispatch attempt 14", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /[Aa]ttempt 14.{0,60}(not authorized|NOT authorized|NOT AUTHORIZED)/);
  assert.match(doc, /NOT DISPATCHED|does not dispatch/i);
});

test("24 isolated runner plan cross-references the split-batch plan (§5c)", () => {
  const plan = readRepo(ISOLATED_RUNNER_PLAN);
  assert.match(plan, /GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03/);
  assert.match(plan, /5c\. Split-Batch Execution/);
  assert.doesNotMatch(plan, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("25 evidence index references the split-batch plan with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03/);
  assert.match(index, /split-batch/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("26 no test in this file or the workflow prints an actual token value", () => {
  const source = readFrontend("scripts/gate-e-phase3b-split-batch.test.ts");
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)\([^)]*TWIN_ACCESS_TOKEN\s*[,)]/);
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /echo\s+["']?\$TWIN_ACCESS_TOKEN["']?\s*$/m);
});

test("27 static preflight guards step in the matrix job includes this file's npm script", () => {
  const workflow = readRepo(WORKFLOW);
  const preflightIdx = workflow.indexOf("Static preflight guards");
  assert.ok(preflightIdx > -1, "expected a static preflight guards step");
  const block = workflow.slice(preflightIdx, preflightIdx + 800);
  assert.match(block, /test:gate-e-phase3b-split-batch/);
});
