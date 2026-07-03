/**
 * Gate E Phase 3B attempt-status persistence — best-effort JSON snapshot of
 * run progress, written to frontend/.diagnostics/gate-e-attempt-status.json
 * after every stage of an isolated-runner Gate E Phase 3B attempt.
 *
 * Exists to harden against silent GitHub Actions job cancellation (see
 * docs/gate-e-phase3b-attempt12-result-2026-07-03.md): attempt 12 (dispatch
 * 2, run 28652257796) was cancelled at the GitHub Actions infrastructure
 * level ~4m21s after the last visible Playwright output, and because a
 * job-level cancellation skips every subsequent step regardless of its
 * `if: always()` condition (confirmed via the per-step job API in that
 * document — even the "Upload diagnostics" step itself was `skipped`), the
 * run produced **zero** artifacts and left no trail of how far it actually
 * got. Persisting a status snapshot to disk after every stage — instead of
 * only at the very end — means:
 *   (a) if the "Upload diagnostics" step for a future run DOES get a chance
 *       to execute (e.g. a graceful cancel, a real timeout, or a genuine
 *       failure rather than a hard external cancel), the uploaded artifact
 *       contains a stage-by-stage record, not just whatever the last
 *       completed batch happened to write, and
 *   (b) every stage transition is also echoed to stdout as a
 *       `[gate-e-heartbeat]` log line (see phase3b-controlled-multitab.spec.ts
 *       and gate-e-phase3b-manual.yml), which — unlike an artifact upload —
 *       is streamed live and already captured by GitHub Actions as the job
 *       runs, so it survives even a hard cancellation that skips every
 *       subsequent step.
 *
 * This module never throws: every read/write is wrapped in try/catch, so a
 * diagnostics-persistence failure can never fail (or even slow down) the
 * actual Gate E Phase 3B run it is observing. It never touches production,
 * never launches a browser, and never changes Phase 3B pass/fail logic —
 * it is purely an observability side-channel.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const GATE_E_ATTEMPT_STATUS_DIR = join(process.cwd(), ".diagnostics");
export const GATE_E_ATTEMPT_STATUS_FILE_NAME = "gate-e-attempt-status.json";
export const GATE_E_ATTEMPT_STATUS_FILE = join(GATE_E_ATTEMPT_STATUS_DIR, GATE_E_ATTEMPT_STATUS_FILE_NAME);

/**
 * Ordered stage vocabulary. `before-canonical` / `preflight-complete` /
 * `batch-start` / `batch-complete` / `final-cleanup` are the five
 * checkpoints explicitly required by the isolated-runner cancellation
 * hardening task; the rest cover the earlier read-only preflight steps that
 * already existed in the workflow, so a partial run's status file always
 * shows exactly how far it got, not just whether Phase 3B itself started.
 */
export type GateEAttemptStage =
  | "workflow-start"
  | "public-health-complete"
  | "http-smoke-complete"
  | "pre-run-cleanup-complete"
  | "before-canonical"
  | "preflight-complete"
  | "batch-start"
  | "batch-complete"
  | "canonical-complete"
  | "workflow-cleanup"
  | "final-cleanup";

export type GateEHealthStatus = "ok" | "fail" | "unknown";

export type GateEBatchProgress = {
  totalBatches: number;
  completedBatches: number;
  currentBatch: string | null;
};

export type GateERouteCounts = {
  total: number;
  pass: number;
  partial: number;
  warn: number;
  fail: number;
};

export type GateEAttemptStatus = {
  stage: GateEAttemptStage;
  timestamp: string;
  runId: string | null;
  repoSha: string | null;
  /**
   * Gate E Phase 3B split-batch execution (2026-07-03) — which isolated-
   * runner matrix batch ("public-candidate" | "recruiter" | "company") this
   * status file belongs to, sourced from the PHASE3B_BATCH env var. `null`
   * for a legacy/local unsplit run that executes all 3 batches in one job.
   * Distinct from `batchProgress.currentBatch`, which tracks progress
   * *within* a single run (one or many batches); this field identifies
   * *which* isolated-runner job produced the file at all — see
   * docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md.
   */
  batch: string | null;
  healthStatus: GateEHealthStatus;
  smokeStatus: GateEHealthStatus;
  batchProgress: GateEBatchProgress;
  routeCounts: GateERouteCounts;
  classifications: Record<string, string>;
};

const EMPTY_BATCH_PROGRESS: GateEBatchProgress = { totalBatches: 0, completedBatches: 0, currentBatch: null };
const EMPTY_ROUTE_COUNTS: GateERouteCounts = { total: 0, pass: 0, partial: 0, warn: 0, fail: 0 };

/** Per-batch status file name, e.g. `gate-e-attempt-status-recruiter.json` — see writeGateEAttemptStatus. */
export function getGateEBatchAttemptStatusFileName(batch: string): string {
  return `gate-e-attempt-status-${batch}.json`;
}

function readExistingStatus(): Partial<GateEAttemptStatus> {
  try {
    if (!existsSync(GATE_E_ATTEMPT_STATUS_FILE)) return {};
    const parsed = JSON.parse(readFileSync(GATE_E_ATTEMPT_STATUS_FILE, "utf8"));
    return typeof parsed === "object" && parsed !== null ? (parsed as Partial<GateEAttemptStatus>) : {};
  } catch {
    return {};
  }
}

/**
 * Read-merge-write: preserves any field not explicitly overridden by
 * `update`, so a later stage (e.g. `batch-complete`) never erases an
 * earlier stage's `healthStatus`/`smokeStatus`/accumulated `routeCounts`.
 * Callers that need cumulative `routeCounts`/`classifications` across
 * batches are responsible for passing the running totals in `update` —
 * this function does not itself sum numbers, it only preserves fields the
 * caller omits. Never throws; returns `null` (instead of throwing) on any
 * read/write failure so this is always safe to call from a hot path.
 */
export function writeGateEAttemptStatus(
  update: Partial<GateEAttemptStatus> & { stage: GateEAttemptStage },
): GateEAttemptStatus | null {
  try {
    const existing = readExistingStatus();
    const merged: GateEAttemptStatus = {
      stage: update.stage,
      timestamp: new Date().toISOString(),
      runId: update.runId ?? existing.runId ?? null,
      repoSha: update.repoSha ?? existing.repoSha ?? null,
      batch: update.batch ?? existing.batch ?? null,
      healthStatus: update.healthStatus ?? existing.healthStatus ?? "unknown",
      smokeStatus: update.smokeStatus ?? existing.smokeStatus ?? "unknown",
      batchProgress: { ...EMPTY_BATCH_PROGRESS, ...existing.batchProgress, ...update.batchProgress },
      routeCounts: { ...EMPTY_ROUTE_COUNTS, ...existing.routeCounts, ...update.routeCounts },
      classifications: { ...(existing.classifications ?? {}), ...(update.classifications ?? {}) },
    };
    mkdirSync(GATE_E_ATTEMPT_STATUS_DIR, { recursive: true });
    writeFileSync(GATE_E_ATTEMPT_STATUS_FILE, JSON.stringify(merged, null, 2));
    // Gate E Phase 3B split-batch execution (2026-07-03): additionally
    // persist a per-batch-named copy so 3 parallel/sequential isolated-
    // runner matrix jobs (one per PHASE3B_BATCH) never share a single
    // ambiguous `gate-e-attempt-status.json` when their artifacts are later
    // inspected side by side — see
    // docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md. The
    // default file above is always written too, unchanged, for backward
    // compatibility with the existing artifact-upload path list.
    if (merged.batch) {
      writeFileSync(
        join(GATE_E_ATTEMPT_STATUS_DIR, getGateEBatchAttemptStatusFileName(merged.batch)),
        JSON.stringify(merged, null, 2),
      );
    }
    return merged;
  } catch {
    return null;
  }
}

/** Read-only accessor for tests/tooling. Never throws; returns `null` if the file doesn't exist or isn't valid JSON. */
export function readGateEAttemptStatus(): GateEAttemptStatus | null {
  const existing = readExistingStatus();
  return "stage" in existing ? (existing as GateEAttemptStatus) : null;
}
