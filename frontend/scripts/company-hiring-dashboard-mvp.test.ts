import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_HIRING_FORBIDDEN_PATTERNS,
  COMPANY_HIRING_ROUTE,
  companyHiringPayloadHasForbiddenPii,
  isCompanyHiringWorkspaceScoped,
  type CompanyHiringDashboardPayload,
} from "../src/lib/company-hiring-dashboard";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const samplePayload: CompanyHiringDashboardPayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  generated_at: "2026-06-11T12:00:00Z",
  roles_total: 2,
  roles_active: 1,
  roles_draft: 1,
  pipeline_total_applications: 5,
  pipeline_segments: { in_review: 2, accepted: 1, invited: 1, rejected: 1, on_hold: 0 },
  average_match_score: 70,
  team_tokens: 1,
  session_authenticated: true,
  readiness: { billing_live: false, public_launch: false, invites_live: false },
  links: { roles: "/company/roles", pipeline: "/company/pipeline", team: "/company/team", inbox: "/recruiter/inbox" },
};

test("company hiring dashboard route and page exist", () => {
  assert.match(readFileSync(join(root, "src/app/company/dashboard/page.tsx"), "utf8"), /CompanyDashboardClient/);
  assert.match(readFileSync(join(root, "src/app/api/company/dashboard/route.ts"), "utf8"), /hiring-dashboard/);
  assert.equal(COMPANY_HIRING_ROUTE, "/company/dashboard");
});

test("dashboard payload is workspace scoped", () => {
  assert.equal(isCompanyHiringWorkspaceScoped(samplePayload), true);
  assert.equal(isCompanyHiringWorkspaceScoped({ ...samplePayload, source: "workspace", company_slug: "" }), false);
});

test("company hiring copy avoids fake traction claims", () => {
  const marketing = [en.companyHiring.lead, en.companyHiring.readinessLaunch].join("\n");
  for (const pattern of COMPANY_HIRING_FORBIDDEN_PATTERNS.filter((p) => p.source !== "revenue")) {
    assert.doesNotMatch(marketing, pattern);
  }
  assert.match(en.companyHiring.readinessBilling.toLowerCase(), /not live/);
  assert.match(en.companyHiring.lead.toLowerCase(), /no revenue/);
});

test("sample payload exposes no hidden PII keys", () => {
  assert.equal(companyHiringPayloadHasForbiddenPii(samplePayload), false);
  assert.equal(companyHiringPayloadHasForbiddenPii({ email: "x@y.com" }), true);
});

test("companyHiring keys present for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyHiring.title.length > 0, locale);
  }
});
