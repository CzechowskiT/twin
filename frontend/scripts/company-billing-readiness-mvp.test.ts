import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_BILLING_ROUTE,
  companyBillingPayloadHasForbiddenPii,
  isCompanyBillingWorkspaceScoped,
  type CompanyPlanUsagePayload,
} from "../src/lib/company-billing-readiness";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const sample: CompanyPlanUsagePayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  generated_at: "2026-06-11T12:00:00Z",
  billing_live: false,
  plan: "pilot",
  usage: { open_roles: 2, reviewed_candidates: 3, team_seats: 1 },
  integrations: [{ key: "employer_billing", status: "not_live" }],
};

test("company billing route exists", () => {
  assert.match(readFileSync(join(root, "src/app/company/billing/page.tsx"), "utf8"), /CompanyBillingClient/);
  assert.match(readFileSync(join(root, "src/app/api/company/billing/route.ts"), "utf8"), /plan-usage/);
  assert.equal(COMPANY_BILLING_ROUTE, "/company/billing");
});

test("billing payload workspace scoped", () => {
  assert.equal(isCompanyBillingWorkspaceScoped(sample), true);
  assert.equal(isCompanyBillingWorkspaceScoped({ ...sample, company_slug: "" }), false);
});

test("billing copy states not live", () => {
  assert.match(en.companyBilling.billingNotLiveBody.toLowerCase(), /not enabled|nie są włączone/);
  assert.match(en.companyBilling.scopeNote.toLowerCase(), /does not show invoices/);
});

test("no forbidden PII in sample", () => {
  assert.equal(companyBillingPayloadHasForbiddenPii(sample), false);
});

test("companyBilling keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyBilling.title.length > 0, locale);
  }
});
