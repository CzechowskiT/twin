import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_TIMELINE_ROUTE } from "../src/lib/candidate-application-timeline";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("candidate timeline route exists", () => {
  assert.equal(CANDIDATE_TIMELINE_ROUTE, "/dashboard/applications");
  assert.match(readFileSync(join(root, "src/app/dashboard/applications/page.tsx"), "utf8"), /CandidateApplicationsClient/);
});

test("candidateTimeline keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].candidateTimeline.title.length > 0, locale);
  }
});

test("scope note is honest", () => {
  assert.match(en.candidateTimeline.scopeNote.toLowerCase(), /twin pipeline/);
});
