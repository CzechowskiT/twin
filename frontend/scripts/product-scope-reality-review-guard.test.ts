/**
 * Product scope reality review — static guard (docs + stance, no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const DOC = "docs/PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function readFrontend(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function doc(): string {
  return readRepo(DOC);
}

test("1 product scope reality review doc exists with required sections", () => {
  const content = doc();
  assert.match(content, /Product Scope Reality Review/);
  assert.match(content, /## 1\. Executive summary/);
  assert.match(content, /## 2\. Czy warto developować wszystkie pilot paths/);
  assert.match(content, /## 3\. Per-module estimates/);
  assert.match(content, /## 4\. Roadmap: Now \/ Next \/ Later/);
  assert.match(content, /## 5\. Public launch surface recommendation/);
  assert.match(content, /## 6\. Controlled pilot surface recommendation/);
  assert.match(content, /## 7\. Logo disclaimer/);
  assert.match(content, /## 8\. Concrete founder decisions needed/);
  assert.ok(content.length > 3000, "review doc must be substantive");
});

test("2 effort sizing tiers XS through XXL documented with counts", () => {
  const content = doc();
  for (const tier of ["XS", "S", "M", "L", "XL", "XXL"] as const) {
    assert.match(content, new RegExp(`\\*\\*${tier}\\*\\*`));
  }
  assert.match(content, /MODULE_EFFORT_COUNTS: XS=6, S=9, M=14, L=8, XL=5, XXL=6, TOTAL=48/);
});

test("3 roadmap groups Quick wins Medium Major bets Strategic documented", () => {
  const content = doc();
  assert.match(content, /Quick wins/);
  assert.match(content, /Medium/);
  assert.match(content, /Major bets/);
  assert.match(content, /Not for public launch|Strategic/);
  assert.match(content, /ROADMAP_GROUPS: Quick_wins, Medium, Major_bets, Strategic_not_for_launch/);
});

test("4 logo disclaimer three options with recommendation", () => {
  const content = doc();
  assert.match(content, /Opcja 1/);
  assert.match(content, /Opcja 2/);
  assert.match(content, /Opcja 3/);
  assert.match(content, /LOGO_DISCLAIMER_RECOMMENDATION: Option_1_keep/);
  const marquee = readFrontend("src/components/site-top-marquee.tsx");
  const siteMessages = readFrontend("src/lib/site-messages.ts");
  assert.doesNotMatch(marquee, /site\.marqueeLogoDisclaimer/);
  assert.doesNotMatch(siteMessages, /marqueeLogoDisclaimer/);
});

test("5 public launch and controlled pilot recommendations present", () => {
  const content = doc();
  assert.match(content, /Public launch surface recommendation/);
  assert.match(content, /Controlled pilot surface recommendation/);
  assert.match(content, /PUBLIC_LAUNCH_MODULES: candidate_8_recruiter_5_company_4/);
  assert.match(content, /CONTROLLED_PILOT_PRIMARY_LIMITS/);
});

test("6 answers timeline for all pilot paths vs selective launch", () => {
  const content = doc();
  assert.match(content, /18.?30 miesięcy|18-30_months/);
  assert.match(content, /2.?4 tyg|2-4_weeks/);
  assert.match(content, /SOR_PILOT_COUNT: 57/);
  const pilotCount = SYSTEM_OF_RECORD_ROUTES.filter((r) => r.status === "pilot").length;
  assert.equal(pilotCount, 57, "SoR pilot count must match doc evidence");
});

test("7 canonical stance preserved P0 CLOSED Gate E PASS Gate F PENDING Launch NO-GO", () => {
  const content = doc();
  assert.match(content, /P0 CLOSED/);
  assert.match(content, /Gate E PASS/);
  assert.match(content, /Gate F PENDING/);
  assert.match(content, /Launch NO-GO/);
});

test("8 does NOT declare Launch GO or Gate F YES", () => {
  const content = doc();
  assert.match(content, /NOT.*Launch GO|Launch NO-GO/i);
  assert.match(content, /NOT.*Gate F YES/i);
  assert.doesNotMatch(content, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(content, /Gate F:\s*\*\*YES\*\*/);
  assert.doesNotMatch(content, /Launch GO granted/i);
});

test("9 npm script test:product-scope-reality-review-guard registered", () => {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkg, /"test:product-scope-reality-review-guard":/);
  assert.match(pkg, /product-scope-reality-review-guard\.test\.ts/);
});
