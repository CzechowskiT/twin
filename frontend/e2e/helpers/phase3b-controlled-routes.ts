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

/**
 * Gate E Phase 3B route-level sharding (2026-07-06) — see
 * docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md. Attempt 14
 * (2026-07-06, run 28771385932) showed all 3 batch-level isolated-runner
 * jobs (6-7 routes each) killed by `RUNNER_SHUTDOWN_SIGNAL`/exit 143 — a
 * third, distinct GitHub Actions infrastructure non-completion signature —
 * with 0/20 routes confirmed, and no correlation between batch size/
 * duration and the failure. This section shards the same 20-route
 * inventory one level finer than `PHASE3B_ROUTE_BATCHES`: exactly one route
 * per isolated-runner matrix job, so a single runner-level termination can
 * cost at most one route's evidence instead of an entire 6-7-route batch's.
 * Purely additive — `PHASE3B_ROUTE_BATCHES`/`selectPhase3bRouteBatches`
 * above are unchanged and still used whenever `PHASE3B_ROUTE` is unset.
 */
export function slugifyPhase3bRoute(route: string): string {
  if (route === "/") return "root";
  return route.replace(/^\//, "").replace(/\//g, "-");
}

export type Phase3bRouteEntry = { route: (typeof PHASE3B_ALL_ROUTES)[number]; slug: string };

/** One entry per route in `PHASE3B_ALL_ROUTES`, same order, each paired with its artifact-safe slug. */
export const PHASE3B_ROUTE_ENTRIES: readonly Phase3bRouteEntry[] = PHASE3B_ALL_ROUTES.map((route) => ({
  route,
  slug: slugifyPhase3bRoute(route),
}));

export const PHASE3B_ROUTE_SLUGS: readonly string[] = PHASE3B_ROUTE_ENTRIES.map((entry) => entry.slug);

export function isPhase3bRoute(value: string): value is (typeof PHASE3B_ALL_ROUTES)[number] {
  return (PHASE3B_ALL_ROUTES as readonly string[]).includes(value);
}

/**
 * Filters to a single route when `PHASE3B_ROUTE` is set to one of
 * `PHASE3B_ALL_ROUTES` (as each route-sharded isolated-runner matrix job now
 * is) — analogous to `selectPhase3bRouteBatches`/`PHASE3B_BATCH`, one level
 * finer. Returns `null`, unfiltered, when `PHASE3B_ROUTE` is unset (batch
 * mode or legacy full-run mode — the caller falls back to
 * `selectPhase3bRouteBatches` in that case). Throws on an unknown value so a
 * typo in CI fails loudly before Playwright ever launches, instead of
 * silently running the wrong route (or all of them). `PHASE3B_ROUTE` and
 * `PHASE3B_BATCH` are mutually exclusive — throws if both are set, so a
 * misconfigured matrix job can never silently pick one shape over the other.
 */
export function selectPhase3bRoute(
  env: NodeJS.ProcessEnv = process.env,
): (typeof PHASE3B_ALL_ROUTES)[number] | null {
  const raw = env.PHASE3B_ROUTE?.trim();
  if (!raw) return null;
  if (env.PHASE3B_BATCH?.trim()) {
    throw new Error(
      `PHASE3B_ROUTE ("${raw}") and PHASE3B_BATCH ("${env.PHASE3B_BATCH.trim()}") are mutually exclusive — set only one`,
    );
  }
  if (!isPhase3bRoute(raw)) {
    throw new Error(
      `Unknown PHASE3B_ROUTE "${raw}" — expected one of the ${PHASE3B_ALL_ROUTES.length} routes in PHASE3B_ALL_ROUTES (or unset for batch/full-run mode)`,
    );
  }
  return raw;
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
