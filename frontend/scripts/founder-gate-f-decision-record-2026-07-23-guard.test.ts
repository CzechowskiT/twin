/**
 * Founder Gate F decision record 2026-07-23 — Option 3 formal decision guard.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RECORD = "docs/FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 decision record exists", () => {
  const doc = readRepo(RECORD);
  assert.match(doc, /Founder Gate F — Formal Decision Record \(2026-07-23\)/);
  assert.ok(doc.length > 600);
});

test("2 Option 3 Gate F PASS + Slack exception ACCEPTED", () => {
  const doc = readRepo(RECORD);
  assert.match(doc, /Option 3 approved/i);
  assert.match(doc, /Gate F \| ☑ PASS/);
  assert.match(doc, /Slack exception \| ☑ ACCEPTED/);
  assert.match(doc, /O7 evidence.*☑ ACCEPTED/s);
});

test("3 holds remain: Pilot BLOCKED, Launch NO-GO, Enrollment OFF, Phase 3B BLOCKED", () => {
  const doc = readRepo(RECORD);
  assert.match(doc, /Pilot \| ☑ BLOCKED/);
  assert.match(doc, /Launch \| ☑ NO-GO/);
  assert.match(doc, /Enrollment \| ☑ OFF/);
  assert.match(doc, /Phase 3B \| ☑ BLOCKED/);
  assert.match(doc, /BLOCKED_BY_FOUNDER/);
});

test("4 HELD_POLICY MAINTAIN 30; Slack not promoted", () => {
  const doc = readRepo(RECORD);
  assert.match(doc, /HELD_POLICY \(30\) \| ☑ MAINTAIN/);
  assert.match(doc, /MAINTAIN \(30\)/);
  assert.match(doc, /BLOCKED_EXTERNAL_CREDENTIALS/);
  assert.match(doc, /not promoted/i);
  assert.match(doc, /No automatic stance propagation/i);
});

test("5 canonical decision SHA recorded", () => {
  const doc = readRepo(RECORD);
  assert.match(doc, /84a381d7742dd27b363ddc6ae5d9d6838a7a8a00/);
  assert.match(doc, /Gate F technical PASS ≠ Pilot APPROVED ≠ Launch GO/);
});

test("6 npm script registered", () => {
  const pkgJson = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkgJson, /"test:founder-gate-f-decision-record-2026-07-23-guard":/);
  assert.match(pkgJson, /founder-gate-f-decision-record-2026-07-23-guard\.test\.ts/);
});
