/**
 * Gate F founder decision record — static guard (2026-07-09 morning).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const DECISION_RECORD = "docs/GATE_F_FOUNDER_DECISION_RECORD_2026-07-09.md";
const REVIEW_PACKAGE = "docs/GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function record(): string {
  return readRepo(DECISION_RECORD);
}

test("1 gate F founder decision record exists", () => {
  const doc = record();
  assert.match(doc, /Gate F Founder Decision Record.*2026-07-09/);
  assert.ok(doc.length > 800, "decision record must not be empty");
});

test("2 references M1–M12 manual smoke results", () => {
  const doc = record();
  assert.match(doc, /M1–M12|M1-M12/);
  assert.match(doc, /NEEDS_REVIEW/);
  assert.match(doc, /PASS/);
  readRepo(REVIEW_PACKAGE);
});

test("3 contains Gate F YES NO PENDING options", () => {
  const doc = record();
  assert.match(doc, /Gate F = YES/);
  assert.match(doc, /Gate F = NO/);
  assert.match(doc, /Gate F = PENDING/);
});

test("4 says Gate F YES is not Launch GO", () => {
  const doc = record();
  assert.match(doc, /Gate F YES.*Launch GO|Gate F YES ≠ Launch GO/i);
});

test("5 says Launch GO requires separate founder decision", () => {
  const doc = record();
  assert.match(doc, /Launch GO requires.*separate founder decision/i);
  assert.match(doc, /separate founder decision/i);
});

test("6 says Public launch remains NO-GO", () => {
  const doc = record();
  assert.match(doc, /Public launch remains NO-GO|Launch.*NO-GO/i);
  assert.match(doc, /\*\*Launch:\*\* NO-GO/);
});

test("7 references S9 and L6 founder decisions", () => {
  const doc = record();
  assert.match(doc, /S9/);
  assert.match(doc, /PYSEC-2026-1325/);
  assert.match(doc, /L6/);
  assert.match(doc, /DSR/i);
});

test("8 references delegated apply OFF and auto-apply PAUSED", () => {
  const doc = record();
  assert.match(doc, /delegated apply.*OFF|Delegated apply.*OFF/i);
  assert.match(doc, /auto-apply.*PAUSED|Auto-apply.*PAUSED/i);
});

test("9 preserves P0 CLOSED Gate E PASS Gate F PENDING Launch NO-GO", () => {
  const doc = record();
  assert.match(doc, /P0.*CLOSED/i);
  assert.match(doc, /Gate E.*PASS/i);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /Launch.*NO-GO/i);
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
});

test("10 npm script test:gate-f-founder-decision-record-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:gate-f-founder-decision-record-guard":/);
  assert.match(pkgJson, /gate-f-founder-decision-record-guard\.test\.ts/);
});
