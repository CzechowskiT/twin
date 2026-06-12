import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_INTEGRATIONS_FORBIDDEN,
  COMPANY_INTEGRATIONS_ROUTE,
} from "../src/lib/company-integrations-readiness";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("company integrations hub route exists", () => {
  assert.equal(COMPANY_INTEGRATIONS_ROUTE, "/company/integrations");
  assert.match(
    readFileSync(join(root, "src/app/company/integrations/page.tsx"), "utf8"),
    /CompanyIntegrationsClient/,
  );
});

test("copy avoids fake connected claims", () => {
  const text = [en.companyIntegrations.lead, en.companyIntegrations.scopeNote].join("\n");
  for (const p of COMPANY_INTEGRATIONS_FORBIDDEN) assert.doesNotMatch(text, p);
});

test("companyIntegrations keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyIntegrations.title.length > 0, locale);
  }
});
