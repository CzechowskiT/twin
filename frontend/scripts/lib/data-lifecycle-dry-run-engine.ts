/**
 * Data lifecycle dry-run engine — simulates retention/purge plans without LIVE writes.
 */
export type LifecyclePhase = "export" | "anonymize" | "purge" | "rollback_check";

export type LifecycleStep = {
  phase: LifecyclePhase;
  table: string;
  rowEstimate: number;
  destructive: boolean;
};

export type LifecycleDryRunReport = {
  ok: boolean;
  steps: LifecycleStep[];
  blockers: string[];
};

const FORBIDDEN_LIVE = ["LIVE", "PRODUCTION_WRITE", "STRIPE_LIVE", "ATS_WRITE"];

export function parseLifecycleEnv(flags: Record<string, string | undefined>): string[] {
  const blockers: string[] = [];
  for (const key of FORBIDDEN_LIVE) {
    if (flags[key] === "1" || flags[key] === "true") {
      blockers.push(`${key} flip detected — dry-run only`);
    }
  }
  return blockers;
}

export function buildCandidateTrustLifecyclePlan(): LifecycleStep[] {
  return [
    { phase: "export", table: "candidate_trust_events", rowEstimate: 0, destructive: false },
    { phase: "anonymize", table: "candidate_referrals", rowEstimate: 0, destructive: true },
    { phase: "purge", table: "recruiter_audit_events", rowEstimate: 0, destructive: true },
    { phase: "rollback_check", table: "alembic_version", rowEstimate: 1, destructive: false },
  ];
}

export function runLifecycleDryRun(env: Record<string, string | undefined> = {}): LifecycleDryRunReport {
  const blockers = parseLifecycleEnv(env);
  const steps = buildCandidateTrustLifecyclePlan();
  const destructiveWithoutExport = steps.some((s) => s.destructive && s.phase !== "rollback_check");
  if (destructiveWithoutExport && !steps.some((s) => s.phase === "export")) {
    blockers.push("destructive step without prior export");
  }
  return { ok: blockers.length === 0, steps, blockers };
}
