/**
 * Recruiter & company placement verification checklist — routes and guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_PLACEMENT_VERIFICATION_MARKERS,
  COMPANY_PLACEMENT_VERIFICATION_ROUTE,
  RECRUITER_PLACEMENT_VERIFICATION_MARKERS,
  RECRUITER_PLACEMENT_VERIFICATION_ROUTE,
  resolveCompanyPlacementChecklist,
  resolveRecruiterPlacementChecklist,
} from "../src/lib/recruiter-company-placement-verification-checklist";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /employer confirmed/i,
  /invoice sent/i,
  /payment captured/i,
  /revenue recognized/i,
  /legally verified/i,
  /launch ready/i,
  /email sent/i,
  /ATS synced/i,
  /contract signed/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 recruiter placement-verification route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/placement-verification/page.tsx")));
});

test("2 company placement-verification route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/placement-verification/page.tsx")));
});

test("3 recruiter checklist has persona-specific items", () => {
  const record = resolveRecruiterPlacementChecklist();
  assert.ok(record.items.some((i) => i.persona === "recruiter"));
  assert.equal(record.disabled_actions.length, 3);
});

test("4 company checklist has persona-specific items", () => {
  const record = resolveCompanyPlacementChecklist();
  assert.ok(record.items.some((i) => i.persona === "company"));
  assert.equal(record.disabled_actions.length, 3);
});

test("5 recruiter workspace renders checklist and cross-links", () => {
  const ws = read("src/components/recruiter/recruiter-placement-verification-checklist-workspace.tsx");
  assert.match(ws, /markers\.checklist/);
  assert.match(ws, /OperationalCrossLinksPanel/);
  assert.match(ws, /disabled/);
});

test("6 company workspace renders checklist and cross-links", () => {
  const ws = read("src/components/company/company-placement-verification-checklist-workspace.tsx");
  assert.match(ws, /COMPANY_PLACEMENT_VERIFICATION_MARKERS\.checklist/);
  assert.match(ws, /OperationalCrossLinksPanel/);
});

test("7 route constants", () => {
  assert.equal(RECRUITER_PLACEMENT_VERIFICATION_ROUTE, "/recruiter/placement-verification");
  assert.equal(COMPANY_PLACEMENT_VERIFICATION_ROUTE, "/company/placement-verification");
});

test("8 i18n placementChecklist keys in en and pl", () => {
  assert.ok(en.placementChecklist.recruiterPageTitle);
  assert.ok(dictionaries.pl.placementChecklist.companyPageTitle);
});

test("9 no forbidden commercial claims in copy", () => {
  const blob = JSON.stringify(en.placementChecklist) + JSON.stringify(dictionaries.pl.placementChecklist);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});
