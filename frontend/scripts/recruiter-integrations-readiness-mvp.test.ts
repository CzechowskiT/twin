import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_INTEGRATIONS_ROUTE, RECRUITER_INTEGRATIONS_FORBIDDEN } from "../src/lib/recruiter-integrations-readiness";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("integrations hub route exists", () => {
  assert.equal(RECRUITER_INTEGRATIONS_ROUTE, "/recruiter/integrations");
  assert.match(readFileSync(join(root, "src/app/recruiter/integrations/page.tsx"), "utf8"), /RecruiterIntegrationsClient/);
});

test("copy avoids fake connected claims", () => {
  const text = [en.recruiterIntegrations.lead, en.recruiterIntegrations.scopeNote].join("\n");
  for (const p of RECRUITER_INTEGRATIONS_FORBIDDEN) assert.doesNotMatch(text, p);
});

test("recruiterIntegrations keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].recruiterIntegrations.title.length > 0, locale);
  }
});
