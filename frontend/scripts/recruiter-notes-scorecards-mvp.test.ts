import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("scorecard panel and API route exist", () => {
  assert.match(readFileSync(join(root, "src/components/recruiter/recruiter-scorecard-panel.tsx"), "utf8"), /RecruiterScorecardPanel/);
  assert.match(readFileSync(join(root, "src/app/api/recruiter/inbox/[applicationId]/scorecard/route.ts"), "utf8"), /scorecard/);
  assert.match(readFileSync(join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"), "utf8"), /RecruiterScorecardPanel/);
});

test("scorecard copy excludes audit trail overlap", () => {
  assert.match(en.recruiterScorecard.lead.toLowerCase(), /not.*audit trail/);
});

test("recruiterScorecard keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].recruiterScorecard.title.length > 0, locale);
  }
});

test("migration 056 exists", () => {
  assert.match(
    readFileSync(join(root, "..", "backend", "alembic", "versions", "056_recruiter_application_scorecards.py"), "utf8"),
    /056_recruiter_application_scorecards/,
  );
});
