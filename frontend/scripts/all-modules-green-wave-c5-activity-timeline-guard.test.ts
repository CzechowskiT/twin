/**
 * Wave C5 — recruiter activity timeline guard (tooling branch / contract suite).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { WAVE_API_CONTRACTS } from "./lib/openapi-contract-baseline";
import { WAVE_070_077_CHAIN } from "./lib/alembic-migration-graph";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DECISION_DOC = "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C3_C5_2026-07-13.md";
const SECURITY_DOC = "docs/SECURITY_MATRIX_WAVE_C3_C5_2026-07-13.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 decision doc references C5 migration 076", () => {
  const doc = readRepo(DECISION_DOC);
  assert.match(doc, /076_recruiter_activity_timeline|activity timeline/i);
  assert.match(doc, /C5/i);
});

test("2 security matrix covers C5 tenancy", () => {
  const doc = readRepo(SECURITY_DOC);
  assert.match(doc, /C5|activity timeline/i);
  assert.match(doc, /tenancy|token/i);
});

test("3 migration chain fixture includes 076", () => {
  assert.ok(WAVE_070_077_CHAIN.includes("076_recruiter_activity_timeline_c5"));
});

test("4 API contract C5 baseline", () => {
  assert.equal(WAVE_API_CONTRACTS.C5.pr, 454);
  assert.ok(WAVE_API_CONTRACTS.C5.responseFields.includes("events"));
});

test("5 C5 read-only GET contract", () => {
  assert.deepEqual(WAVE_API_CONTRACTS.C5.methods, ["GET"]);
});

test("6 NO-GO in security doc", () => {
  assert.match(readRepo(SECURITY_DOC), /NO-GO|PENDING/);
});
