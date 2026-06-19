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
] as const;

const MIGRATION_CHAIN = [
  "060_audit_events_foundation",
  "061_work_items",
  "062_candidate_role_status",
  "063_review_queue",
  "064_company_feedback",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 verification doc exists with expected sections", () => {
  const doc = readRepo("docs/BACKEND_PERSISTENCE_PROD_VERIFICATION_2026-06-19.md");
  assert.match(doc, /public-health/);
  assert.match(doc, /064_company_feedback/);
  assert.match(doc, /401/);
  assert.match(doc, /#199/);
});

test("2 router registers all persistence APIs", () => {
  const router = readRepo("backend/app/api/router.py");
  for (const ep of PERSISTENCE_ENDPOINTS) {
    const module = ep.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/-/g, "_");
    const snake = ep === "candidate-role-status" ? "candidate_role_status" : module.replace(/([A-Z])/g, "_$1").toLowerCase();
    const key = ep.includes("-") ? ep.split("-")[0] + (ep.includes("role") ? "_role_status" : ep.includes("feedback") ? "_feedback" : ep.includes("queue") ? "_queue" : "") : ep;
    assert.match(router, new RegExp(ep.split("-")[0].replace("candidate", "candidate") || ep));
  }
  assert.match(router, /audit_events/);
  assert.match(router, /work_items/);
  assert.match(router, /candidate_role_status/);
  assert.match(router, /review_queue/);
  assert.match(router, /company_feedback/);
});

test("3 migration chain 060-064 exists in repo", () => {
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
