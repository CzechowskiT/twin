/**
 * Static guardrails for company jobs & roles management MVP.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { en, dictionaries, LOCALES } from "../src/lib/i18n";
import {
  COMPANY_JOBS_FORBIDDEN_PATTERNS,
  COMPANY_ROLES_ROUTE,
} from "../src/lib/company-jobs-roles";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const LIST_PAGE = "src/app/company/roles/page.tsx";
const FORM = "src/components/company/company-role-form.tsx";
const NAV = "src/components/company/company-workspace-nav.tsx";
const LIB = "src/lib/company-jobs-roles.ts";
const API_LIST = "src/app/api/company/roles/route.ts";
const API_DETAIL = "src/app/api/company/roles/[roleId]/route.ts";
const CHECKLIST = "src/components/company/company-role-quality-checklist.tsx";
const LAUNCH_MATRIX = "../docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md";
const DOC = "../docs/COMPANY_JOBS_ROLES_MANAGEMENT_MVP_2026-06-11.md";

test("roles route and page exist", () => {
  assert.equal(COMPANY_ROLES_ROUTE, "/company/roles");
  assert.match(read(LIST_PAGE), /data-company-roles-page="true"/);
  assert.match(read(LIST_PAGE), /CompanyRoleCard/);
});

test("internal-only trust banner and no external posting copy", () => {
  const form = read(FORM);
  assert.match(form, /data-company-roles-trust="internal-only"/);
  assert.match(form, /companyJobs\.trustTitle/);
  for (const pattern of COMPANY_JOBS_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(form, pattern, `Forbidden in form: ${pattern}`);
    assert.doesNotMatch(read(LIST_PAGE), pattern, `Forbidden in list: ${pattern}`);
  }
});

test("read-only mode is labeled when API unavailable", () => {
  const list = read(LIST_PAGE);
  assert.match(list, /data-company-roles-readonly="true"/);
  assert.match(list, /companyJobs\.readOnlyUnavailable/);
  assert.match(read(FORM), /aria-disabled/);
});

test("quality checklist component wired", () => {
  assert.match(read(FORM), /CompanyRoleQualityChecklist/);
  assert.match(read(CHECKLIST), /data-company-role-quality="true"/);
});

test("company workspace nav links roles", () => {
  const nav = read(NAV);
  assert.match(nav, /COMPANY_ROLES_ROUTE/);
  assert.match(nav, /navRoles/);
  assert.match(nav, /companyJobs\.\$\{item\.key\}/);
});

test("api proxies target company roles endpoints", () => {
  assert.match(read(API_LIST), /\/api\/v1\/company\/roles/);
  assert.match(read(API_DETAIL), /\/api\/v1\/company\/roles/);
  assert.match(read(API_LIST), /recruiterInboxProxyGate/);
  assert.doesNotMatch(read(API_LIST), /DELETE/);
});

test("companyJobs i18n keys exist for all locales", () => {
  for (const locale of LOCALES) {
    const dict = dictionaries[locale] as typeof en;
    assert.ok(dict.companyJobs?.title, `${locale} missing companyJobs.title`);
    assert.ok(dict.companyJobs?.trustBody, `${locale} missing trustBody`);
    assert.ok(dict.companyJobs?.status_active, `${locale} missing status_active`);
  }
});

test("launch stance unchanged in public readiness matrix", () => {
  const matrix = read(LAUNCH_MATRIX);
  assert.match(matrix, /Public launch NO-GO/i);
});

test("mvp doc exists and states internal-only scope", () => {
  const doc = read(DOC);
  assert.match(doc, /internal/i);
  assert.match(doc, /NO-GO|no external/i);
});

console.log("company-jobs-roles-management-mvp: ok");
