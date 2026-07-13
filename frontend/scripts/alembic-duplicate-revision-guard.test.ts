/**
 * Alembic migration chain guard — no duplicate revision IDs; linear 070→071→072.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSIONS_DIR = join(repoRoot, "backend/alembic/versions");

const REVISION_RE = /revision:\s*str\s*=\s*["']([^"']+)["']/;
const DOWN_REVISION_RE = /down_revision:\s*[^=]*=\s*["']([^"']+)["']/;

type MigrationMeta = { file: string; revision: string; downRevision: string | null };

function loadMigrations(): MigrationMeta[] {
  return readdirSync(VERSIONS_DIR)
    .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
    .map((file) => {
      const src = readFileSync(join(VERSIONS_DIR, file), "utf8");
      const revMatch = src.match(REVISION_RE);
      const downMatch = src.match(DOWN_REVISION_RE);
      assert.ok(revMatch, `${file}: missing revision`);
      return {
        file,
        revision: revMatch[1],
        downRevision: downMatch?.[1] ?? null,
      };
    });
}

function buildChain(from: string, byDown: Map<string, MigrationMeta>): string[] {
  const chain = [from];
  while (true) {
    const child = [...byDown.values()].find((m) => m.downRevision === chain[chain.length - 1]);
    if (!child) break;
    chain.push(child.revision);
  }
  return chain;
}

test("1 no duplicate Alembic revision IDs", () => {
  const migrations = loadMigrations();
  const byRevision = new Map<string, string[]>();
  for (const m of migrations) {
    const files = byRevision.get(m.revision) ?? [];
    files.push(m.file);
    byRevision.set(m.revision, files);
  }
  const duplicates = [...byRevision.entries()].filter(([, files]) => files.length > 1);
  assert.equal(
    duplicates.length,
    0,
    `duplicate revisions: ${duplicates.map(([r, f]) => `${r} in ${f.join(", ")}`).join("; ")}`,
  );
});

test("2 wave stack chain 070 → 071 → 072 is linear", () => {
  const migrations = loadMigrations();
  const byRevision = new Map(migrations.map((m) => [m.revision, m]));
  assert.ok(byRevision.has("070_candidate_trust_center"));
  assert.ok(byRevision.has("071_recruiter_workspace_activation"));
  assert.ok(byRevision.has("072_recruiter_talent_pool_trust_review_c2"));

  assert.equal(
    byRevision.get("071_recruiter_workspace_activation")!.downRevision,
    "070_candidate_trust_center",
  );
  assert.equal(
    byRevision.get("072_recruiter_talent_pool_trust_review_c2")!.downRevision,
    "071_recruiter_workspace_activation",
  );

  const byDown = new Map(migrations.map((m) => [m.revision, m]));
  const chain = buildChain("070_candidate_trust_center", byDown);
  assert.deepEqual(chain.slice(0, 3), [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
  ]);
});

test("3 #448 referrals must not use revision 071 on merged scaffold stack", () => {
  const migrations = loadMigrations();
  const conflict = migrations.find((m) => m.revision === "071_candidate_referrals");
  assert.equal(
    conflict,
    undefined,
    `#448 must renumber to 073_candidate_referrals before merge (found ${conflict?.file})`,
  );
});

test("4 integration readiness doc references migration plan", () => {
  const doc = readFileSync(
    join(repoRoot, "docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md"),
    "utf8",
  );
  assert.match(doc, /073_candidate_referrals/);
  assert.match(doc, /071_recruiter_workspace_activation/);
  assert.match(doc, /072_recruiter_talent_pool_trust_review_c2/);
});

test("5 npm script registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:alembic-duplicate-revision-guard/);
});
