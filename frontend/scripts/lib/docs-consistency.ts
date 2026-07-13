/**
 * Documentation index consistency helpers.
 */

export type DocEntry = {
  path: string;
  status: "CURRENT" | "SUPERSEDED";
  supersedes?: string[];
  supersededBy?: string;
};

export const DOCUMENTATION_INDEX: DocEntry[] = [
  {
    path: "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md",
    status: "CURRENT",
    supersedes: ["docs/ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md"],
  },
  {
    path: "docs/ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md",
    status: "SUPERSEDED",
    supersededBy: "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md",
  },
  {
    path: "docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/DATA_LIFECYCLE_CONTRACT_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/DOCUMENTATION_INDEX_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/OBSERVABILITY_STRUCTURED_LOGGING_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/RECRUITER_OPS_FAILURE_STATES_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/ALL_MODULES_GREEN_WAVE_C3_NOTIFICATION_PREFS_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/REFERRAL_ABUSE_CONTROLS_B3_2026-07-13.md",
    status: "CURRENT",
  },
  {
    path: "docs/schemas/FOUNDER_SMOKE_EVIDENCE_SCHEMA.md",
    status: "CURRENT",
  },
];

export function findIndexInconsistencies(
  entries: DocEntry[],
  fileExists: (p: string) => boolean,
): string[] {
  const issues: string[] = [];
  const byPath = new Map(entries.map((e) => [e.path, e]));
  for (const e of entries) {
    if (!fileExists(e.path)) issues.push(`missing file: ${e.path}`);
    if (e.supersededBy && !byPath.has(e.supersededBy)) {
      issues.push(`${e.path}: supersededBy points to unknown doc`);
    }
    for (const s of e.supersedes ?? []) {
      const target = byPath.get(s);
      if (target && target.status !== "SUPERSEDED") {
        issues.push(`${s} should be SUPERSEDED (claimed by ${e.path})`);
      }
    }
  }
  return issues;
}
