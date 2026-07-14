#!/usr/bin/env npx tsx
/** CLI — run 60min prod stabilization soak and emit evidence artifacts. */
import { runStabilizationSoak, writeStabilizationEvidence } from "./lib/stabilization-soak";

async function main(): Promise<void> {
  const fast = process.argv.includes("--fast") || process.env.STABILIZATION_SOAK_FAST === "1";
  console.log(`=== Stabilization soak (${fast ? "FAST test" : "60min production"}) ===\n`);
  const evidence = await runStabilizationSoak({ fast });
  const { jsonPath, mdPath } = writeStabilizationEvidence(evidence);
  console.log(`Verdict: ${evidence.verdict}`);
  console.log(`Duration: ${evidence.durationSec}s | Snapshots: ${evidence.snapshotCount}`);
  console.log(`credentialsSet: ${evidence.credentialsSet}`);
  console.log(`Identity drift: ${evidence.identityDriftDetected}`);
  console.log(`Evidence JSON: ${jsonPath}`);
  console.log(`Evidence MD: ${mdPath}`);
  if (evidence.failReasons.length) {
    console.log("\nFail reasons:");
    for (const r of evidence.failReasons) console.log(`  - ${r}`);
  }
  process.exit(evidence.verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
