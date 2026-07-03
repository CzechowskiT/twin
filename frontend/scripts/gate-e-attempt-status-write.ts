/**
 * CLI wrapper around writeGateEAttemptStatus, for use from the Gate E
 * Phase 3B isolated-runner workflow's bash steps
 * (.github/workflows/gate-e-phase3b-manual.yml) — the workflow's
 * public-health / HTTP-smoke / pre-run-cleanup / before-canonical /
 * cleanup steps are plain shell, not Playwright, so they persist their
 * stage transition through this thin wrapper instead of duplicating the
 * read-merge-write logic in bash.
 *
 * Reads its inputs from environment variables so the workflow YAML never
 * needs bespoke CLI argument parsing:
 *
 *   GATE_E_STAGE   (required) one of GateEAttemptStage
 *   GATE_E_HEALTH  optional, "ok" | "fail"
 *   GATE_E_SMOKE   optional, "ok" | "fail"
 *   PHASE3B_BATCH  optional, "public-candidate" | "recruiter" | "company" —
 *                  Gate E Phase 3B split-batch execution (2026-07-03, see
 *                  docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md);
 *                  set at the isolated-runner matrix job's env level so even
 *                  the shell-only checkpoints (workflow-start, public-health,
 *                  HTTP smoke, pre-run cleanup) before Playwright ever runs
 *                  are recorded against the correct batch
 *   GITHUB_RUN_ID  ambient on every GitHub Actions runner — used as-is
 *   GITHUB_SHA     ambient on every GitHub Actions runner — used as-is
 *
 * Exits non-zero only when GATE_E_STAGE itself is missing (a caller bug);
 * a diagnostics-persistence failure inside writeGateEAttemptStatus never
 * throws and never fails this script — see gate-e-attempt-status.ts.
 */
import {
  writeGateEAttemptStatus,
  type GateEAttemptStage,
  type GateEHealthStatus,
} from "../e2e/helpers/gate-e-attempt-status";

const stage = process.env.GATE_E_STAGE as GateEAttemptStage | undefined;
if (!stage) {
  console.error("gate-e-attempt-status-write: GATE_E_STAGE env var is required");
  process.exit(1);
}

const result = writeGateEAttemptStatus({
  stage,
  runId: process.env.GITHUB_RUN_ID ?? null,
  repoSha: process.env.GITHUB_SHA ?? null,
  batch: process.env.PHASE3B_BATCH?.trim() || null,
  healthStatus: process.env.GATE_E_HEALTH as GateEHealthStatus | undefined,
  smokeStatus: process.env.GATE_E_SMOKE as GateEHealthStatus | undefined,
});

console.log(`[gate-e-heartbeat] attempt-status: stage=${stage} written=${result !== null}`);
