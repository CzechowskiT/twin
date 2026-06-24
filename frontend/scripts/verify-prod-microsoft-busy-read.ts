/**
 * Production wrapper — commit gate then Microsoft busy-read staging HTTP smoke.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertProdSmokeCommitGateAllowsRun,
  evaluateProdSmokeCommitGate,
  formatProdSmokeCommitGate,
} from "./lib/prod-smoke-commit-gate";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const gate = await evaluateProdSmokeCommitGate();
  console.log(formatProdSmokeCommitGate(gate));

  try {
    assertProdSmokeCommitGateAllowsRun(gate);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const result = spawnSync("npm", ["run", "test:microsoft-busy-read-staging-smoke"], {
    cwd: scriptRoot,
    env: process.env,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
