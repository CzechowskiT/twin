/**
 * Seven-day public-ready execution plan — static guard (docs + stance, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CONTROLLED_PILOT_PRIMARY_LIMITS } from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const PLAN_DOC = "docs/SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08.md";
const REALITY_REVIEW = "docs/PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function planDoc(): string {
  return readRepo(PLAN_DOC);
}

test("1 seven-day execution plan doc exists with required sections", () => {
  const content = planDoc();
  assert.match(content, /7-dniowy plan wykonawczy/i);
  assert.match(content, /## 1\. Klasyfikacja modułów/);
  assert.match(content, /## 2\. Inventory i klasyfikacja/);
  assert.match(content, /## 4\. Slice/i);
  assert.match(content, /## 5\. Harmonogram Day 1–7/);
  assert.match(content, /## 6\. Powierzchnie launch/);
  assert.match(content, /## 7\. Logo disclaimer/);
  assert.match(content, /## 8\. Decyzje foundera/);
  assert.ok(content.length > 5000, "plan doc must be substantive");
});

test("2 reality review links seven-day plan and marks 18-30 months superseded", () => {
  const review = readRepo(REALITY_REVIEW);
  assert.match(review, /SEVEN_DAY_PUBLIC_READY_EXECUTION_PLAN_2026-07-08\.md/);
  assert.match(review, /SUPERSEDED/i);
  assert.match(review, /18.?30 miesięcy/);
});

test("3 plan does NOT recommend 18-30 months as passive execution path", () => {
  const content = planDoc();
  assert.match(content, /SUPERSEDES_TIMELINE_RECOMMENDATION: 18-30_months_passive/);
  assert.match(content, /Nie.*rekomendujemy 18.?30 miesięcy/i);
  assert.doesNotMatch(
    content,
    /\*\*Rekomendacja:\*\*[\s\S]{0,120}18.?30 miesięcy/i,
  );
  assert.doesNotMatch(content, /2.?3 FTE.*rekomend/i);
});

test("4 Day 1 through Day 7 schedule documented", () => {
  const content = planDoc();
  for (let day = 1; day <= 7; day += 1) {
    assert.match(content, new RegExp(`\\*\\*D${day}\\*\\*|Dzień ${day}|Day ${day}`, "i"));
  }
  assert.match(content, /Marketing/);
  assert.match(content, /Candidate|Kandydat/i);
  assert.match(content, /Recruiter/i);
  assert.match(content, /Company|Firma/i);
  assert.match(content, /Investor/i);
  assert.match(content, /Integrations|billing|calendar/i);
  assert.match(content, /QA/);
});

test("5 module classifications and counts ship hide pilot_only roadmap founder_decision", () => {
  const content = planDoc();
  assert.match(content, /\*\*ship\*\*/i);
  assert.match(content, /\*\*hide\*\*/i);
  assert.match(content, /pilot_only/i);
  assert.match(content, /\*\*roadmap\*\*/i);
  assert.match(content, /founder_decision/i);
  assert.match(
    content,
    /SEVEN_DAY_CLASSIFICATION_COUNTS: ship=12, hide=14, pilot_only=11, roadmap=8, founder_decision=3, TOTAL=48/,
  );
});

test("6 launch surfaces A minimum B aggressive C excluded", () => {
  const content = planDoc();
  assert.match(content, /LAUNCH_SURFACE_A:/);
  assert.match(content, /LAUNCH_SURFACE_B:/);
  assert.match(content, /LAUNCH_SURFACE_C_EXCLUDED:/);
  assert.match(content, /candidate_8_recruiter_5_company_4/);
  assert.match(content, /A_plus_ship_12_modules/);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.candidate, 8);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.company, 4);
});

test("7 logo disclaimer options A B C with subtle premium recommendation", () => {
  const content = planDoc();
  assert.match(content, /Opcja.*A|Option_A/i);
  assert.match(content, /Opcja.*B|Option_B/i);
  assert.match(content, /Opcja.*C|Option_C/i);
  assert.match(content, /LOGO_DISCLAIMER_RECOMMENDATION: Option_A_subtle_premium/);
  assert.match(content, /premium UX/i);
  assert.doesNotMatch(content, /LOGO_DISCLAIMER_RECOMMENDATION: Option_C/);
});

test("8 canonical stance preserved — NOT Launch GO NOT Gate F YES", () => {
  const content = planDoc();
  assert.match(content, /P0 CLOSED/);
  assert.match(content, /Gate E PASS/);
  assert.match(content, /Gate F PENDING/);
  assert.match(content, /Launch NO-GO/);
  assert.match(content, /NOT_LAUNCH_GO: true/);
  assert.match(content, /NOT_GATE_F_YES: true/);
  assert.doesNotMatch(content, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(content, /Gate F:\s*\*\*YES\*\*/);
});

test("9 npm script test:seven-day-public-ready-plan-guard registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /"test:seven-day-public-ready-plan-guard":/);
  assert.match(pkg, /seven-day-public-ready-plan-guard\.test\.ts/);
});
