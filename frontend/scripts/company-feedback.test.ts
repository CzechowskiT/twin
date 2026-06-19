import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { COMPANY_FEEDBACK_ROUTE } from "../src/lib/company-feedback";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

test("1 UI route", () => assert.ok(existsSync(join(root, "src/app/company/feedback/page.tsx"))));
test("2 API router", () => assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /company_feedback_persistence/));
test("3 no delete", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/company_feedback_persistence.py"), "utf8"), /@router\.delete/));
test("4 audit", () => assert.match(readFileSync(join(repo, "backend/app/services/company_feedback_persistence.py"), "utf8"), /create_audit_event/));
test("5 docs", () => assert.ok(existsSync(join(repo, "docs/COMPANY_FEEDBACK_PERSISTENCE_2026-06-18.md"))));
test("6 route constant", () => assert.equal(COMPANY_FEEDBACK_ROUTE, "/company/feedback"));
test("7 seven sections", () => {
  const ws = readFileSync(join(root, "src/components/company/company-feedback-workspace.tsx"), "utf8");
  assert.match(ws, /COMPANY_FEEDBACK_MARKERS\.boundary/);
  assert.match(ws, /visibilityBoundary/);
});
test("8 live api wiring", () => {
  const ws = readFileSync(join(root, "src/components/company/company-feedback-workspace.tsx"), "utf8");
  assert.match(ws, /loadCompanyFeedback/);
  assert.match(ws, /company-feedback-data-source/);
});
test("9 no hire in service", () => assert.doesNotMatch(readFileSync(join(repo, "backend/app/services/company_feedback_persistence.py"), "utf8"), /\bhired\b/));

test("10 draft submit wiring", () => {
  const ws = readFileSync(join(root, "src/components/company/company-feedback-workspace.tsx"), "utf8");
  assert.match(ws, /createCompanyFeedbackDraft/);
  assert.match(ws, /submitCompanyFeedbackForReview/);
  const lib = readFileSync(join(root, "src/lib/company-feedback.ts"), "utf8");
  assert.match(lib, /submitted_for_review/);
});
