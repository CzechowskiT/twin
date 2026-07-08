/**
 * Gate E Phase 3B attempt 15 — route-sharded — FAIL (8/20 PASS, 12/20 confirmed
 * product failures) (static, no browser).
 *
 * Attempt 15 (first live dispatch of the route-sharded workflow, run
 * 28777105356) is the first attempt in this workflow's isolated-runner
 * history (attempts 12-14) to complete all 20 route jobs with zero
 * infrastructure-level endings (no RUNNER_CANCELLED, RUNNER_LOST_COMMUNICATION,
 * or RUNNER_SHUTDOWN_SIGNAL). 8/20 routes PASS; 12/20 routes FAIL on genuine
 * product-level harness assertions — 11 via a captured browser-side JS
 * runtime error (page-error:1) and 1 (/dashboard) via excessive DOM node
 * count (dom-fail:21100, threshold 15000). Neither a Phase 3B PASS nor a
 * repeat of the prior BLANK_OR_NO_CONTENT 20/20 FAIL — this is new, more
 * specific, partially-passing route-level evidence.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT15_RESULT = "docs/gate-e-phase3b-attempt15-result-2026-07-03.md";
const ATTEMPT14_RESULT = "docs/gate-e-phase3b-attempt14-result-2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt15 result doc exists — FAIL, 8/20 PASS, 12/20 confirmed product failures", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 15 \(route-sharded, isolated runner\) — FAIL/);
  assert.match(doc, /8\/20 PASS/);
  assert.match(doc, /12\/20/);
});

test("2 attempt15 result doc — run id and head sha referenced, matches PR #379 route-sharded branch state", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /28777105356/);
  assert.match(doc, /32ff41ba/);
});

test("3 attempt15 result doc — zero infrastructure-level endings, unlike attempts 12-14", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /[Zz]ero infrastructure-level endings|ZERO[\s\S]*RUNNER_CANCELLED/);
  assert.match(doc, /RUNNER_CANCELLED/);
  assert.match(doc, /RUNNER_LOST_COMMUNICATION/);
  assert.match(doc, /RUNNER_SHUTDOWN_SIGNAL/);
});

test("4 attempt15 result doc — all 20 routes confirmed, none MISSING", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /20\/20 [Cc]onfirmed|20\/20 CONFIRMED/);
  assert.match(doc, /\*\*MISSING \/ infrastructure ending\*\* \| 0 \|/);
});

test("5 attempt15 result doc — product failure reasons documented (page-error and DOM_FAIL)", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /page-error:1/);
  assert.match(doc, /DOM_FAIL/);
  assert.match(doc, /dom-fail:21100/);
  assert.match(doc, /\/dashboard/);
});

test("6 attempt15 result doc — documents the .diagnostics artifact-upload config bug distinctly from a route-evidence gap", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /include-hidden-files/);
  assert.match(doc, /CONFIG BUG|config bug/i);
  assert.match(doc, /not a product defect and not evidence of missing route execution/i);
});

test("7 attempt15 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("8 attempt15 result doc — attempt 16 explicitly not authorized, no auto-retry", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /attempt 16.{0,60}not authorized/i);
  assert.doesNotMatch(doc, /attempt 16.{0,40}authoriz(ed|ation)(?!.{0,80}not)/i);
});

test("9 attempt15 result doc — token never exposed, prod requests read-only", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.match(doc, /NO token exposure/i);
  assert.match(doc, /read-only/i);
  assert.doesNotMatch(doc, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9]{10,}/);
});

test("10 npm script test:gate-e-attempt15-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt15-result/);
  assert.match(pkg, /gate-e-attempt15-result\.test\.ts/);
});

test("11 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("12 evidence index references attempt 15 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 15|Attempt 15/);
  assert.match(index, /gate-e-phase3b-attempt15-result-2026-07-03/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("13 attempt14 result doc unaffected (traceability chain intact)", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /RUNNER_SHUTDOWN_SIGNAL/);
});

test("14 attempt15 result doc — no gh workflow dispatch commands anywhere in this task's diff surface", () => {
  const doc = readRepo(ATTEMPT15_RESULT);
  assert.doesNotMatch(doc, /gh\s+workflow\s+run\s+gate-e-phase3b-manual\.yml.{0,10}$/m);
});
