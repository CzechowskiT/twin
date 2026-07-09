/**
 * Gate F founder review package — static guard (2026-07-09 morning package).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANONICAL_STANCE,
  NOT_READY_FOR_LAUNCH,
  READY_FOR_GATE_F_REVIEW,
} from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const PACKAGE_DOC = "docs/GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md";
const D7_DOC = "docs/SEVEN_DAY_D7_FINAL_QA_2026-07-08.md";
const CANDIDATE_FLOW_DOC = "docs/CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md";
const REAUDIT_RESULT = "docs/GATE_F_REAUDIT_RESULT_2026-07-07.md";

const REQUIRED_SECTIONS = [
  "1. Purpose & stance",
  "2. Evidence summary (current)",
  "3. Ready / not ready",
  "4. Deploy alignment (morning 2026-07-09)",
  "5. Manual smoke checklist (founder morning)",
  "6. Re-audit row snapshot (PASS / FAIL / NEEDS_REVIEW)",
  "7. Founder decisions needed (morning)",
  "8. What Gate F YES will not do",
  "9. Recommendation (engineering — not founder final YES)",
  "10. Deliverables",
  "11. Launch stance footer",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function pkgSection(doc: string, heading: string): string {
  return doc.split(`## ${heading}`)[1]?.split("## ")[0] ?? "";
}

test("1 gate F founder review package exists with correct title", () => {
  const pkg = readRepo(PACKAGE_DOC);
  assert.match(pkg, /Gate F Founder Review Package.*2026-07-09/);
});

test("2 package — required sections present", () => {
  const pkg = readRepo(PACKAGE_DOC);
  for (const section of REQUIRED_SECTIONS) {
    assert.match(pkg, new RegExp(`## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("3 package — Launch NO-GO, P0 CLOSED, Gate F PENDING", () => {
  const pkg = readRepo(PACKAGE_DOC);
  const stance = pkgSection(pkg, "1. Purpose & stance");
  assert.match(stance, /NO-GO/i);
  assert.match(stance, /P0.*CLOSED/i);
  assert.match(stance, /Gate F.*PENDING/i);
  assert.doesNotMatch(pkg, /Launch:\s*\*\*GO\*\*/i);
  assert.doesNotMatch(pkg, /\*\*Gate F:\*\* \*\*YES\*\*/);
});

test("4 package — Gate F YES is not Launch GO", () => {
  const pkg = readRepo(PACKAGE_DOC);
  assert.match(pkg, /Gate F YES.*Launch GO|Gate F YES ≠ Launch GO/i);
  assert.match(pkg, /does not set Launch GO|not Launch GO/i);
});

test("5 manual smoke checklist has PASS FAIL NEEDS_REVIEW columns", () => {
  const pkg = readRepo(PACKAGE_DOC);
  const smoke = pkgSection(pkg, "5. Manual smoke checklist (founder morning)");
  assert.match(smoke, /PASS/);
  assert.match(smoke, /FAIL/);
  assert.match(smoke, /NEEDS_REVIEW/);
  assert.match(smoke, /dashboard-readiness|readiness checklist/i);
  assert.match(smoke, /delegated/i);
});

test("6 package references D7, candidate readiness, and re-audit evidence", () => {
  const pkg = readRepo(PACKAGE_DOC);
  assert.match(pkg, /SEVEN_DAY_D7_FINAL_QA_2026-07-08\.md/);
  assert.match(pkg, /CANDIDATE_READINESS_WORKING_FLOW_2026-07-09\.md/);
  assert.match(pkg, /GATE_F_REAUDIT_RESULT_2026-07-07\.md/);
  assert.match(pkg, /28849996684/);
  assert.match(pkg, /20\/20/);
  readRepo(D7_DOC);
  readRepo(CANDIDATE_FLOW_DOC);
  readRepo(REAUDIT_RESULT);
});

test("7 package — founder decision prompt with YES NO PENDING", () => {
  const pkg = readRepo(PACKAGE_DOC);
  const decisions = pkgSection(pkg, "7. Founder decisions needed (morning)");
  assert.match(decisions, /Gate F = YES/);
  assert.match(decisions, /NO/);
  assert.match(decisions, /PENDING/);
});

test("8 D7 flags align — ready for Gate F review, not launch", () => {
  assert.equal(READY_FOR_GATE_F_REVIEW, true);
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
});

test("9 npm script test:gate-f-founder-review-package-guard registered", () => {
  const pkgJson = read("package.json");
  assert.match(pkgJson, /"test:gate-f-founder-review-package-guard":/);
  assert.match(pkgJson, /gate-f-founder-review-package-guard\.test\.ts/);
});
