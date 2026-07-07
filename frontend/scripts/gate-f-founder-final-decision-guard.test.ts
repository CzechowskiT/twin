/**
 * Gate F founder final decision — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FINAL_DECISION = "docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md";
const EVIDENCE_LOG = "docs/GATE_F_EVIDENCE_COMPLETION_2026-07-07.md";
const P0_CLOSURE = "docs/P0_CLOSURE_DECISION_2026-07-07.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function finalDecision(): string {
  return readRepo(FINAL_DECISION);
}

test("1 founder final decision doc exists", () => {
  const doc = finalDecision();
  assert.match(doc, /Gate F Founder Final Decision/);
  assert.ok(doc.length > 500, "founder final decision must not be empty");
});

test("2 references Gate E PASS 20/20 and P0 CLOSED", () => {
  const doc = finalDecision();
  assert.match(doc, /20\/20/);
  assert.match(doc, /attempt 19/i);
  assert.match(doc, /Gate E.*PASS|PASS.*Gate E/i);
  assert.match(doc, /P0.*CLOSED/i);
  readRepo(P0_CLOSURE);
  readRepo(EVIDENCE_LOG);
});

test("3 references S9 NEEDS_REVIEW and P6 NEEDS_REVIEW", () => {
  const doc = finalDecision();
  assert.match(doc, /\*\*S9\*\*.*NEEDS_REVIEW|NEEDS_REVIEW.*\*\*S9\*\*/i);
  assert.match(doc, /\*\*P6\*\*.*NEEDS_REVIEW|NEEDS_REVIEW.*\*\*P6\*\*/i);
  assert.match(doc, /PYSEC-2026-1325/);
});

test("4 includes Gate F YES NO PENDING choices", () => {
  const doc = finalDecision();
  assert.match(doc, /Gate F = YES/);
  assert.match(doc, /Gate F = NO/);
  assert.match(doc, /Gate F = PENDING/);
});

test("5 says Gate F YES is not Launch GO", () => {
  const doc = finalDecision();
  assert.match(doc, /Gate F YES.*Launch GO|Launch GO.*Gate F YES/i);
  assert.match(doc, /Gate F YES ≠ Launch GO|Gate F YES does not grant Launch GO/i);
});

test("6 says Launch GO requires separate founder decision", () => {
  const doc = finalDecision();
  assert.match(doc, /Launch GO requires.*separate founder decision/i);
  assert.match(doc, /separate founder decision/i);
});

test("7 says Launch remains NO-GO", () => {
  const doc = finalDecision();
  assert.match(doc, /Launch.*NO-GO|NO-GO.*Launch/i);
  assert.match(doc, /Launch remains NO-GO/i);
});

test("8 does NOT declare Gate F YES already decided", () => {
  const doc = finalDecision();
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /No Gate F YES decided/i);
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Gate F = \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Founder choice \(record\):\s*YES/i);
});

test("9 does NOT declare Launch GO", () => {
  const doc = finalDecision();
  assert.match(doc, /No Launch GO/i);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /Launch GO granted/i);
  assert.doesNotMatch(doc, /Public launch:\s*\*\*GO\*\*/i);
});

test("10 npm script test:gate-f-founder-final-decision-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-founder-final-decision-guard":/);
  assert.match(pkgJson, /gate-f-founder-final-decision-guard\.test\.ts/);
});
