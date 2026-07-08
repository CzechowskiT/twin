/**
 * Gate E Phase 3B attempt 9 — ABORTED_RESOURCE_SAFETY / MANUAL_ABORT (static, no browser).
 *
 * Attempt 9 confirmed AC power connected (resolving attempt 8's blocker), but
 * the operator manually aborted the attempt *before* any Playwright
 * invocation because no automated, code-enforced resource watchdog exists
 * yet — the exact residual risk flagged (but not closed) by the attempt 7
 * execution guarantee. Zero browser processes, zero Phase 3B routes
 * evaluated, no `.diagnostics` output. This is neither a product FAIL nor a
 * Phase 3B PASS, and attempt 10 is explicitly BLOCKED until a resource
 * watchdog is merged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT9_RESULT = "docs/gate-e-phase3b-attempt9-result-2026-07-02.md";
const ATTEMPT8_RESULT = "docs/gate-e-phase3b-attempt8-result-2026-07-02.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

const CANONICAL_PROD_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "npm run test:phase3b-controlled-multitab-prod",
];

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt9 result doc exists — ABORTED_RESOURCE_SAFETY / MANUAL_ABORT, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 9 — ABORTED_RESOURCE_SAFETY \/ MANUAL_ABORT/);
  assert.match(doc, /ABORTED_RESOURCE_SAFETY \/ MANUAL_ABORT/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt9 result doc — AC power PASSED this attempt (resolves attempt 8 blocker)", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /AC power connected.*PASS|AC power.*confirmed PASS/i);
  assert.match(doc, /AC Power/);
  assert.match(doc, /Precondition #4 \(AC power connected\) was checked and PASSED/);
});

test("3 attempt9 result doc — MANUAL_ABORT before Playwright invocation, distinct from attempts 6/8", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /MANUAL_ABORT/);
  assert.match(doc, /before.{0,40}Playwright invocation|before any Playwright/i);
  assert.match(doc, /attempt 6/i);
  assert.match(doc, /attempt 8/i);
});

test("4 attempt9 result doc — zero browser processes, zero routes, no diagnostics committed", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /Browser processes launched:\s*0/);
  assert.match(doc, /Routes evaluated:\s*0/);
  assert.match(doc, /\.diagnostics files produced\/committed:\s*0/);
  assert.match(doc, /chrome-headless-shell count after this task:\s*0/);
  assert.match(doc, /playwright\/npm phase3b process count after:\s*0/);
  for (const part of CANONICAL_PROD_COMMAND_PARTS) {
    assert.ok(doc.includes(part), `expected doc to include canonical command part: ${part}`);
  }
  assert.match(doc, /NOT INVOKED/);
});

test("5 attempt9 result doc — branch and no-prior-result-doc facts recorded", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /docs\/gate-e-attempt9-result-2026-07-02/);
  assert.match(doc, /already existed|existed before this task/i);
  assert.match(doc, /did not exist|Did not exist/);
  assert.match(doc, /working tree.*clean|clean.*working tree/i);
});

test("6 attempt9 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Phase 3B \(attempt 9\):\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("7 attempt9 result doc — attempt 10 explicitly BLOCKED pending resource watchdog", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /Attempt 10.{0,10}BLOCKED/i);
  assert.match(doc, /phase3b-resource-watchdog\.ts/);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG/);
  assert.match(doc, /phase3b-resource-watchdog\.test\.ts/);
  assert.doesNotMatch(doc, /[Aa]ttempt 10.{0,40}(authorized|AUTHORIZED)(?!.{0,80}NOT)/);
});

test("8 attempt9 result doc — prior 0/20 FAIL unchanged, references attempt 8", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /0\/20/);
  assert.match(doc, /gate-e-phase3b-attempt8-result-2026-07-02/);
  const attempt8 = readRepo(ATTEMPT8_RESULT);
  assert.match(attempt8, /PRECONDITION_FAILED/);
});

test("9 attempt9 result doc — hard bans honoured table present, all confirmed", () => {
  const doc = readRepo(ATTEMPT9_RESULT);
  assert.match(doc, /Hard Bans Honoured/);
  assert.match(doc, /NO second retry/);
  assert.match(doc, /NO backend\/API\/auth\/DB\/env\/`smoke\.yml` changes/);
});

test("10 npm script test:gate-e-attempt9-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt9-result/);
  assert.match(pkg, /gate-e-attempt9-result\.test\.ts/);
});

test("11 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("12 evidence index references attempt 9 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 9|Attempt 9/);
  assert.match(index, /gate-e-phase3b-attempt9-result-2026-07-02/);
  assert.match(index, /MANUAL_ABORT/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});
