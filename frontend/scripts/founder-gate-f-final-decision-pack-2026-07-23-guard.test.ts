/**
 * Founder Gate F final decision pack 2026-07-23 — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACK = "docs/FOUNDER_GATE_F_FINAL_DECISION_PACK_2026-07-23.md";
const O7 = "docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md";
const HANDOFF = "docs/EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 decision pack exists and is non-empty", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /Founder Gate F — Final Decision Pack/);
  assert.ok(doc.length > 800);
});

test("2 includes Options 1–3 matrix", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /### Option 1/);
  assert.match(doc, /### Option 2/);
  assert.match(doc, /### Option 3/);
  assert.match(doc, /consequences/i);
  assert.match(doc, /Risk/);
  assert.match(doc, /Required action/i);
});

test("3 does not flip Gate F YES or Launch GO", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /Gate F.*PENDING/i);
  assert.match(doc, /Launch.*NO-GO/i);
  assert.match(doc, /No Gate F YES decided/i);
  assert.match(doc, /Gate F YES ≠ Launch GO/);
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Founder choice \(record\):\s*YES/i);
});

test("4 keeps Pilot BLOCKED_BY_FOUNDER", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /BLOCKED_BY_FOUNDER/);
  assert.match(doc, /Pilot/);
});

test("5 references O7 PASS and Slack BLOCKED", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /o7-r020-20260723T065951Z/);
  assert.match(doc, /plat_slack_connector|Slack/);
  assert.match(doc, /BLOCKED_EXTERNAL/);
  readRepo(O7);
  readRepo(HANDOFF);
});

test("6 recommends Option 3 without applying stance", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /Recommend Option 3/i);
  assert.match(doc, /advisory only/i);
});

test("7 Hard LIVE counts documented", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /PASS \*\*122\*\*/);
  assert.match(doc, /HELD_POLICY \*\*30\*\*/);
  assert.match(doc, /BLOCKED_EXTERNAL \*\*1\*\*/);
});
