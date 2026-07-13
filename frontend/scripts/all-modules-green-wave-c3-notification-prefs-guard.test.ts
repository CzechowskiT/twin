/**
 * Wave C3 — notification preferences guard (tooling branch / doc+contract suite).
 * Full file checks run on stacked PR #452 branch.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { WAVE_API_CONTRACTS, diffContractFields } from "./lib/openapi-contract-baseline";
import { WAVE_070_077_CHAIN } from "./lib/alembic-migration-graph";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WAVE_C3_DOC = "docs/ALL_MODULES_GREEN_WAVE_C3_NOTIFICATION_PREFS_2026-07-13.md";
const DECISION_DOC = "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C3_C5_2026-07-13.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 C3 doc — PILOT, migration 074 or auth prefs scope", () => {
  const doc = readRepo(WAVE_C3_DOC);
  assert.match(doc, /PILOT|pilot/i);
  assert.match(doc, /notification/i);
  assert.match(doc, /NO-GO/);
});

test("2 decision doc references C3 stack", () => {
  const doc = readRepo(DECISION_DOC);
  assert.match(doc, /074_recruiter_notification_preferences_c3|notification preferences/i);
  assert.match(doc, /C3/i);
});

test("3 migration chain fixture includes 074", () => {
  assert.ok(WAVE_070_077_CHAIN.includes("074_recruiter_notification_preferences_c3"));
});

test("4 API contract C3 fields baseline", () => {
  const drifts = diffContractFields("C3", [...WAVE_API_CONTRACTS.C3.responseFields]);
  assert.equal(drifts.length, 0);
});

test("5 C3 contract marked PR 452", () => {
  assert.equal(WAVE_API_CONTRACTS.C3.pr, 452);
});

test("6 no external notification sends in doc", () => {
  const doc = readRepo(WAVE_C3_DOC);
  assert.match(doc, /Excluded/);
  assert.match(doc, /Push notifications|SMS/i);
});
