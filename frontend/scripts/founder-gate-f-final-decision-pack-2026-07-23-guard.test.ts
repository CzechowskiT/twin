/**
 * Founder Gate F final decision pack 2026-07-23 — static guard (no browser).
 * After Option 3: Gate F technical PASS recorded; Pilot/Launch holds remain.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACK = "docs/FOUNDER_GATE_F_FINAL_DECISION_PACK_2026-07-23.md";
const RECORD = "docs/FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md";
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

test("3 Option 3 Gate F PASS recorded; Launch remains NO-GO", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /Option 3 approved/i);
  assert.match(doc, /Gate F technical PASS|Gate F = YES \(technical\)/i);
  assert.match(doc, /Launch.*NO-GO/i);
  assert.match(doc, /Gate F (technical )?PASS ≠ Launch GO|Gate F YES ≠ Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(doc, /set Launch GO, Pilot GO, or enrollment ON(?!\.)/i);
  assert.match(doc, /does \*\*not\*\* set Launch GO, Pilot GO, or enrollment ON/i);
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

test("6 Option 3 approved with firewall against Pilot/Launch auto-flip", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /Option 3 approved/i);
  assert.match(doc, /no automatic stance propagation|Slack connector not promoted/i);
  assert.match(doc, /BLOCKED_BY_FOUNDER/);
  assert.match(doc, /Launch remains \*\*NO-GO\*\*|Launch `NO-GO`/i);
});

test("7 Hard LIVE counts documented", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /PASS \*\*122\*\*|PASS \| 122/);
  assert.match(doc, /HELD_POLICY \*\*30\*\*|HELD_POLICY \| 30/);
  assert.match(doc, /BLOCKED_EXTERNAL \*\*1\*\*|BLOCKED_EXTERNAL_CREDENTIALS \| 1/);
});

test("8 pack has §8 sections A–G", () => {
  const doc = readRepo(PACK);
  assert.match(doc, /## A\. Technical verdict/);
  assert.match(doc, /## B\. Completed evidence/);
  assert.match(doc, /## C\. Remaining non-code items/);
  assert.match(doc, /## D\. Hard LIVE status/);
  assert.match(doc, /## E\. Founder decision matrix/);
  assert.match(doc, /## F\. Explicit decisions required from Founder/);
  assert.match(doc, /## G\. Recommended decision/);
});

test("9 handoff has §4 Slack sections", () => {
  const handoff = readRepo(HANDOFF);
  assert.match(handoff, /## Slack app setup/);
  assert.match(handoff, /## Environment variables/);
  assert.match(handoff, /## Validation/);
  assert.match(handoff, /## Security/);
  assert.match(handoff, /SLACK_INCOMING_WEBHOOK_URL/);
  assert.match(handoff, /TWIN_SLACK_WEBHOOK_URL/);
});

test("10 decision record records Option 3 formally", () => {
  const record = readRepo(RECORD);
  assert.match(record, /Option 3 approved/i);
  assert.match(record, /☑ PASS/);
  assert.match(record, /☑ ACCEPTED/);
  assert.match(record, /☑ MAINTAIN/);
  assert.match(record, /☑ BLOCKED/);
  assert.match(record, /☑ NO-GO/);
  assert.match(record, /☑ OFF/);
  assert.match(record, /BLOCKED_EXTERNAL_CREDENTIALS/);
  assert.match(record, /84a381d7742dd27b363ddc6ae5d9d6838a7a8a00/);
  assert.match(record, /Gate F technical PASS ≠ Pilot APPROVED ≠ Launch GO/);
});
