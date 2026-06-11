import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_DASHBOARD_FORBIDDEN_PATTERNS,
  companyDashboardPayloadHasForbiddenPii,
  isCompanyDashboardWorkspaceScoped,
  type CompanyHiringDashboardPayload,
} from "../src/lib/company-hiring-dashboard";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const samplePayload: CompanyHiringDashboardPayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  open_roles: 2,
  pipeline_total: 3,
  pending_review: 1,
  accepted: 1,
  rejected: 1,
  on_hold: 0,
  missing_data_count: 1,
  verification_pending_count: 0,
  team_activity_count: 2,
  roles: [
    {
      job_title: "Backend Engineer",
      candidates: 3,
      pending_review: 1,
      accepted: 1,
      rejected: 1,
    },
  ],
  generated_at: "2026-06-11T12:00:00Z",
};

test("company hiring dashboard route and page exist", () => {
  assert.match(
    readFileSync(join(root, "src/app/company/dashboard/page.tsx"), "utf8"),
    /CompanyDashboardClient/,
  );
  assert.match(
    readFileSync(join(root, "src/app/api/company/dashboard/route.ts"), "utf8"),
    /company\/dashboard/,
  );
  assert.match(
    readFileSync(join(root, "src/app/(marketing)/for-companies/page.tsx"), "utf8"),
    /\/company\/dashboard/,
  );
});

test("dashboard metrics payload is workspace scoped", () => {
  assert.equal(isCompanyDashboardWorkspaceScoped(samplePayload), true);
  assert.equal(isCompanyDashboardWorkspaceScoped({ ...samplePayload, source: "workspace", company_slug: "" }), false);
});

test("company dashboard copy avoids fake traction claims", () => {
  const copy = [en.companyDashboard.lead, en.companyDashboard.pilotBannerBody, en.companyDashboard.scopeNote].join("\n");
  for (const pattern of COMPANY_DASHBOARD_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(copy, pattern);
  }
  assert.match(en.companyDashboard.scopeNote.toLowerCase(), /does not show time-to-hire/);
  assert.match(en.companyDashboard.pilotBannerTitle.toLowerCase(), /no-go/);
});

test("sample dashboard payload exposes no hidden PII keys", () => {
  assert.equal(companyDashboardPayloadHasForbiddenPii(samplePayload), false);
  assert.equal(companyDashboardPayloadHasForbiddenPii({ email: "x@y.com" }), true);
});

test("launch stance unchanged in readiness matrices", () => {
  const prod = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launch = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prod, /NO-GO/i);
  assert.match(launch, /NO-GO/i);
});

test("companyDashboard keys present for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyDashboard.title.length > 0, locale);
  }
});
