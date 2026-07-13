/**
 * Rollback engine v2 — per-PR rollback decision matrix with execute blocked.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type RollbackAction = "railway_restore" | "revert_commit" | "stop_deploy" | "manual_review";

export type RollbackDecision = {
  pr: number;
  migration: string | null;
  action: RollbackAction;
  autoDowngrade: false;
  smokeRequired: boolean;
};

export const ROLLBACK_MATRIX: RollbackDecision[] = [
  { pr: 449, migration: "071_recruiter_workspace_activation", action: "stop_deploy", autoDowngrade: false, smokeRequired: true },
  { pr: 450, migration: "072_recruiter_talent_pool_trust_review_c2", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
  { pr: 448, migration: "073_candidate_referrals", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
  { pr: 451, migration: null, action: "revert_commit", autoDowngrade: false, smokeRequired: false },
  { pr: 452, migration: "074_recruiter_notification_preferences_c3", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
  { pr: 453, migration: "075_recruiter_saved_views_c4", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
  { pr: 454, migration: "076_recruiter_activity_timeline_c5", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
  { pr: 455, migration: "077_candidate_activity_timeline", action: "railway_restore", autoDowngrade: false, smokeRequired: true },
];

export function getRollbackDecision(pr: number): RollbackDecision | undefined {
  return ROLLBACK_MATRIX.find((d) => d.pr === pr);
}

export function assertRollbackExecuteBlocked(attemptExecute: boolean): string[] {
  if (!attemptExecute) return [];
  return ["rollback --execute permanently blocked — use Railway backup restore per runbook"];
}

export function validateRollbackDoc(docPath: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  let doc: string;
  try {
    doc = readFileSync(docPath, "utf8");
  } catch {
    return { ok: false, issues: ["rollback doc missing"] };
  }
  if (!/Never.*alembic downgrade/i.test(doc)) issues.push("missing no-downgrade rule");
  if (!/NO-GO/.test(doc)) issues.push("missing NO-GO stance");
  for (const d of ROLLBACK_MATRIX.filter((r) => r.pr <= 448)) {
    if (!doc.includes(`#${d.pr}`) && !doc.includes(String(d.pr))) {
      issues.push(`PR ${d.pr} not in doc`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function runRollbackEngineV2(opts?: { checkExecuteBlocked?: boolean }): {
  ok: boolean;
  decisions: RollbackDecision[];
  blockers: string[];
} {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const doc = join(repoRoot, "docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md");
  const validation = validateRollbackDoc(doc);
  const blockers = [...validation.issues];
  if (opts?.checkExecuteBlocked) {
    blockers.push(...assertRollbackExecuteBlocked(true));
  }
  const allNoDowngrade = ROLLBACK_MATRIX.every((d) => d.autoDowngrade === false);
  if (!allNoDowngrade) blockers.push("autoDowngrade must be false for all PRs");
  return { ok: validation.ok && allNoDowngrade, decisions: ROLLBACK_MATRIX, blockers };
}
