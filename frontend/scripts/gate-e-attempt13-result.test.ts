/**
 * Gate E Phase 3B attempt 13 — RUNNER_LOST_COMMUNICATION / INCONCLUSIVE (static, no browser).
 *
 * Attempt 13 (isolated GitHub Actions runner, run 28661876288) passed every
 * scripted precondition — public-health 10/10, HTTP smoke 10/10, static
 * preflight guards, workers=1/retries=0, and the pre-run orphan-detection
 * check (confirming attempt 12's dispatch-1 false positive did not recur
 * again) — then ran ~46m43s into the canonical Phase 3B command (far past
 * attempt 12's ~4m21s) before the job ended at the infrastructure level.
 * Unlike attempt 12's generic "The operation was canceled." annotation,
 * GitHub attributed this failure to the runner itself losing communication
 * with the Actions service (CPU/Memory starvation or network blockage named
 * as candidate causes) — a distinct, more specific signature introducing the
 * new RUNNER_LOST_COMMUNICATION classification. Zero route-level evidence
 * was produced (no artifacts, no retrievable job log). This is neither a
 * product FAIL nor a Phase 3B PASS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT13_RESULT = "docs/gate-e-phase3b-attempt13-result-2026-07-03.md";
const ATTEMPT12_RESULT = "docs/gate-e-phase3b-attempt12-result-2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt13 result doc exists — RUNNER_LOST_COMMUNICATION, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 13 — RUNNER_LOST_COMMUNICATION \/ INCONCLUSIVE/);
  assert.match(doc, /RUNNER_LOST_COMMUNICATION/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt13 result doc — run id and head sha referenced, matches PR #375 branch state", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /28661876288/);
  assert.match(doc, /713e5c3b/);
});

test("3 attempt13 result doc — all scripted preconditions passed before the runner lost communication", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /10\/10 x HTTP 200, status=ok, db_ok=true|10\/10 × HTTP 200/);
  assert.match(doc, /10\/10 x HTTP 200 \(10 routes\)|HTTP smoke.{0,20}10\/10/);
});

test("4 attempt13 result doc — distinguishes its GitHub annotation from attempt 12's", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /lost communication with the server/i);
  assert.match(doc, /The operation was canceled\./);
  assert.match(doc, /RUNNER_CANCELLED/);
});

test("5 attempt13 result doc — zero routes confirmed, no diagnostics artifacts, no retrievable log", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /0\/20 [Cc]onfirmed/);
  assert.match(doc, /\.diagnostics artifacts:\s*0/);
  assert.match(doc, /BlobNotFound/);
});

test("6 attempt13 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("7 attempt13 result doc — attempt 14 explicitly not authorized, no auto-retry", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /attempt 14.{0,60}not authorized/i);
  assert.doesNotMatch(doc, /attempt 14.{0,40}authoriz(ed|ation)(?!.{0,80}not)/i);
});

test("8 attempt13 result doc — token never exposed, prod requests read-only", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /NO token exposure/i);
  assert.match(doc, /read-only/i);
  assert.doesNotMatch(doc, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9]{10,}/);
});

test("9 npm script test:gate-e-attempt13-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt13-result/);
  assert.match(pkg, /gate-e-attempt13-result\.test\.ts/);
});

test("10 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("11 evidence index references attempt 13 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 13|Attempt 13/);
  assert.match(index, /gate-e-phase3b-attempt13-result-2026-07-03/);
  assert.match(index, /RUNNER_LOST_COMMUNICATION/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("12 attempt12 result doc unaffected (traceability chain intact)", () => {
  const doc = readRepo(ATTEMPT12_RESULT);
  assert.match(doc, /RUNNER_CANCELLED/);
});

test("13 attempt13 result doc — no gh workflow dispatch commands anywhere in this task's diff surface", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.doesNotMatch(doc, /gh\s+workflow\s+run\s+gate-e-phase3b-manual\.yml.{0,10}$/m);
});
