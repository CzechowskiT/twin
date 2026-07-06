/**
 * Gate E Phase 3B attempt 14 — split-batch — RUNNER_SHUTDOWN_SIGNAL / INCONCLUSIVE
 * (static, no browser).
 *
 * Attempt 14 (first live dispatch of the split-batch workflow, run 28771385932)
 * passed every scripted precondition in all 3 independent matrix batch jobs
 * (public-candidate, recruiter, company) — public-health 10/10, HTTP smoke
 * 10/10, static preflight guards, workers=1/retries=0, pre-run orphan check,
 * and even the canonical command's own "prod preflight" sub-test — then each
 * batch's independently-provisioned ephemeral runner received an identical
 * GitHub-provided shutdown-signal annotation (exit code 143) at wildly
 * different elapsed times (~2-3 minutes for two batches, ~25 minutes for the
 * third), with zero confirmed route-level evidence in any batch. This is a
 * third, distinct GitHub Actions infrastructure-failure signature — different
 * from attempt 12's RUNNER_CANCELLED and attempt 13's RUNNER_LOST_COMMUNICATION
 * — introducing RUNNER_SHUTDOWN_SIGNAL. Neither a product FAIL nor a Phase 3B
 * PASS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT14_RESULT = "docs/gate-e-phase3b-attempt14-result-2026-07-03.md";
const ATTEMPT13_RESULT = "docs/gate-e-phase3b-attempt13-result-2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt14 result doc exists — RUNNER_SHUTDOWN_SIGNAL, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 14 \(split-batch, isolated runner\) — RUNNER_SHUTDOWN_SIGNAL \/ INCONCLUSIVE/);
  assert.match(doc, /RUNNER_SHUTDOWN_SIGNAL/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt14 result doc — run id and head sha referenced, matches PR #377 split-batch branch state", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /28771385932/);
  assert.match(doc, /389e17c4/);
});

test("3 attempt14 result doc — all 3 batches' scripted preconditions passed before each shutdown signal", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /10\/10 x HTTP 200, status=ok, db_ok=true|10\/10 × HTTP 200/);
  assert.match(doc, /public-candidate/);
  assert.match(doc, /recruiter/);
  assert.match(doc, /\bcompany\b/);
});

test("4 attempt14 result doc — distinguishes its GitHub annotation from attempts 12 and 13", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /runner has received a shutdown signal/i);
  assert.match(doc, /exit code 143/i);
  assert.match(doc, /The operation was canceled\./);
  assert.match(doc, /RUNNER_CANCELLED/);
  assert.match(doc, /lost communication with the server/i);
  assert.match(doc, /RUNNER_LOST_COMMUNICATION/);
});

test("5 attempt14 result doc — zero routes confirmed across all 3 batches, artifacts mostly missing", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /0\/20 [Cc]onfirmed|0\/20 CONFIRMED/);
  assert.match(doc, /\| `public-candidate` \| 7 \| 0\/7 \|/);
  assert.match(doc, /\| `company` \| 6 \| 0\/6 \|/);
});

test("6 attempt14 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("7 attempt14 result doc — attempt 15 explicitly not authorized, no auto-retry", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /attempt 15.{0,60}not authorized/i);
  assert.doesNotMatch(doc, /attempt 15.{0,40}authoriz(ed|ation)(?!.{0,80}not)/i);
});

test("8 attempt14 result doc — token never exposed, prod requests read-only", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /NO token exposure/i);
  assert.match(doc, /read-only/i);
  assert.doesNotMatch(doc, /TWIN_ACCESS_TOKEN\s*[:=]\s*[A-Za-z0-9]{10,}/);
});

test("9 npm script test:gate-e-attempt14-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt14-result/);
  assert.match(pkg, /gate-e-attempt14-result\.test\.ts/);
});

test("10 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("11 evidence index references attempt 14 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 14|Attempt 14/);
  assert.match(index, /gate-e-phase3b-attempt14-result-2026-07-03/);
  assert.match(index, /RUNNER_SHUTDOWN_SIGNAL/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("12 attempt13 result doc unaffected (traceability chain intact)", () => {
  const doc = readRepo(ATTEMPT13_RESULT);
  assert.match(doc, /RUNNER_LOST_COMMUNICATION/);
});

test("13 attempt14 result doc — no gh workflow dispatch commands anywhere in this task's diff surface", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.doesNotMatch(doc, /gh\s+workflow\s+run\s+gate-e-phase3b-manual\.yml.{0,10}$/m);
});
