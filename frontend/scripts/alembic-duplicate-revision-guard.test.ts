/**
 * Alembic migration chain guard — no duplicate revision IDs; linear 070→071→072;
 * fixture tests for graph validation including post-merge 073 chain.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildChain,
  findBrokenParents,
  findCycle,
  findDuplicateRevisions,
  findHeads,
  findOrphans,
  parseMigrationSource,
  validateChainSegment,
  validateLinearChain,
  waveStackWith073Fixture,
  type MigrationMeta,
} from "./lib/alembic-migration-graph";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSIONS_DIR = join(repoRoot, "backend/alembic/versions");

function loadRepoMigrations(): MigrationMeta[] {
  return readdirSync(VERSIONS_DIR)
    .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
    .map((file) => parseMigrationSource(file, readFileSync(join(VERSIONS_DIR, file), "utf8")));
}

test("fixture — linear graph 070→071→072→073 validates", () => {
  const fixture = waveStackWith073Fixture();
  const result = validateChainSegment(fixture, [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
    "073_candidate_referrals",
  ]);
  assert.equal(result.ok, true);
});

test("fixture — duplicate revision detected", () => {
  const fixture = waveStackWith073Fixture();
  fixture.push({
    file: "071_dup.py",
    revision: "071_recruiter_workspace_activation",
    downRevision: "070_candidate_trust_center",
  });
  const dupes = findDuplicateRevisions(fixture);
  assert.ok(dupes.length > 0);
  assert.match(dupes[0], /071_recruiter_workspace_activation/);
});

test("fixture — broken parent detected", () => {
  const broken: MigrationMeta[] = [
    { file: "a.py", revision: "070_candidate_trust_center", downRevision: "069_missing" },
  ];
  const parents = findBrokenParents(broken);
  assert.equal(parents.length, 1);
  assert.match(parents[0], /missing parent 069_missing/);
});

test("fixture — cycle detected", () => {
  const cyclic: MigrationMeta[] = [
    { file: "a.py", revision: "rev_a", downRevision: "rev_c" },
    { file: "b.py", revision: "rev_b", downRevision: "rev_a" },
    { file: "c.py", revision: "rev_c", downRevision: "rev_b" },
  ];
  const cycle = findCycle(cyclic);
  assert.ok(cycle);
  assert.ok(cycle!.length >= 3);
});

test("fixture — multiple heads detected", () => {
  const multiHead: MigrationMeta[] = [
    { file: "a.py", revision: "070_candidate_trust_center", downRevision: null },
    { file: "b.py", revision: "071_recruiter_workspace_activation", downRevision: "070_candidate_trust_center" },
    { file: "c.py", revision: "orphan_head", downRevision: null },
  ];
  const heads = findHeads(multiHead);
  assert.equal(heads.length, 2);
  assert.ok(heads.includes("071_recruiter_workspace_activation"));
  assert.ok(heads.includes("orphan_head"));
});

test("1 repo — no duplicate Alembic revision IDs", () => {
  const migrations = loadRepoMigrations();
  const duplicates = findDuplicateRevisions(migrations);
  assert.equal(duplicates.length, 0, `duplicate revisions: ${duplicates.join("; ")}`);
});

test("2 repo — wave stack chain 070 → 071 → 072 is linear on #450 branch", () => {
  const migrations = loadRepoMigrations();
  const byRevision = new Map(migrations.map((m) => [m.revision, m]));
  assert.ok(byRevision.has("070_candidate_trust_center"));
  assert.ok(byRevision.has("071_recruiter_workspace_activation"));
  assert.ok(byRevision.has("072_recruiter_talent_pool_trust_review_c2"));

  const wave = ["070_candidate_trust_center", "071_recruiter_workspace_activation", "072_recruiter_talent_pool_trust_review_c2"];
  const subset = migrations.filter((m) => wave.includes(m.revision));
  const result = validateChainSegment(subset, wave);
  assert.equal(result.ok, true, !result.ok ? result.reason : "");
});

test("3 repo — #448 referrals must not use revision 071 on merged scaffold stack", () => {
  const migrations = loadRepoMigrations();
  const conflict = migrations.find((m) => m.revision === "071_candidate_referrals");
  assert.equal(
    conflict,
    undefined,
    `#448 must renumber to 073_candidate_referrals before merge (found ${conflict?.file})`,
  );
});

test("4 repo — 073 not on #450 branch alone (honest partial graph)", () => {
  const migrations = loadRepoMigrations();
  const has073 = migrations.some((m) => m.revision === "073_candidate_referrals");
  assert.equal(
    has073,
    false,
    "073_candidate_referrals belongs on #448 branch after rebase — do not fake full graph PASS on #450 alone",
  );
  const chain = buildChain("070_candidate_trust_center", migrations);
  assert.deepEqual(chain.slice(0, 3), [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
  ]);
});

test("5 fixture — full 070→071→072→073 post-merge chain documented", () => {
  const fixture = waveStackWith073Fixture();
  const chain = buildChain("070_candidate_trust_center", fixture);
  assert.deepEqual(chain, [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
    "073_candidate_referrals",
  ]);
});

test("6 integration readiness doc references migration plan", () => {
  const doc = readFileSync(
    join(repoRoot, "docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md"),
    "utf8",
  );
  assert.match(doc, /073_candidate_referrals/);
  assert.match(doc, /071_recruiter_workspace_activation/);
  assert.match(doc, /072_recruiter_talent_pool_trust_review_c2/);
  assert.match(doc, /rebase.*#450|after #450/i);
});

test("7 npm scripts registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:alembic-duplicate-revision-guard/);
  assert.match(pkg, /founder-smoke-env-preflight/);
  assert.match(pkg, /preview-reachability-preflight/);
});

test("8 fixture — orphans detected", () => {
  const orphan: MigrationMeta[] = [
    { file: "root.py", revision: "070_candidate_trust_center", downRevision: null },
    { file: "orphan.py", revision: "orphan_rev", downRevision: "missing_parent" },
  ];
  const orphans = findOrphans(orphan);
  assert.ok(orphans.includes("orphan_rev"));
});

test("9 repo — wave chain reachable from 070 parent in full graph", () => {
  const migrations = loadRepoMigrations();
  const byRev = new Map(migrations.map((m) => [m.revision, m]));
  const m070 = byRev.get("070_candidate_trust_center");
  assert.ok(m070);
  assert.ok(m070!.downRevision && byRev.has(m070!.downRevision), "070 parent exists in repo");
  const chain = buildChain("070_candidate_trust_center", migrations);
  assert.ok(chain.includes("072_recruiter_talent_pool_trust_review_c2"));
});
