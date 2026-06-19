import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CANDIDATE_ROLE_STATUS_RECRUITER_ROUTE, SAFE_STATUSES } from "../src/lib/candidate-role-status";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

test("1 recruiter route", () => assert.ok(existsSync(join(root, "src/app/recruiter/candidate-role-status/page.tsx"))));
test("2 company read-only route", () => assert.ok(existsSync(join(root, "src/app/company/candidate-role-status/page.tsx"))));
test("3 safe statuses", () => assert.ok(SAFE_STATUSES.includes("shortlisted")));
test("4 no hired in safe list", () => assert.ok(!SAFE_STATUSES.includes("hired" as never)));
test("5 backend router", () => assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /candidate_role_status/));
test("6 no delete route", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/candidate_role_status.py"), "utf8"), /@router\.delete/));
test("7 audit on write", () => assert.match(readFileSync(join(repo, "backend/app/services/candidate_role_status.py"), "utf8"), /create_audit_event/));
test("8 docs", () => assert.ok(existsSync(join(repo, "docs/CANDIDATE_ROLE_STATUS_2026-06-18.md"))));
test("9 route constant", () => assert.equal(CANDIDATE_ROLE_STATUS_RECRUITER_ROUTE, "/recruiter/candidate-role-status"));
test("10 forbidden status in service", () => assert.match(readFileSync(join(repo, "backend/app/services/candidate_role_status.py"), "utf8"), /rejected_final/));
