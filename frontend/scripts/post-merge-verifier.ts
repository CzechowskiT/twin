#!/usr/bin/env npx tsx
/**
 * Post-merge verifier — dry-run checklist after hypothetical 449→450→448 merge.
 * Does NOT run alembic upgrade on production.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildChain,
  findDuplicateRevisions,
  findHeads,
  parseMigrationSource,
  validateChainSegment,
} from "./lib/alembic-migration-graph";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSIONS = join(repoRoot, "backend/alembic/versions");

export type VerifierCheck = { name: string; ok: boolean; detail: string };

export function runPostMergeVerifier(opts?: { expect073?: boolean; expect077?: boolean }): VerifierCheck[] {
  const checks: VerifierCheck[] = [];
  const migrations = readdirSync(VERSIONS)
    .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
    .map((f) => parseMigrationSource(f, readFileSync(join(VERSIONS, f), "utf8")));

  const dupes = findDuplicateRevisions(migrations);
  checks.push({
    name: "no_duplicate_revisions",
    ok: dupes.length === 0,
    detail: dupes.join("; ") || "none",
  });

  const wave = ["070_candidate_trust_center", "071_recruiter_workspace_activation", "072_recruiter_talent_pool_trust_review_c2"];
  const subset = migrations.filter((m) => wave.includes(m.revision));
  const seg = validateChainSegment(subset, wave);
  checks.push({
    name: "wave_c_chain_070_072",
    ok: seg.ok,
    detail: seg.ok ? wave.join(" → ") : (seg as { reason: string }).reason,
  });

  const has073 = migrations.some((m) => m.revision === "073_candidate_referrals");
  if (opts?.expect077) {
    const full077 = [
      ...wave,
      "073_candidate_referrals",
      "074_recruiter_notification_preferences_c3",
      "075_recruiter_saved_views_c4",
      "076_recruiter_activity_timeline_c5",
      "077_candidate_activity_timeline",
    ];
    const fullSubset = migrations.filter((m) => full077.includes(m.revision));
    const fullSeg = validateChainSegment(fullSubset, full077);
    checks.push({
      name: "full_chain_includes_077",
      ok: fullSeg.ok && full077.every((r) => fullSubset.some((m) => m.revision === r)),
      detail: fullSeg.ok ? full077.join(" → ") : (fullSeg as { reason: string }).reason,
    });
    const heads = findHeads(migrations);
    checks.push({
      name: "single_head_077",
      ok: heads.length === 1 && heads[0] === "077_candidate_activity_timeline",
      detail: heads.join(", "),
    });
  } else if (opts?.expect073 ?? false) {
    const full = [...wave, "073_candidate_referrals"];
    const fullSubset = migrations.filter((m) => full.includes(m.revision));
    const fullSeg = validateChainSegment(fullSubset, full);
    checks.push({
      name: "full_chain_includes_073",
      ok: fullSeg.ok && has073,
      detail: has073 ? buildChain("070_candidate_trust_center", fullSubset).join(" → ") : "073 missing",
    });
    const heads = findHeads(migrations);
    checks.push({
      name: "single_head_073",
      ok: heads.length === 1 && heads[0] === "073_candidate_referrals",
      detail: heads.join(", "),
    });
  } else {
    checks.push({
      name: "073_absent_on_partial_branch",
      ok: !has073,
      detail: has073 ? "073 present unexpectedly" : "honest partial graph (#450)",
    });
  }

  try {
    execSync("npm run test:alembic-duplicate-revision-guard", { cwd: join(repoRoot, "frontend"), stdio: "pipe" });
    checks.push({ name: "alembic_guard", ok: true, detail: "PASS" });
  } catch {
    checks.push({ name: "alembic_guard", ok: false, detail: "guard failed" });
  }

  return checks;
}

function main(): void {
  const expect077 = process.argv.includes("--expect-077");
  const expect073 = process.argv.includes("--expect-073");
  const checks = runPostMergeVerifier(expect077 ? { expect077: true } : { expect073 });
  console.log("Post-merge verifier (dry-run):\n");
  let failed = 0;
  for (const c of checks) {
    console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name}: ${c.detail}`);
    if (!c.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
