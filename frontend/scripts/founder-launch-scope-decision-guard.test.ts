/**
 * Founder launch scope decision — static guard (docs + stance, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CONTROLLED_PILOT_PRIMARY_LIMITS } from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const DOC = "docs/FOUNDER_LAUNCH_SCOPE_DECISION_2026-07-08.md";
const SCOPE_REVIEW = "docs/PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function doc(): string {
  return readRepo(DOC);
}

test("1 founder launch scope decision doc exists with sections A through H", () => {
  const content = doc();
  assert.match(content, /Founder Launch Scope Decision/);
  assert.match(content, /## A\. Current stance/);
  assert.match(content, /## B\. Accepted product reality/);
  assert.match(content, /## C\. Proposed public launch surface/);
  assert.match(content, /## D\. Controlled pilot only/);
  assert.match(content, /## E\. Hidden \/ hold/);
  assert.match(content, /## F\. Logo disclaimer/);
  assert.match(content, /## G\. Founder checkboxes/);
  assert.match(content, /## H\. Explicit non-claims/);
  assert.ok(content.length > 2500, "decision doc must be substantive");
});

test("2 links product scope reality review and machine-readable stance", () => {
  const content = doc();
  assert.match(content, /PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08\.md/);
  assert.match(content, /CANONICAL_STANCE: P0_CLOSED\|Gate_E_PASS\|Gate_F_PENDING\|Launch_NO-GO/);
  assert.match(content, /FOUNDER_LAUNCH_SCOPE_DECISION_DATE: 2026-07-08/);
  readRepo(SCOPE_REVIEW);
});

test("3 accepted reality 18-30 months 2-3 FTE scoped launch", () => {
  const content = doc();
  assert.match(content, /18.?30/);
  assert.match(content, /2.?3 FTE|2-3_FTE/);
  assert.match(content, /ACCEPTED_REALITY: 18-30_months\|2-3_FTE\|scoped_launch/);
  assert.match(content, /2.?4 tyg|2-4_weeks/);
});

test("4 public launch surface candidate 8 recruiter 5 company 4", () => {
  const content = doc();
  assert.match(content, /PUBLIC_LAUNCH_MODULES: candidate_8_recruiter_5_company_4/);
  assert.match(content, /Candidate[\s\S]*\*\*8\*\*/);
  assert.match(content, /Recruiter[\s\S]*\*\*5\*\*/);
  assert.match(content, /Company[\s\S]*\*\*4\*\*/);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.candidate, 8);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.company, 4);
});

test("5 controlled pilot limits and hidden module ids documented", () => {
  const content = doc();
  assert.match(content, /CONTROLLED_PILOT_PRIMARY_LIMITS/);
  assert.match(content, /isPilotPreviewChromePath/);
  assert.match(content, /auto_apply/);
  assert.match(content, /company_billing/);
  assert.match(content, /HIDDEN_HOLD_MODULE_IDS:/);
});

test("6 logo disclaimer options 1 2 3 default option 1", () => {
  const content = doc();
  assert.match(content, /Opcja 1|Option_1/);
  assert.match(content, /Opcja 2|Option_2/);
  assert.match(content, /Opcja 3|Option_3/);
  assert.match(content, /LOGO_DISCLAIMER_DEFAULT: Option_1_keep/);
});

test("7 founder checkboxes YES NO EDIT logo and Gate F next step", () => {
  const content = doc();
  assert.match(content, /YES[\s\S]*NO[\s\S]*EDIT/);
  assert.match(content, /FOUNDER_CHECKBOX_FORMAT: YES\|NO\|EDIT/);
  assert.match(content, /Logo disclaimer/);
  assert.match(content, /Gate F next step/);
  assert.match(content, /Accept recommended scoped surface/);
  assert.match(content, /Accept recommended pilot surface/);
  assert.match(content, /Accept hidden\/hold list/);
  assert.match(content, /Proceed to Gate F decision/);
  assert.match(content, /Keep Gate F pending/);
  assert.match(content, /FOUNDER_GATE_F_NEXT_STEP/);
});

test("8 canonical stance P0 CLOSED Gate E PASS Gate F PENDING Launch NO-GO", () => {
  const content = doc();
  assert.match(content, /P0 CLOSED/);
  assert.match(content, /Gate E PASS/);
  assert.match(content, /Gate F PENDING/);
  assert.match(content, /Launch NO-GO/);
});

test("9 does NOT declare Launch GO or Gate F YES", () => {
  const content = doc();
  assert.match(content, /NOT Launch GO/i);
  assert.match(content, /NOT Gate F YES/i);
  assert.match(content, /Gate F YES ≠ Launch GO|Gate F YES.*Launch GO/i);
  assert.match(content, /EXPLICIT_NON_CLAIMS: NOT_Launch_GO\|NOT_Gate_F_YES\|Gate_F_PENDING/);
  assert.doesNotMatch(content, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(content, /Gate F:\s*\*\*YES\*\*/);
  assert.doesNotMatch(content, /Launch GO granted/i);
});

test("10 npm script test:founder-launch-scope-decision-guard registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /"test:founder-launch-scope-decision-guard":/);
  assert.match(pkg, /founder-launch-scope-decision-guard\.test\.ts/);
});
