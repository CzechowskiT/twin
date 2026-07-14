/** Fixture governance — waveStackWith073 and migration fixtures must stay honest. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  validateChainSegment,
  waveStackWith073Fixture,
} from "./lib/alembic-migration-graph";

test("1 waveStackWith073 fixture is linear", () => {
  const fixture = waveStackWith073Fixture();
  const result = validateChainSegment(fixture, [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
    "073_candidate_referrals",
  ]);
  assert.equal(result.ok, true);
});

test("2 fixture file names match revision pattern", () => {
  for (const m of waveStackWith073Fixture()) {
    assert.match(m.file, /\.py$/);
    assert.ok(m.revision.length > 3);
  }
});

test("3 integration sim core imports fixture", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "lib/integration-simulator-core.ts"),
    "utf8",
  );
  assert.match(src, /waveStackWith073Fixture/);
});

test("4 repo 073 migration file present and chained on merged scaffold", () => {
  const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const versionsDir = join(repo, "backend/alembic/versions");
  const files = readdirSync(versionsDir);
  const file073 = files.find((f) => f.includes("073_candidate_referrals"));
  assert.ok(file073, "073_candidate_referrals migration must exist after full train merge");
  const src = readFileSync(join(versionsDir, file073!), "utf8");
  assert.match(src, /revision:\s*str\s*=\s*["']073_candidate_referrals["']/);
  assert.match(src, /down_revision.*072_recruiter_talent_pool_trust_review_c2/);
});
