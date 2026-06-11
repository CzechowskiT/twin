import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_EVIDENCE_ROUTE } from "../src/lib/candidate-evidence-vault";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("evidence vault route and page exist", () => {
  assert.equal(CANDIDATE_EVIDENCE_ROUTE, "/dashboard/evidence");
  assert.match(readFileSync(join(root, "src/app/dashboard/evidence/page.tsx"), "utf8"), /CandidateEvidenceClient/);
  assert.match(
    readFileSync(join(root, "src/app/dashboard/evidence/candidate-evidence-client.tsx"), "utf8"),
    /candidates\/me\/evidence/,
  );
});

test("scope note avoids verified claims", () => {
  assert.match(en.candidateEvidence.scopeNote.toLowerCase(), /verified/);
  assert.match(en.candidateEvidence.lead.toLowerCase(), /skill|evidence/);
});

test("candidateEvidence keys present for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].candidateEvidence.title.length > 0, locale);
    assert.ok(dictionaries[locale].candidateEvidence.type_project.length > 0, locale);
  }
});
