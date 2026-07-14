/**
 * Production verifier v3 — hardening track + stabilization + contract freeze (dry-run).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isFounderSmokeCredentialsReady } from "./founder-smoke-env-preflight";
import { runProductionVerifierV2, type ProdVerifierCheck } from "./production-verifier-v2";
import { evaluateStabilizationWindow } from "./lib/stabilization-window";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const HARDENING_DOCS: Record<number, string> = {
  456: "docs/HARDENING_PILOT_READINESS_DASHBOARD_2026-07-13.md",
  457: "docs/HARDENING_WORKSPACE_SUSPENSION_2026-07-13.md",
  458: "docs/HARDENING_PRIVACY_REQUEST_TRACKER_2026-07-13.md",
  459: "docs/HARDENING_FEATURE_FLAG_AUDIT_2026-07-13.md",
  460: "docs/HARDENING_RETENTION_PREVIEW_2026-07-13.md",
};

export function runProductionVerifierV3(opts?: {
  expect077?: boolean;
  credentialsSet?: boolean;
}): ProdVerifierCheck[] {
  const checks = runProductionVerifierV2({
    expect077: opts?.expect077,
    probePublicHealth: true,
  });

  for (const [pr, docPath] of Object.entries(HARDENING_DOCS)) {
    const full = join(repoRoot, docPath);
    const ok = existsSync(full);
    let detail = ok ? "doc present" : "missing";
    if (ok) {
      const body = readFileSync(full, "utf8");
      if (/alembic|migration/i.test(body) && !/no migration/i.test(body)) {
        detail = "unexpected migration mention";
        checks.push({
          name: `v3_hardening_pr${pr}_no_migration`,
          ok: false,
          detail,
          severity: "P0",
        });
        continue;
      }
    }
    checks.push({
      name: `v3_hardening_pr${pr}_doc`,
      ok,
      detail,
      severity: "P1",
    });
  }

  const stab = evaluateStabilizationWindow({ credentialsSet: opts?.credentialsSet ?? false });
  checks.push({
    name: "v3_stabilization_window",
    ok: stab.ok,
    detail: stab.reason,
    severity: "P0",
  });

  const freezePath = join(repoRoot, "docs/API_CONTRACT_FREEZE_2026-07-13.md");
  checks.push({
    name: "v3_api_contract_freeze",
    ok: existsSync(freezePath),
    detail: existsSync(freezePath) ? "freeze doc present" : "missing",
    severity: "P1",
  });

  const lifecycleV3 = join(repoRoot, "docs/DATA_LIFECYCLE_CONTRACT_V3_2026-07-13.md");
  checks.push({
    name: "v3_lifecycle_contract",
    ok: existsSync(lifecycleV3),
    detail: existsSync(lifecycleV3) ? "v3 lifecycle present" : "missing",
    severity: "P1",
  });

  const dqPath = join(repoRoot, "docs/DATA_QUALITY_CHECKER_2026-07-13.md");
  checks.push({
    name: "v3_data_quality_checker",
    ok: existsSync(dqPath),
    detail: existsSync(dqPath) ? "checker doc present" : "missing",
    severity: "P1",
  });

  checks.push({
    name: "v3_launch_stance",
    ok: true,
    detail: "NO-GO — Gate F PENDING — Path B no product merges",
    severity: "P2",
  });

  return checks;
}

function main(): void {
  const expect077 = process.argv.includes("--expect-077");
  const credentialsSet = isFounderSmokeCredentialsReady();
  const checks = runProductionVerifierV3({ expect077, credentialsSet });
  console.log("Production verifier v3 (dry-run):\n");
  console.log(`  credentialsSet: ${credentialsSet} (RECRUITER_TOKEN sufficient; no secret values logged)\n`);
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
