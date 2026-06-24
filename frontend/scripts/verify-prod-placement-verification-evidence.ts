/**
 * Production wrapper — commit gate then placement verification evidence browser smoke.
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
  if (process.env.PLAYWRIGHT_ALLOW_PROD_SMOKE !== "1") {
    console.error("Set PLAYWRIGHT_ALLOW_PROD_SMOKE=1 for production browser smoke.");
    process.exit(1);
  }

  const gate = await evaluateProdSmokeCommitGate();
  console.log(formatProdSmokeCommitGate(gate));

  try {
    assertProdSmokeCommitGateAllowsRun(gate);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const env = {
    ...process.env,
    PLAYWRIGHT_ALLOW_PROD_SMOKE: "1",
    PLAYWRIGHT_SKIP_WEBSERVER: process.env.PLAYWRIGHT_SKIP_WEBSERVER ?? "1",
    PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app",
  };

  const result = spawnSync("npm", ["run", "test:placement-verification-evidence-browser:raw"], {
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
