import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_ANALYTICS_ROUTE } from "../src/lib/recruiter-analytics";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("analytics route exists", () => {
  assert.equal(RECRUITER_ANALYTICS_ROUTE, "/recruiter/analytics");
  assert.match(readFileSync(join(root, "src/app/recruiter/analytics/page.tsx"), "utf8"), /RecruiterAnalyticsClient/);
});

test("scope note excludes fake traction", () => {
  assert.match(en.recruiterAnalytics.scopeNote.toLowerCase(), /not.*bi live|remain not live/);
});

test("recruiterAnalytics keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].recruiterAnalytics.title.length > 0, locale);
  }
});
