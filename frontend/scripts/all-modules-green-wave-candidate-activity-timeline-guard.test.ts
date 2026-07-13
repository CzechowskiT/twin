/**
 * Candidate activity timeline guard — Wave 077 / PR #455 (tooling branch suite).
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
const SMOKE_DOC = "docs/FOUNDER_SMOKE_RUNBOOKS_C3_C5_CANDIDATE_TIMELINE_2026-07-13.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 decision doc references candidate timeline 077", () => {
  const doc = readRepo(DECISION_DOC);
  assert.match(doc, /077_candidate_activity_timeline|candidate.*timeline/i);
  assert.match(doc, /Candidate/i);
});

test("2 smoke runbook exists for candidate timeline", () => {
  const doc = readRepo(SMOKE_DOC);
  assert.match(doc, /candidate/i);
  assert.match(doc, /timeline|activity/i);
});

test("3 migration chain fixture single head 077", () => {
  assert.equal(WAVE_070_077_CHAIN[WAVE_070_077_CHAIN.length - 1], "077_candidate_activity_timeline");
});

test("4 API contract candidate timeline", () => {
  assert.equal(WAVE_API_CONTRACTS.CANDIDATE_TIMELINE.pr, 455);
  assert.match(WAVE_API_CONTRACTS.CANDIDATE_TIMELINE.path, /candidates\/me/);
});

test("5 manifest expected head 077", () => {
  const manifest = JSON.parse(readRepo(MANIFEST)) as { expectedHead?: string };
  assert.equal(manifest.expectedHead, "077_candidate_activity_timeline");
});

test("6 candidate timeline PILOT stance in decision doc", () => {
  assert.match(readRepo(DECISION_DOC), /PILOT|NO-GO/);
});
