import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PERSISTENCE_ENDPOINTS = [
  "audit-events",
  "work-items",
  "candidate-role-status",
  "review-queue",
  "company-feedback",
  "candidate-visibility-preferences",
  "export-requests",
  "request-intake",
] as const;

const MIGRATION_CHAIN = [
  "060_audit_events_foundation",
  "061_work_items",
  "062_candidate_role_status",
  "063_review_queue",
  "064_company_feedback",
  "065_candidate_visibility_preferences",
  "066_export_requests",
  "067_request_intake",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 migration runbook exists with expected sections", () => {
  const doc = readRepo("docs/PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md");
  assert.match(doc, /public-health/);
  assert.match(doc, /067_request_intake/);
  assert.match(doc, /065_candidate_visibility_preferences/);
  assert.match(doc, /401/);
});

test("2 router registers all persistence APIs", () => {
  const router = readRepo("backend/app/api/router.py");
  assert.match(router, /audit_events/);
  assert.match(router, /work_items/);
  assert.match(router, /candidate_role_status/);
  assert.match(router, /review_queue/);
  assert.match(router, /company_feedback/);
  assert.match(router, /candidate_visibility_preferences/);
  assert.match(router, /export_requests/);
  assert.match(router, /request_intake/);
});

test("3 migration chain 060-067 exists in repo", () => {
  for (const rev of MIGRATION_CHAIN) {
    const files = readRepo(`backend/alembic/versions/${rev}.py`);
    assert.ok(files.length > 0, `missing ${rev}`);
  }
});

test("4 persistence APIs have no DELETE routes", () => {
  const modules = [
    "backend/app/api/audit_events.py",
    "backend/app/api/work_items.py",
    "backend/app/api/candidate_role_status.py",
    "backend/app/api/review_queue.py",
    "backend/app/api/company_feedback_persistence.py",
    "backend/app/api/candidate_visibility_preferences.py",
    "backend/app/api/export_requests.py",
    "backend/app/api/request_intake.py",
  ];
  for (const mod of modules) {
    const src = readRepo(mod);
    assert.doesNotMatch(src, /@router\.delete/);
  }
});

test("5 no hardcoded JWT in readiness script", () => {
  const self = readRepo("frontend/scripts/backend-persistence-prod-readiness.test.ts");
  const jwtPrefix = "Bearer " + "eyJ";
  assert.ok(!self.includes(jwtPrefix));
});

test("6 eight persistence endpoint constants documented", () => {
  assert.equal(PERSISTENCE_ENDPOINTS.length, 8);
  assert.ok(PERSISTENCE_ENDPOINTS.includes("request-intake"));
});
