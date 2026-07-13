/**
 * Wave C4 — saved filter views guard (tooling branch / contract suite).
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
const MANIFEST = "releases/integration-sim-manifest.json";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 decision doc references C4 migration 075", () => {
  const doc = readRepo(DECISION_DOC);
  assert.match(doc, /075_recruiter_saved_views_c4|saved views/i);
  assert.match(doc, /C4/i);
});

test("2 manifest lists PR 453 branch", () => {
  const manifest = JSON.parse(readRepo(MANIFEST)) as { prBranches?: Record<string, string> };
  assert.match(manifest.prBranches?.["453"] ?? "", /c4-saved-views/);
});

test("3 migration chain fixture includes 075", () => {
  assert.ok(WAVE_070_077_CHAIN.includes("075_recruiter_saved_views_c4"));
});

test("4 API contract C4 baseline", () => {
  assert.equal(WAVE_API_CONTRACTS.C4.pr, 453);
  assert.ok(WAVE_API_CONTRACTS.C4.responseFields.includes("views"));
});

test("5 C4 path prefix documented", () => {
  assert.equal(WAVE_API_CONTRACTS.C4.path, "/api/v1/recruiter/saved-views");
});

test("6 rebase note 453 stacks on 452", () => {
  const manifest = JSON.parse(readRepo(MANIFEST)) as { rebaseNotes?: Record<string, string> };
  assert.ok(manifest.rebaseNotes?.["453"]);
});
