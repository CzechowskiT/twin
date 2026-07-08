/**
 * P0 closure decision — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const CLOSURE_DECISION = "docs/P0_CLOSURE_DECISION_2026-07-07.md";
const GATE_E_ATTEMPT_19 = "docs/gate-e-phase3b-attempt19-result-2026-07-06.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function closureDecision(): string {
  return readRepo(CLOSURE_DECISION);
}

test("1 P0 closure decision doc exists", () => {
  const doc = closureDecision();
  assert.match(doc, /P0 Closure Decision/);
  assert.ok(doc.length > 500, "closure decision must not be empty");
});

test("2 closure decision — says P0 CLOSED", () => {
  const doc = closureDecision();
  assert.match(doc, /P0 = CLOSED/);
  assert.match(doc, /\*\*P0:\*\* \*\*CLOSED\*\*/);
  assert.match(doc, /\*\*Decision:\*\* \*\*P0 = CLOSED\*\*/);
});

test("3 closure decision — references Gate E attempt 19", () => {
  const doc = closureDecision();
  assert.match(doc, /attempt 19/i);
  assert.match(doc, /gate-e-phase3b-attempt19-result-2026-07-06\.md/);
  assert.match(doc, /20\/20/);
  readRepo(GATE_E_ATTEMPT_19);
});

test("4 closure decision — references founder RSS smoke", () => {
  const doc = closureDecision();
  assert.match(doc, /founder.*RSS smoke|RSS smoke.*founder/i);
  assert.match(doc, /Founder RSS smoke observations/i);
  assert.match(doc, /P0_MULTITAB_RSS_SMOKE_RUNBOOK/);
});

test("5 closure decision — contains Performance 2.0 backlog", () => {
  const doc = closureDecision();
  assert.match(doc, /Performance 2\.0 backlog/i);
  assert.match(doc, /reduce Chrome RSS/i);
  assert.match(doc, /reduce memory pressure/i);
  assert.match(doc, /reduce swap usage/i);
  assert.match(doc, /multitab responsiveness/i);
  assert.match(doc, /dashboard rendering efficiency/i);
  assert.match(doc, /frontend performance optimization/i);
});

test("6 closure decision — Performance 2.0 is explicitly not P0", () => {
  const doc = closureDecision();
  assert.match(doc, /Performance 2\.0 is not P0/i);
  assert.match(doc, /not P0 blockers/i);
  assert.match(doc, /not P0 blocker/i);
});

test("7 closure decision — does NOT declare Gate F YES", () => {
  const doc = closureDecision();
  assert.match(doc, /Gate F: PENDING|Gate F.*PENDING/i);
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Gate F = \*\*YES\*\*/);
  assert.match(doc, /does not.*Gate F YES|P0 CLOSED does not grant Gate F YES/i);
});

test("8 closure decision — does NOT declare Launch GO", () => {
  const doc = closureDecision();
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /No Launch GO/i);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Launch GO granted/i);
  assert.match(doc, /P0 CLOSED does not grant Launch GO/i);
});

test("9 npm script test:p0-closure-decision-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:p0-closure-decision-guard":/);
  assert.match(pkgJson, /p0-closure-decision-guard\.test\.ts/);
});
