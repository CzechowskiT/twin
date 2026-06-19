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

export type ProductionPersistenceStatusRecord = {
  healthUrl: string;
  expectedAlembicHead: string;
  migrationChain: readonly string[];
  endpoints: readonly PersistenceEndpointRow[];
  migrationChecks: readonly MigrationCheckRow[];
  limitations: readonly string[];
  nextOperatorActions: readonly string[];
  authSmokeCommand: string;
  authSmokeSkipReason: string;
};

export function getProductionPersistenceStatusDemo(): ProductionPersistenceStatusRecord {
  return {
    healthUrl: "/api/public-health",
    expectedAlembicHead: "067_request_intake",
    migrationChain: [
      "060_audit_events_foundation",
      "061_work_items",
      "062_candidate_role_status",
      "063_review_queue",
      "064_company_feedback",
      "065_candidate_visibility_preferences",
      "066_export_requests",
      "067_request_intake",
    ],
    endpoints: [
      { id: "audit", path: "/api/v1/audit-events", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST append-only event" },
      { id: "work", path: "/api/v1/work-items", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST internal task" },
      { id: "role", path: "/api/v1/candidate-role-status", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST safe status" },
      { id: "queue", path: "/api/v1/review-queue", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST trust_audit_review" },
      { id: "feedback", path: "/api/v1/company-feedback", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST draft feedback" },
      { id: "visibility", path: "/api/v1/candidate-visibility-preferences", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST pilot_visible prefs" },
      { id: "export", path: "/api/v1/export-requests", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST preview_created export" },
      { id: "intake", path: "/api/v1/request-intake", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST correction_preview intake" },
    ],
    migrationChecks: [
      {
        id: "repo-head",
        label: "Repo Alembic head",
        status: "verified_repo",
        detail: "Local chain 060→067 — see docs/ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md",
      },
      {
        id: "railway-current",
        label: "Railway alembic current",
        status: "pending_prod",
        detail: "Confirm via Railway shell or GET /api/v1/admin/migrations/current (OPS_ADMIN_TOKEN)",
      },
      {
        id: "tables",
        label: "Tables 065–067",
        status: "operator_action",
        detail: "Read-only COUNT on candidate_visibility_preferences, export_requests, request_intake_items",
      },
    ],
    limitations: [
      "Authenticated POST smoke skipped when TWIN_PROD_TEST_JWT is not configured — no token in repo.",
      "public-health shows deploy SHAs, not Alembic revision — migration verification is separate.",
      "Frontend-only deploys may advance frontend_commit without changing Railway api_commit.",
      "Smoke records are append-only internal test rows — human review required; no external side effect.",
    ],
    nextOperatorActions: [
      "Run npm run test:prod-authenticated-persistence-smoke (unauth 401 checks always).",
      "With founder test JWT: TWIN_PROD_TEST_JWT=… TWIN_PROD_SMOKE_WRITE=1 npm run test:prod-authenticated-persistence-smoke",
      "Confirm Railway alembic current = 067_request_intake via shell or admin endpoint.",
      "Compare scaffold HEAD, frontend_commit, api_commit using docs/PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md",
    ],
    authSmokeCommand:
      "TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app TWIN_PROD_TEST_JWT=$TWIN_PROD_TEST_JWT TWIN_PROD_SMOKE_WRITE=1 npm run test:prod-authenticated-persistence-smoke",
    authSmokeSkipReason: "token not configured — authenticated smoke skipped",
  };
}
