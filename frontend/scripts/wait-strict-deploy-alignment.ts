#!/usr/bin/env npx tsx
/**
 * CLI: poll until strict Gate F deploy alignment (exit 0 only on success).
 * Usage: npx tsx scripts/wait-strict-deploy-alignment.ts
 */
import { pollUntilStrictAlignment } from "./lib/deploy-alignment-poller";

async function main(): Promise<void> {
  const decision = await pollUntilStrictAlignment({
    apiService: process.env.TWIN_RAILWAY_API_SERVICE ?? "twin",
    workerService: process.env.TWIN_RAILWAY_WORKER_SERVICE ?? "enthusiastic-encouragement",
    maxAttempts: Number(process.env.TWIN_ALIGN_MAX_ATTEMPTS ?? "30"),
  });
  console.log(
    JSON.stringify(
      {
        phase: decision.phase,
        reason: decision.reason,
        repo_head: decision.repo_head,
        frontend_commit: decision.health?.frontend_commit ?? null,
        api_commit: decision.health?.api_commit ?? null,
        worker_commit: decision.health?.worker_commit ?? null,
        api_deploy_status: decision.api_deploy?.status ?? null,
        api_deploy_commit: decision.api_deploy?.commitHash ?? null,
        worker_deploy_status: decision.worker_deploy?.status ?? null,
        worker_deploy_commit: decision.worker_deploy?.commitHash ?? null,
      },
      null,
      2,
    ),
  );
  if (decision.phase !== "aligned") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
