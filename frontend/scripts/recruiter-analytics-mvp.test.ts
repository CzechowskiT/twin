import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RECRUITER_ANALYTICS_ROUTE, isRecruiterAnalyticsWorkspaceScoped } from "../src/lib/recruiter-analytics";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("recruiter analytics route exists", () => {
  assert.match(readFileSync(join(root, "src/app/recruiter/analytics/page.tsx"), "utf8"), /RecruiterAnalyticsClient/);
  assert.equal(RECRUITER_ANALYTICS_ROUTE, "/recruiter/analytics");
});

test("analytics copy avoids fake traction", () => {
  assert.match(en.recruiterAnalytics.notLiveNote.toLowerCase(), /not live/);
});

test("recruiterAnalytics keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].recruiterAnalytics.title.length > 0, locale);
  }
});

test("sample payload workspace scoped", () => {
  assert.equal(
    isRecruiterAnalyticsWorkspaceScoped({
      company_slug: "x",
      source: "workspace",
      generated_at: "",
      window_days: 7,
      applications_total: 0,
      applications_by_status: {},
      audit_events_total: 0,
      audit_decisions: 0,
      audit_reviews_opened: 0,
      calendar_sync_live: false,
      readiness: { public_launch: false, analytics_export: false },
    }),
    true,
  );
});
