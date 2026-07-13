/**
 * Production verifier v2 — extended post-merge checks for 070–077 train.
 * Dry-run only; never touches production DB.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findDuplicateRevisions,
  findHeads,
  parseMigrationSource,
  validateChainSegment,
  WAVE_070_077_CHAIN,
  waveStack077Fixture,
} from "./lib/alembic-migration-graph";
import { runPostMergeVerifier } from "./post-merge-verifier";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSIONS = join(repoRoot, "backend/alembic/versions");

export type ProdVerifierCheck = {
  name: string;
  ok: boolean;
  detail: string;
  severity: "P0" | "P1" | "P2";
};

export function runProductionVerifierV2(opts?: {
  expect077?: boolean;
  probePublicHealth?: boolean;
}): ProdVerifierCheck[] {
  const checks: ProdVerifierCheck[] = [];
  const base = runPostMergeVerifier({ expect077: opts?.expect077 });
  for (const c of base) {
    checks.push({ ...c, severity: c.ok ? "P2" : "P0" });
  }

  const fixture = waveStack077Fixture();
  const fixtureSeg = validateChainSegment(fixture, [...WAVE_070_077_CHAIN]);
  checks.push({
    name: "fixture_070_077_chain",
    ok: fixtureSeg.ok,
    detail: fixtureSeg.ok ? WAVE_070_077_CHAIN.join(" → ") : (fixtureSeg as { reason: string }).reason,
    severity: "P0",
  });

  const migrations = readdirSync(VERSIONS)
    .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
    .map((f) => parseMigrationSource(f, readFileSync(join(VERSIONS, f), "utf8")));

  const dupes = findDuplicateRevisions(migrations);
  checks.push({
    name: "v2_no_duplicate_revisions",
    ok: dupes.length === 0,
    detail: dupes.join("; ") || "none",
    severity: "P0",
  });

  if (opts?.expect077) {
    const heads = findHeads(migrations);
    checks.push({
      name: "v2_single_head_077",
      ok: heads.length === 1 && heads[0] === "077_candidate_activity_timeline",
      detail: heads.join(", ") || "no head",
      severity: "P0",
    });
  }

  const contractPath = join(repoRoot, "backend/tests/snapshots/wave_api_contract_paths.txt");
  try {
    const snap = readFileSync(contractPath, "utf8");
    checks.push({
      name: "v2_api_contract_snapshot",
      ok: snap.includes("/api/v1/recruiter/") && snap.length > 50,
      detail: `${snap.split("\n").filter(Boolean).length} paths`,
      severity: "P1",
    });
  } catch {
    checks.push({ name: "v2_api_contract_snapshot", ok: false, detail: "missing", severity: "P1" });
  }

  try {
    execSync("npm run test:public-health-route-stability", {
      cwd: join(repoRoot, "frontend"),
      stdio: "pipe",
    });
    checks.push({ name: "v2_public_health_guard", ok: true, detail: "PASS", severity: "P1" });
  } catch {
    checks.push({ name: "v2_public_health_guard", ok: false, detail: "guard failed", severity: "P1" });
  }

  if (opts?.probePublicHealth) {
    checks.push({
      name: "v2_live_probe_skipped",
      ok: true,
      detail: "Path B — no live probe without credentials",
      severity: "P2",
    });
  }

  checks.push({
    name: "v2_launch_stance",
    ok: true,
    detail: "NO-GO — Gate F PENDING",
    severity: "P2",
  });

  return checks;
}

function main(): void {
  const expect077 = process.argv.includes("--expect-077");
  const checks = runProductionVerifierV2({ expect077, probePublicHealth: true });
  console.log("Production verifier v2 (dry-run):\n");
  let failed = 0;
  for (const c of checks) {
    const tag = c.ok ? "PASS" : "FAIL";
    console.log(`  [${tag}] [${c.severity}] ${c.name}: ${c.detail}`);
    if (!c.ok && c.severity === "P0") failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
