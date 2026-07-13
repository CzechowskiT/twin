#!/usr/bin/env npx tsx
/**
 * Founder smoke orchestration wrapper — env preflight + reachability + evidence template.
 * Does NOT execute authenticated browser smoke or record PASS.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkFounderSmokeEnv,
  formatFounderSmokeEnvReport,
} from "./founder-smoke-env-preflight";
import {
  formatReachabilityReport,
  resolveReachabilityTargets,
  runReachabilityPreflight,
} from "./preview-reachability-preflight";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HANDOFF = "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md";

const EVIDENCE_TEMPLATE = `
## Founder smoke evidence template (fill after browser smoke — no secrets)

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Environment | prod / preview-448 / preview-449 / preview-450 |
| Deploy SHA | (from /api/public-health git_commit) |

| Slice | PR | Result | Notes |
|-------|-----|--------|-------|
| B1 Career Compass | prod | PASS / FAIL / SKIP | |
| B2 Trust Center | prod | PASS / FAIL / SKIP | |
| B3 Referrals | #448 | PASS / FAIL / SKIP | |
| C1 Activation | #449 | PASS / FAIL / SKIP | |
| C2 Talent Pool | #450 | PASS / FAIL / SKIP | |
| C2 Trust Review | #450 | PASS / FAIL / SKIP | |

Console errors: none / (describe)
Do NOT add FOUNDER_SMOKE: PASS until all required slices pass.
`.trim();

async function main(): Promise<void> {
  console.log("=== Founder smoke orchestration (preflight only) ===\n");
  const envChecks = checkFounderSmokeEnv(process.env);
  console.log(formatFounderSmokeEnvReport(envChecks));
  console.log("");

  const targets = resolveReachabilityTargets(process.env);
  const reachResults = await runReachabilityPreflight(targets);
  console.log(formatReachabilityReport(reachResults));
  console.log("");

  console.log("Smoke order (see handoff doc):");
  console.log("  1. Wave B B1/B2 on prod (DEMO_USER_PASSWORD required)");
  console.log("  2. Wave C C1 on #449 preview (recruiter token required)");
  console.log("  3. Merge #449 → rebase #450 → Wave C C2 on #450 preview");
  console.log("  4. Merge #450 → rebase #448 → Wave B B3 on #448 preview");
  console.log("");

  try {
    const handoff = readFileSync(join(repoRoot, HANDOFF), "utf8");
    const routeSection = handoff.split("## Routes")[1]?.split("##")[0]?.trim();
    if (routeSection) {
      console.log("Routes (from handoff):");
      console.log(routeSection.split("\n").slice(0, 12).join("\n"));
      console.log("");
    }
  } catch {
    console.log(`Handoff doc: ${HANDOFF} (create if missing)\n`);
  }

  console.log(EVIDENCE_TEMPLATE);
  console.log("\nSmoke executed: NO — preflight orchestration only.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
