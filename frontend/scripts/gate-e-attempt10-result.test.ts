/**
 * Gate E Phase 3B attempt 10 — USER_ABORTED / INCONCLUSIVE (static, no browser).
 *
 * Attempt 10 ran with the merged resource watchdog in place (chrome-headless-
 * shell counters at 0), but the operator manually aborted after observing
 * real Chrome/Chromium memory/process pressure the watchdog's narrow,
 * single-process-name detection could not see or report. Zero route-level
 * evidence was produced. This is neither a product FAIL nor a Phase 3B PASS,
 * and attempt 11 is explicitly BLOCKED until the companion macOS
 * process-detection hardening is merged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT10_RESULT = "docs/gate-e-phase3b-attempt10-result-2026-07-03.md";
const ATTEMPT9_RESULT = "docs/gate-e-phase3b-attempt9-result-2026-07-02.md";
const MACOS_DETECTION_DOC = "docs/PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md";
const WATCHDOG_DOC = "docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";

const CANONICAL_PROD_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "PHASE3B_RESOURCE_WATCHDOG=1",
  "npm run test:phase3b-controlled-multitab-prod",
] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt10 result doc exists — USER_ABORTED, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 10 — USER_ABORTED \/ INCONCLUSIVE/);
  assert.match(doc, /USER_ABORTED/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt10 result doc — resource/process detection confidence gap, not a scripted precondition failure", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /confidence gap/i);
  assert.match(doc, /chrome-headless-shell=0|chrome-headless-shell.{0,10}0/i);
  assert.match(doc, /Chrome\/Chromium (memory|process)? ?pressure/i);
  assert.match(doc, /No scripted precondition failed|watchdog's own preflight.*passed/i);
});

test("3 attempt10 result doc — distinct from MANUAL_ABORT (attempt 9) and ABORTED_RESOURCE_SAFETY (attempts 1/6)", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /MANUAL_ABORT/);
  assert.match(doc, /ABORTED_RESOURCE_SAFETY/);
  assert.match(doc, /attempt 9/i);
  assert.match(doc, /attempt 6/i);
});

test("4 attempt10 result doc — zero routes evaluated, no diagnostics committed", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /Routes evaluated:\s*0/);
  assert.match(doc, /\.diagnostics files produced\/committed:\s*0/);
  assert.match(doc, /chrome-headless-shell count after this task:\s*0/);
  assert.match(doc, /playwright\/npm phase3b process count after:\s*0/);
  for (const part of CANONICAL_PROD_COMMAND_PARTS) {
    assert.ok(doc.includes(part), `expected doc to include canonical command part: ${part}`);
  }
  assert.match(doc, /NOT COMPLETED/);
});

test("5 attempt10 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Phase 3B \(attempt 10\):\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("6 attempt10 result doc — attempt 11 explicitly BLOCKED pending macOS process-detection hardening", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /[Aa]ttempt 11.{0,10}BLOCKED/);
  assert.match(doc, /PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03/);
  assert.doesNotMatch(doc, /[Aa]ttempt 11.{0,40}(authorized|AUTHORIZED)(?!.{0,80}NOT)/);
});

test("7 attempt10 result doc — prior 0/20 FAIL unchanged, references attempt 9 and the resource watchdog", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /0\/20/);
  assert.match(doc, /gate-e-phase3b-attempt9-result-2026-07-02/);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG_2026-07-03/);
  const attempt9 = readRepo(ATTEMPT9_RESULT);
  assert.match(attempt9, /MANUAL_ABORT/);
});

test("8 attempt10 result doc — hard bans honoured table present, all confirmed", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /Hard Bans Honoured/);
  assert.match(doc, /NO backend\/API\/auth\/DB\/env\/`smoke\.yml` changes/);
  assert.match(doc, /NO attempt 11 execution or authorization/);
});

test("9 npm script test:gate-e-attempt10-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt10-result/);
  assert.match(pkg, /gate-e-attempt10-result\.test\.ts/);
});

test("10 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("11 evidence index references attempt 10 with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /attempt 10|Attempt 10/);
  assert.match(index, /gate-e-phase3b-attempt10-result-2026-07-03/);
  assert.match(index, /USER_ABORTED/);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("12 macOS process detection doc is cross-linked from the attempt10 result and vice versa", () => {
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03\.md/);
  const macosDoc = readRepo(MACOS_DETECTION_DOC);
  assert.match(macosDoc, /gate-e-phase3b-attempt10-result-2026-07-03\.md/);
});

test("13 resource watchdog doc still exists and is referenced (traceability chain intact)", () => {
  const watchdogDoc = readRepo(WATCHDOG_DOC);
  assert.ok(watchdogDoc.length > 0);
  const doc = readRepo(ATTEMPT10_RESULT);
  assert.match(doc, /PHASE3B_RESOURCE_WATCHDOG_2026-07-03\.md/);
});
