/**
 * UI product surface QA record — static guard (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CONTROLLED_PILOT_PRIMARY_LIMITS } from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const QA_DOC = "docs/UI_PRODUCT_SURFACE_QA_2026-07-07.md";
const GATE_F_DOC = "docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md";
const AUDIT_DOC = "docs/PRODUCT_SURFACE_VISIBILITY_AUDIT_2026-07-07.md";

const MERGE_SHA_401 = "45a39761c8ea62668db71a5d286974ab2c652860";
const MERGE_SHA_402 = "2c0b6c2e3e7f2f7f12b6b28989256d0defb8b482";
const MERGE_SHA_403 = "a9b4e23c3f2a075546e362c66c4f65481159c630";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function qaDoc(): string {
  return readRepo(QA_DOC);
}

test("1 ui product surface qa doc exists", () => {
  const doc = qaDoc();
  assert.match(doc, /UI Product Surface QA/);
  assert.ok(doc.length > 800, "qa doc must not be empty");
});

test("2 records merge SHAs for PRs 401 402 403", () => {
  const doc = qaDoc();
  assert.match(doc, new RegExp(MERGE_SHA_401.slice(0, 12)));
  assert.match(doc, new RegExp(MERGE_SHA_402.slice(0, 12)));
  assert.match(doc, new RegExp(MERGE_SHA_403.slice(0, 12)));
  assert.match(doc, /#401/);
  assert.match(doc, /#402/);
  assert.match(doc, /#403/);
});

test("3 records deploy alignment and frontend_commit evidence", () => {
  const doc = qaDoc();
  assert.match(doc, /public-health/i);
  assert.match(doc, /frontend_commit/i);
  assert.match(doc, /PENDING deploy|QA pending deploy|ALIGNED/i);
  assert.match(doc, /frontend_commit/i);
});

test("4 header demo qa section present", () => {
  const doc = qaDoc();
  assert.match(doc, /Header DEMO/i);
  assert.match(doc, /Login\/Register|account rail/i);
  assert.match(doc, /PARTIAL|PASS/);
});

test("5 partner logos qa section present", () => {
  const doc = qaDoc();
  assert.match(doc, /Partner logos/i);
  assert.match(doc, /Walmart/i);
  assert.match(doc, /Goldman Sachs/i);
  assert.match(doc, /Wells Fargo/i);
  assert.match(doc, /American Express/i);
});

test("6 product surface visibility qa matches controlled pilot limits", () => {
  const doc = qaDoc();
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.candidate, 8);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.recruiter, 5);
  assert.equal(CONTROLLED_PILOT_PRIMARY_LIMITS.company, 4);
  assert.match(doc, /candidate.*8|≤8|8 primary/i);
  assert.match(doc, /recruiter.*5|≤5|5 primary/i);
  assert.match(doc, /company.*4|≤4|4 primary/i);
  assert.match(doc, /auto-apply not primary|auto-apply/i);
  assert.match(doc, /billing/i);
  assert.match(doc, /calendar|ATS|integrations/i);
  readRepo(AUDIT_DOC);
});

test("7 lists visual follow-ups", () => {
  const doc = qaDoc();
  assert.match(doc, /Visual follow-ups/i);
  assert.match(doc, /\/dashboard/);
  assert.match(doc, /\/recruiter/);
  assert.match(doc, /\/company\/dashboard/);
});

test("8 canonical stance P0 CLOSED Gate E PASS Gate F PENDING Launch NO-GO", () => {
  const doc = qaDoc();
  assert.match(doc, /P0 CLOSED/i);
  assert.match(doc, /Gate E PASS/i);
  assert.match(doc, /20\/20/);
  assert.match(doc, /Gate F PENDING/i);
  assert.match(doc, /Launch NO-GO/i);
});

test("9 does not declare Gate F YES or Launch GO", () => {
  const doc = qaDoc();
  assert.match(doc, /No Gate F YES/i);
  assert.match(doc, /No Launch GO/i);
  assert.doesNotMatch(doc, /\*\*Gate F:\*\* \*\*YES\*\*/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/i);
  readRepo(GATE_F_DOC);
});

test("10 founder decisions S9 P6 Gate F still required", () => {
  const doc = qaDoc();
  assert.match(doc, /S9/);
  assert.match(doc, /P6/);
  assert.match(doc, /Gate F/);
  assert.match(doc, /GATE_F_FOUNDER_FINAL_DECISION/);
});

test("11 npm script test:ui-product-surface-qa-guard registered", () => {
  const pkgJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgJson, /"test:ui-product-surface-qa-guard":/);
  assert.match(pkgJson, /ui-product-surface-qa-guard\.test\.ts/);
});
