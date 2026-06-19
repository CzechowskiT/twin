import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { REQUEST_INTAKE_API_PATH } from "../src/lib/request-intake";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

test("1 router", () => {
  assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /request_intake/);
  assert.equal(REQUEST_INTAKE_API_PATH, "/api/v1/request-intake");
});
test("2 recruiter route", () => assert.ok(existsSync(join(root, "src/app/recruiter/request-intake/page.tsx"))));
test("3 no delete", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/request_intake.py"), "utf8"), /@router\.delete/));
test("4 trust review link", () => assert.match(readFileSync(join(root, "src/components/recruiter/recruiter-trust-review-queue-workspace.tsx"), "utf8"), /request-intake/));
test("5 forbidden statuses", () => assert.match(readFileSync(join(repo, "backend/app/services/request_intake.py"), "utf8"), /FORBIDDEN_STATUSES/));
test("6 docs", () => assert.ok(existsSync(join(repo, "docs/REQUEST_INTAKE_2026-06-19.md"))));
