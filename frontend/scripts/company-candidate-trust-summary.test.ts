import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID,
  COMPANY_CANDIDATE_TRUST_SUMMARY_ROUTE,
  companyCandidateTrustSummaryHref,
  resolveCompanyCandidateTrustSummary,
} from "../src/lib/company-candidate-trust-summary";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCompanyCandidateTrustSummary as kernelSummary } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/trust-summary/page.tsx")));
});

test("2 demo resolves", () => {
  assert.ok(resolveCompanyCandidateTrustSummary(COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID));
  assert.equal(resolveCompanyCandidateTrustSummary("other"), null);
});

test("3 href", () => {
  assert.equal(companyCandidateTrustSummaryHref(), COMPANY_CANDIDATE_TRUST_SUMMARY_ROUTE);
});

test("4 SOR registry", () => {
  assert.ok(SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_candidate_trust_summary"));
});

test("5 kernel", () => {
  assert.ok(kernelSummary(COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID));
});

test("6 i18n EN PL", () => {
  assert.ok(en.companyCandidateTrustSummary.pageTitle);
  assert.ok(dictionaries.pl.companyCandidateTrustSummary.pageTitle);
});

test("7 workspace markers", () => {
  const ws = readFileSync(join(root, "src/components/company/company-candidate-trust-summary-workspace.tsx"), "utf8");
  assert.match(ws, /COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.status/);
});

test("8 package scripts", () => {
  assert.match(readFileSync(join(root, "package.json"), "utf8"), /test:company-candidate-trust-summary/);
});
