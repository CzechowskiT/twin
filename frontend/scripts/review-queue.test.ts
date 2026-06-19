import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

test("1 trust-review-queue still exists", () => assert.ok(existsSync(join(root, "src/app/recruiter/trust-review-queue/page.tsx"))));
test("2 review-queue alias route", () => assert.ok(existsSync(join(root, "src/app/recruiter/review-queue/page.tsx"))));
test("3 backend router", () => assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /review_queue/));
test("4 no delete", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/review_queue.py"), "utf8"), /@router\.delete/));
test("5 no approve in api", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/review_queue.py"), "utf8"), /approve/));
test("6 audit integration", () => assert.match(readFileSync(join(repo, "backend/app/services/review_queue.py"), "utf8"), /create_audit_event/));
test("7 docs", () => assert.ok(existsSync(join(repo, "docs/REVIEW_QUEUE_PERSISTENCE_2026-06-18.md"))));
test("8 package script", () => assert.match(readFileSync(join(root, "package.json"), "utf8"), /test:review-queue/));
test("9 safe statuses in service", () => assert.match(readFileSync(join(repo, "backend/app/services/review_queue.py"), "utf8"), /closed_no_action/));
