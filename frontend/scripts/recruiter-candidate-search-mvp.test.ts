import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_SEARCH_FORBIDDEN_PII,
  recruiterInboxHighlightHref,
  recruiterSearchRowHasForbiddenPii,
} from "../src/lib/recruiter-candidate-search";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const FORBIDDEN_SCALE = [
  /\bmillions of candidates\b/i,
  /\bthousands of candidates\b/i,
  /\bglobal talent database\b/i,
  /\blinkedin scraping\b/i,
];

test("search route and page module exist", () => {
  assert.match(readSrc("src/app/recruiter/search/page.tsx"), /RecruiterSearchClient/);
  assert.match(readSrc("src/app/api/recruiter/search/route.ts"), /recruiter\/search/);
  assert.match(readSrc("src/app/workspace/recruiter/page.tsx"), /\/recruiter\/search/);
});

test("search input and filters markers exist in client UI", () => {
  const client = readSrc("src/app/recruiter/search/recruiter-search-client.tsx");
  assert.match(client, /RECRUITER_SEARCH_MARKERS\.searchInput/);
  assert.match(client, /RECRUITER_SEARCH_MARKERS\.filtersPanel/);
  assert.match(client, /filterMinScore/);
  assert.match(client, /filterPipeline/);
  assert.match(client, /filterConfidence/);
});

test("sample search rows do not contain hidden PII markers", () => {
  const safeRow = {
    application_id: 1,
    candidate_name: "Alex",
    match_score: 72,
    review_card: { data_confidence: "medium" },
  };
  assert.equal(recruiterSearchRowHasForbiddenPii(safeRow), false);
  for (const marker of RECRUITER_SEARCH_FORBIDDEN_PII) {
    const leaky = { note: `leak ${marker} here` };
    assert.equal(recruiterSearchRowHasForbiddenPii(leaky), true);
  }
});

test("empty state copy mentions no external sourcing", () => {
  assert.match(en.recruiterSearch.emptyBody.toLowerCase(), /no external sourcing/);
  assert.match(en.recruiterSearch.scopeBody.toLowerCase(), /no external sourcing/);
});

test("recruiter search copy avoids fake scale and scraping claims", () => {
  const blob = JSON.stringify(en.recruiterSearch);
  for (const pattern of FORBIDDEN_SCALE) {
    assert.doesNotMatch(blob, pattern);
  }
  assert.match(en.recruiterSearch.lead.toLowerCase(), /not a global sourcing/);
  assert.doesNotMatch(en.recruiterSearch.lead.toLowerCase(), /millions/);
});

test("review card link targets inbox highlight", () => {
  const href = recruiterInboxHighlightHref(42);
  assert.equal(href, "/recruiter/inbox?highlight=42");
  const client = readSrc("src/app/recruiter/search/recruiter-search-client.tsx");
  assert.match(client, /RECRUITER_SEARCH_MARKERS\.reviewCardLink/);
  assert.match(client, /recruiterInboxHighlightHref/);
});

test("launch stance unchanged in matrices and search pilot hint", () => {
  const prodMatrix = readFileSync(
    join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"),
    "utf8",
  );
  const launchMatrix = readFileSync(
    join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"),
    "utf8",
  );
  assert.match(prodMatrix, /NO-GO/i);
  assert.match(launchMatrix, /NO-GO/i);
  assert.match(prodMatrix, /RECRUITER_CANDIDATE_SEARCH_MVP_2026-06-11/);
});

test("recruiterSearch keys present for all locales via en fallback", () => {
  for (const locale of LOCALES) {
    const copy = dictionaries[locale].recruiterSearch;
    assert.ok(copy.title.length > 0, `title missing for ${locale}`);
    assert.ok(copy.emptyBody.length > 0, `emptyBody missing for ${locale}`);
  }
});
