/**
 * Production wrapper — commit gate then Microsoft busy-read staging HTTP smoke.
 * Dry-run (TWIN_BUSY_READ_SMOKE_DRY_RUN=1): static checks only, no prod HTTP.
 * Live Graph (test 8): requires TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 — never on prod prep.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  microsoftBusyReadSmokeDryRun,
  microsoftBusyReadSmokeModeLabel,
} from "./lib/microsoft-busy-read-smoke-env";
import {
  assertProdSmokeCommitGateAllowsRun,
  evaluateProdSmokeCommitGate,
  formatProdSmokeCommitGate,
} from "./lib/prod-smoke-commit-gate";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const dryRun = microsoftBusyReadSmokeDryRun();
  console.log(
    JSON.stringify(
      {
        smoke_mode: microsoftBusyReadSmokeModeLabel(),
        dry_run: dryRun,
        live_graph_requires: "TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1",
      },
      null,
      2,
    ),
  );

  if (!dryRun) {
    const gate = await evaluateProdSmokeCommitGate();
    console.log(formatProdSmokeCommitGate(gate));

    try {
      assertProdSmokeCommitGateAllowsRun(gate);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else {
    console.log("Dry-run: skipping prod commit gate HTTP (static smoke checks only).");
  }

  const env = {
    ...process.env,
    TWIN_BUSY_READ_SMOKE_DRY_RUN: dryRun ? "1" : process.env.TWIN_BUSY_READ_SMOKE_DRY_RUN,
  };

  const result = spawnSync("npm", ["run", "test:microsoft-busy-read-staging-smoke"], {
    cwd: scriptRoot,
    env,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
