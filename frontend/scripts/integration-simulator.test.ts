/**
 * Integration simulator core — fixture and dry-run paths.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  validateFixturePostMerge,
  validatePostMergeMigrations,
  formatSimulatorMarkdown,
  type SimulatorReport,
} from "./lib/integration-simulator-core";
import { waveStackWith073Fixture } from "./lib/alembic-migration-graph";

test("1 fixture post-merge migration PASS", () => {
  const r = validateFixturePostMerge();
  assert.equal(r.ok, true);
  assert.equal(r.head, "073_candidate_referrals");
});

test("2 duplicate revision fails", () => {
  const fixture = waveStackWith073Fixture();
  fixture.push({
    file: "dup.py",
    revision: "073_candidate_referrals",
    downRevision: "072_recruiter_talent_pool_trust_review_c2",
  });
  const r = validatePostMergeMigrations(fixture);
  assert.equal(r.ok, false);
});

test("3 broken chain fails", () => {
  const fixture = waveStackWith073Fixture();
  fixture[3] = { ...fixture[3], downRevision: "070_candidate_trust_center" };
  const r = validatePostMergeMigrations(fixture);
  assert.equal(r.ok, false);
});

test("4 format markdown includes exit code", () => {
  const report: SimulatorReport = {
    schemaVersion: "1",
    startedAt: "2026-07-13T00:00:00Z",
    scaffoldSha: "c2a08b0",
    mergeSequence: [449, 450, 448],
    conflicts: [],
    migration: validateFixturePostMerge(),
    testsRun: [],
    testsPassed: true,
    cleanup: true,
    exitCode: 0,
  };
  const md = formatSimulatorMarkdown(report);
  assert.match(md, /Exit code.*0/);
  assert.match(md, /073_candidate_referrals/);
});

test("5 dry-run simulator exits 0 on partial branch", async () => {
  const { execSync } = await import("node:child_process");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    execSync("npx --yes tsx scripts/integration-simulator.ts --dry-run", {
      cwd: repo,
      stdio: "pipe",
    });
  } catch (e) {
    const err = e as { status?: number };
    assert.equal(err.status, 0, "dry-run should exit 0 on #450 partial graph");
  }
});

test("6 npm script registered", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pkg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8");
  assert.match(pkg, /sim:integration-pr448-449-450/);
});
