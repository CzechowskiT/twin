/** Deterministic production persistence verification state — read-only board data. */

export type PersistenceEndpointRow = {
  id: string;
  path: string;
  methods: string;
  unauthExpected: string;
  authSmoke: string;
};

export type MigrationCheckRow = {
  id: string;
  label: string;
  status: "verified_repo" | "pending_prod" | "operator_action";
  detail: string;
};

export type VerificationStatusRow = {
  id: string;
  label: string;
  status: "done" | "ready" | "skipped" | "pending" | "no_go" | "open" | "blocked";
  detail: string;
};

export type ProductionPersistenceStatusRecord = {
  healthUrl: string;
  expectedAlembicHead: string;
  migrationChain: readonly string[];
  endpoints: readonly PersistenceEndpointRow[];
  migrationChecks: readonly MigrationCheckRow[];
  verificationStatus: readonly VerificationStatusRow[];
  limitations: readonly string[];
  nextOperatorActions: readonly string[];
  authSmokeCommand: string;
  authSmokeSkipReason: string;
};

export function getProductionPersistenceStatusDemo(): ProductionPersistenceStatusRecord {
  return {
    healthUrl: "/api/public-health",
    expectedAlembicHead: "068_placement_events_foundation",
    migrationChain: [
      "060_audit_events_foundation",
      "061_work_items",
      "062_candidate_role_status",
      "063_review_queue",
      "064_company_feedback",
      "065_candidate_visibility_preferences",
      "066_export_requests",
      "067_request_intake",
      "068_placement_events_foundation",
    ],
    endpoints: [
      { id: "audit", path: "/api/v1/audit-events", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST append-only event" },
      { id: "work", path: "/api/v1/work-items", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST internal task" },
      { id: "role", path: "/api/v1/candidate-role-status", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST needs_feedback status" },
      { id: "queue", path: "/api/v1/review-queue", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST trust_audit_review" },
      { id: "feedback", path: "/api/v1/company-feedback", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST draft feedback" },
      { id: "visibility", path: "/api/v1/candidate-visibility-preferences", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST pilot_visible prefs" },
      { id: "export", path: "/api/v1/export-requests", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST preview_created export" },
      { id: "intake", path: "/api/v1/request-intake", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST correction_preview intake" },
      { id: "placement_events", path: "/api/v1/placement-events", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST demo_verification_recorded" },
    ],
    migrationChecks: [
      {
        id: "repo-head",
        label: "Repo Alembic head",
        status: "verified_repo",
        detail: "Local chain 060→068 — see docs/ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md",
      },
      {
        id: "railway-current",
        label: "Railway alembic current",
        status: "verified_repo",
        detail: "PENDING prod verify — repo head 068_placement_events_foundation (2026-06-21 batch)",
      },
      {
        id: "tables",
        label: "Tables 065–068",
        status: "operator_action",
        detail: "Read-only COUNT on visibility, export, intake, placement_events foundation columns",
      },
    ],
    verificationStatus: [
      {
        id: "health-alignment",
        label: "public-health commit alignment",
        status: "done",
        detail: "frontend_commit, api_commit, commit_interpretation on /api/public-health",
      },
      {
        id: "backend-git-commit",
        label: "backend_git_commit field",
        status: "done",
        detail: "Explicit Railway API SHA alias on public-health",
      },
      {
        id: "commit-interpretation",
        label: "commit_interpretation field",
        status: "done",
        detail: "Human-readable deploy alignment note",
      },
      {
        id: "admin-protected",
        label: "admin Alembic endpoint protected",
        status: "done",
        detail: "GET /api/v1/admin/migrations/current → 401 without OPS token",
      },
      {
        id: "alembic-auth-check",
        label: "Alembic current/head authenticated check",
        status: "done",
        detail: "CONFIRMED — 067_request_intake (2026-06-20 read-only admin endpoint)",
      },
      {
        id: "unauth-401",
        label: "unauthenticated persistence GET 401",
        status: "done",
        detail: "All 8 persistence endpoints return 401/403 without JWT",
      },
      {
        id: "post-script",
        label: "authenticated POST smoke script",
        status: "ready",
        detail: "npm run test:prod-authenticated-persistence-smoke — 12 assertions",
      },
      {
        id: "post-execution",
        label: "authenticated POST smoke execution",
        status: "skipped",
        detail: "SKIPPED — TWIN_PROD_TEST_JWT not configured",
      },
      {
        id: "launch",
        label: "Launch",
        status: "no_go",
        detail: "NO-GO",
      },
      {
        id: "p0",
        label: "P0 performance",
        status: "open",
        detail: "OPEN — inventory docs/P0_PERFORMANCE_INVENTORY_2026-06-21.md; low-risk hardening applied; no stress/headless/multitab run",
      },
      {
        id: "phase3b",
        label: "Phase 3B",
        status: "blocked",
        detail: "HARD BLOCKED",
      },
    ],
    limitations: [
      "Authenticated POST smoke skipped when TWIN_PROD_TEST_JWT is not configured — no token in repo.",
      "No token mint helper in repo — obtain JWT via browser login; see docs/FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md",
      "public-health shows deploy SHAs, not Alembic revision — migration verification is separate.",
      "Frontend-only deploys may advance frontend_commit without changing Railway api_commit.",
      "Smoke records are append-only internal test rows — human review required; no external side effect.",
    ],
    nextOperatorActions: [
      "Run npm run test:placement-events-auth-smoke for unauth checks on placement-events API.",
      "Review docs/P0_PERFORMANCE_INVENTORY_2026-06-21.md — P0 remains OPEN.",
      "With founder test JWT: TWIN_PROD_TEST_JWT=… TWIN_PROD_SMOKE_WRITE=1 npm run verify:prod-persistence-auth",
      "Alembic head confirmed 2026-06-20 — see docs/ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md § Evidence log.",
      "Compare scaffold HEAD, frontend_commit, api_commit using docs/PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md",
    ],
    authSmokeCommand:
      "TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app TWIN_PROD_TEST_JWT=$TWIN_PROD_TEST_JWT TWIN_PROD_SMOKE_WRITE=1 npm run verify:prod-persistence-auth",
    authSmokeSkipReason: "token not configured — authenticated smoke skipped",
  };
}
