import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_INTERVIEW_PREP_ROUTE } from "../src/lib/candidate-interview-prep";
import { dictionaries, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("interview prep route exists", () => {
  assert.equal(CANDIDATE_INTERVIEW_PREP_ROUTE, "/dashboard/interview-prep");
  assert.match(readFileSync(join(root, "src/app/dashboard/interview-prep/page.tsx"), "utf8"), /CandidateInterviewPrepClient/);
});

test("candidateInterviewPrep keys for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].candidateInterviewPrep.title.length > 0, locale);
  }
});
