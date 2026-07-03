/** Phase 3B controlled multitab route inventory — static list only; execution BLOCKED. */

export const PHASE3B_PUBLIC_ROUTES = ["/", "/demo", "/for-companies"] as const;

export const PHASE3B_CANDIDATE_ROUTES = [
  "/dashboard",
  "/dashboard/jobs",
  "/dashboard/matches",
  "/profile",
] as const;

export const PHASE3B_RECRUITER_ROUTES = [
  "/recruiter",
  "/recruiter/candidates/demo-candidate-001",
  "/recruiter/candidates/demo-candidate-001/trust",
  "/recruiter/candidates/demo-candidate-001/team",
  "/recruiter/candidates/demo-candidate-001/communication",
  "/recruiter/jobs/demo-role-001/pipeline",
  "/recruiter/integrations/ats/import-readiness",
] as const;

export const PHASE3B_COMPANY_ROUTES = [
  "/company/dashboard",
  "/company/candidates/demo-candidate-001",
  "/company/candidates/demo-candidate-001/trust",
  "/company/candidates/demo-candidate-001/team",
  "/company/candidates/demo-candidate-001/communication",
  "/company/roles/demo-role-001/pipeline",
] as const;

export const PHASE3B_ROUTE_BATCHES = [
  {
    label: "public-candidate",
    routes: [...PHASE3B_PUBLIC_ROUTES, ...PHASE3B_CANDIDATE_ROUTES],
  },
  { label: "recruiter", routes: [...PHASE3B_RECRUITER_ROUTES] },
  { label: "company", routes: [...PHASE3B_COMPANY_ROUTES] },
] as const;

export const PHASE3B_ALL_ROUTES = [
  ...PHASE3B_PUBLIC_ROUTES,
  ...PHASE3B_CANDIDATE_ROUTES,
  ...PHASE3B_RECRUITER_ROUTES,
  ...PHASE3B_COMPANY_ROUTES,
] as const;

export const PHASE3B_ROUTE_COUNT = PHASE3B_ALL_ROUTES.length;

export type Phase3bBatchLabel = (typeof PHASE3B_ROUTE_BATCHES)[number]["label"];

export const PHASE3B_BATCH_LABELS: readonly Phase3bBatchLabel[] = PHASE3B_ROUTE_BATCHES.map(
  (batch) => batch.label,
);

export function isPhase3bBatchLabel(value: string): value is Phase3bBatchLabel {
  return (PHASE3B_BATCH_LABELS as readonly string[]).includes(value);
}

/**
 * Gate E Phase 3B split-batch isolated-runner execution (2026-07-03) — see
 * docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md. Filters
 * PHASE3B_ROUTE_BATCHES down to a single named batch when the env var
 * PHASE3B_BATCH is set to one of PHASE3B_BATCH_LABELS — this is how each
 * isolated-runner CI job (`.github/workflows/gate-e-phase3b-manual.yml`
 * matrix) runs exactly one route batch instead of all three inside a
 * single, long-lived job (the shape that produced attempt 12's
 * `RUNNER_CANCELLED` and attempt 13's `RUNNER_LOST_COMMUNICATION` results).
 * Returns every batch, unfiltered, when PHASE3B_BATCH is unset — the only
 * change from prior (single-job, unsplit) behavior; local execution is
 * separately hard-blocked regardless (see phase3b-prod-local-guard.ts).
 * Throws on any other value so a typo in CI fails loudly before Playwright
 * ever launches, instead of silently running the wrong batch (or all of
 * them, or none).
 */
export function selectPhase3bRouteBatches(
  env: NodeJS.ProcessEnv = process.env,
): readonly (typeof PHASE3B_ROUTE_BATCHES)[number][] {
  const raw = env.PHASE3B_BATCH?.trim();
  if (!raw) return PHASE3B_ROUTE_BATCHES;
  if (!isPhase3bBatchLabel(raw)) {
    throw new Error(
      `Unknown PHASE3B_BATCH "${raw}" — expected one of: ${PHASE3B_BATCH_LABELS.join("|")} (or unset to run all batches)`,
    );
  }
  const match = PHASE3B_ROUTE_BATCHES.find((batch) => batch.label === raw);
  if (!match) {
    throw new Error(`PHASE3B_BATCH "${raw}" has no matching entry in PHASE3B_ROUTE_BATCHES`);
  }
  return [match];
}

export const PHASE3B_HEAP_FAIL_MB = 180;
export const PHASE3B_HEAP_WARN_MB = 120;
export const PHASE3B_DOM_FAIL = 15000;
export const PHASE3B_DOM_WARN = 10000;
export const PHASE3B_IDLE_MS_MIN = 60_000;
export const PHASE3B_IDLE_MS_MAX = 90_000;
export const PHASE3B_MAX_TABS = 8;
export const PHASE3B_SAFE_MARQUEE_MAX_NODES = 30;
export const PHASE3B_FULL_MARQUEE_FAIL_NODES = 89;
