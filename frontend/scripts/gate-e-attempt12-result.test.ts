/**
 * Gate E Phase 3B attempt 12 — RUNNER_CANCELLED / INCONCLUSIVE (static, no browser).
 *
 * Attempt 12 (dispatch 2, isolated GitHub Actions runner, run 28652257796) passed
 * every scripted precondition — public-health 10/10, HTTP smoke 10/10, static
 * preflight guards, workers=1/retries=0, and the pre-run orphan-detection check
 * (confirming the dispatch-1 false positive from run 28650677999 did not recur) —
 * then had its job cancelled at the GitHub Actions infrastructure level partway
 * through the canonical Phase 3B command, after the "prod preflight" sub-test
 * passed but before any of the 20-route batches executed. Zero route-level
 * evidence was produced. This is neither a product FAIL nor a Phase 3B PASS, and
 * is not attributable to a scripted precondition, a shared-host resource-safety
 * issue, or this task's own tooling.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT12_RESULT = "docs/gate-e-phase3b-attempt12-result-2026-07-03.md";
const ATTEMPT11_RESULT = "docs/gate-e-phase3b-attempt11-result-2026-07-03.md";
const WATCHDOG_DOC = "docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md";
const ISOLATED_RUNNER_PLAN = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt12 result doc exists — RUNNER_CANCELLED, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 12 — RUNNER_CANCELLED \/ INCONCLUSIVE/);
  assert.match(doc, /RUNNER_CANCELLED/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt12 result doc — both dispatches referenced (28650677999 and 28652257796)", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /28650677999/);
  assert.match(doc, /28652257796/);
  assert.match(doc, /PRECONDITION_FAILED/);
});

test("3 attempt12 result doc — all scripted preconditions passed before cancellation", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /10\/10 x HTTP 200, status=ok, db_ok=true|10\/10 × HTTP 200/);
  assert.match(doc, /OK: HTTP smoke 10\/10 x HTTP 200/);
  assert.match(doc, /prod preflight.{0,40}PASS/i);
});

test("4 attempt12 result doc — cancellation investigation present, not attributable to this task's tooling", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /cancelled/i);
  assert.match(doc, /gh run watch.{0,40}read-only/i);
  assert.match(doc, /cancel endpoint/i);
});

test("5 attempt12 result doc — zero routes evaluated, no diagnostics artifacts", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /Routes [Ee]valuated:\s*\*?\*?0\/20|0\/20\./);
  assert.match(doc, /\.diagnostics artifacts:\s*0/);
  assert.match(doc, /0 artifacts/);
});

test("6 attempt12 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("7 attempt12 result doc — attempt 13 explicitly not authorized, no auto-retry", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /attempt 13.{0,60}not authorized/i);
  assert.doesNotMatch(doc, /attempt 13.{0,40}authoriz(ed|ation)(?!.{0,80}not)/i);
});

test("8 attempt12 result doc — token never exposed, prod requests read-only", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /NO token exposure/i);
  assert.match(doc, /read-only/i);
  assert.doesNotMatch(doc, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9]{10,}/);
});

test("9 npm script test:gate-e-attempt12-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt12-result/);
  assert.match(pkg, /gate-e-attempt12-result\.test\.ts/);
});

test("10 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("11 evidence index references attempt 12 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 12|Attempt 12/);
  assert.match(index, /gate-e-phase3b-attempt12-result-2026-07-03/);
  assert.match(index, /RUNNER_CANCELLED/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("12 resource watchdog + isolated runner plan docs still exist and are cross-referenced", () => {
  const watchdogDoc = readRepo(WATCHDOG_DOC);
  assert.ok(watchdogDoc.length > 0);
  const planDoc = readRepo(ISOLATED_RUNNER_PLAN);
  assert.ok(planDoc.length > 0);
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG_2026-07-03/);
});

test("13 attempt11 result doc unaffected (traceability chain intact)", () => {
  const doc = readRepo(ATTEMPT11_RESULT);
  assert.match(doc, /USER_ABORTED/);
});
