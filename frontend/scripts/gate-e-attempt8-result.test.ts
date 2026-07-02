/**
 * Gate E Phase 3B attempt 8 — PRECONDITION_FAILED at AC power (static, no browser).
 *
 * Attempt 8 checked all 10 mandatory preconditions before any Playwright
 * invocation. Preconditions #6/#7/#8 (prod public-health, HTTP smoke, deploy
 * alignment) — the blockers on attempts 6 and 7 — passed cleanly this time,
 * but precondition #4 (AC power connected) failed: the host was running on
 * battery power. Per the hard-stop rule, the run stopped before Playwright
 * was invoked. Zero browser processes, zero Phase 3B routes evaluated. This
 * is PRECONDITION_FAILED / INCONCLUSIVE — not a product FAIL, not a Phase 3B
 * PASS, not ABORTED_RESOURCE_SAFETY (no browser was ever started).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const ATTEMPT8_RESULT = "docs/gate-e-phase3b-attempt8-result-2026-07-02.md";
const ATTEMPT7_RESULT = "docs/gate-e-phase3b-attempt7-result-2026-06-29.md";

const CANONICAL_PROD_COMMAND_PARTS = [
  "PLAYWRIGHT_ALLOW_PROD_SMOKE=1",
  "PLAYWRIGHT_SKIP_WEBSERVER=1",
  "PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app",
  "npm run test:phase3b-controlled-multitab-prod",
];

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 attempt8 result doc exists — PRECONDITION_FAILED, INCONCLUSIVE", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /Gate E Phase 3B — Attempt 8 — PRECONDITION_FAILED/);
  assert.match(doc, /PRECONDITION_FAILED/);
  assert.match(doc, /INCONCLUSIVE/);
});

test("2 attempt8 result doc — failure isolated to precondition #4 (AC power), not health", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /Precondition #4 \(AC power connected\) FAILED/);
  assert.match(doc, /Battery Power/);
  assert.match(doc, /confirmed non-transient/i);
});

test("3 attempt8 result doc — preconditions #6/#7/#8 (health, smoke, alignment) all PASS", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /\| 6 \| GET `\/api\/public-health`.*\| \*\*PASS\*\*/);
  assert.match(doc, /\| 7 \| HTTP smoke — 10 routes all `200` \| \*\*PASS\*\*/);
  assert.match(doc, /\| 8 \| Frontend commit aligned with prod \| \*\*PASS\*\*/);
  assert.match(doc, /10\/10 x 200|10\/10 × 200|10\/10 x HTTP 200/i);
});

test("4 attempt8 result doc — gate stopped before Playwright; zero browser processes", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /STOP, no Playwright invocation/);
  assert.match(doc, /Browser processes launched:\s*0/);
  assert.match(doc, /Routes evaluated:\s*0/);
  for (const part of CANONICAL_PROD_COMMAND_PARTS) {
    assert.ok(doc.includes(part), `expected doc to include canonical command part: ${part}`);
  }
  assert.match(doc, /NOT INVOKED/);
});

test("5 attempt8 result doc — no overclaims (no Phase 3B PASS, no Launch GO, no P0 CLOSED, no Gate F YES)", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Phase 3B \(attempt 8\):\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /P0:\s*\*\*CLOSED\*\*/i);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /NO-GO/i);
});

test("6 attempt8 result doc — token presence boolean only, never a value", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /TWIN_ACCESS_TOKEN_PRESENT=true/);
  assert.doesNotMatch(doc, /TWIN_ACCESS_TOKEN=[^\s`]/);
});

test("7 attempt8 result doc — prior 0/20 FAIL unchanged, references attempt 7", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /0\/20/);
  assert.match(doc, /gate-e-phase3b-attempt7-result-2026-06-29/);
  const attempt7 = readRepo(ATTEMPT7_RESULT);
  assert.match(attempt7, /PRECONDITION_FAILED/);
});

test("8 attempt8 result doc — hard bans honoured table present, all confirmed", () => {
  const doc = readRepo(ATTEMPT8_RESULT);
  assert.match(doc, /Hard Bans Honoured/);
  assert.match(doc, /NO second retry/);
  assert.match(doc, /NO backend\/API\/auth\/DB\/env\/`smoke\.yml` changes/);
});

test("9 npm script test:gate-e-attempt8-result registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /test:gate-e-attempt8-result/);
  assert.match(pkg, /gate-e-attempt8-result\.test\.ts/);
});

test("10 smoke.yml — no Playwright; default CI browser disabled (unchanged)", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});
