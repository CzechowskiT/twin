import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_PIPELINE_FORBIDDEN_PATTERNS,
  companyPipelinePayloadHasForbiddenPii,
  isCompanyPipelineWorkspaceScoped,
  type CompanyPipelineQualityPayload,
} from "../src/lib/company-pipeline-quality";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const samplePayload: CompanyPipelineQualityPayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  generated_at: "2026-06-11T12:00:00Z",
  total_applications: 3,
  company_totals: { in_review: 1, accepted: 1, invited: 1, rejected: 0, on_hold: 0 },
  average_match_score: 72.5,
  missing_data_count: 1,
  verification_risk_count: 1,
  roles: [
    {
      role_title: "Backend Engineer",
      job_id: 10,
      segments: { in_review: 1, accepted: 1, invited: 1, rejected: 0, on_hold: 0 },
      total: 3,
      average_match_score: 72.5,
      missing_data_count: 1,
      verification_risk_count: 1,
    },
  ],
  recruiter_activity: null,
};

test("company pipeline route and page exist", () => {
  assert.match(readFileSync(join(root, "src/app/company/pipeline/page.tsx"), "utf8"), /CompanyPipelineClient/);
  assert.match(readFileSync(join(root, "src/app/api/company/pipeline/route.ts"), "utf8"), /pipeline-quality/);
  assert.match(readFileSync(join(root, "src/app/(marketing)/for-companies/page.tsx"), "utf8"), /\/company\/pipeline/);
});

test("metrics payload is workspace scoped", () => {
  assert.equal(isCompanyPipelineWorkspaceScoped(samplePayload), true);
  assert.equal(isCompanyPipelineWorkspaceScoped({ ...samplePayload, source: "workspace", company_slug: "" }), false);
});

test("company pipeline copy avoids fake hire claims in marketing strings", () => {
  const marketing = [en.companyPipeline.lead, en.companyPipeline.demoDisclaimer].join("\n");
  for (const pattern of COMPANY_PIPELINE_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(marketing, pattern);
  }
  assert.match(en.companyPipeline.scopeNote.toLowerCase(), /does not show time-to-hire/);
});

test("sample payload exposes no hidden PII keys", () => {
  assert.equal(companyPipelinePayloadHasForbiddenPii(samplePayload), false);
  assert.equal(companyPipelinePayloadHasForbiddenPii({ email: "x@y.com" }), true);
});

test("launch stance unchanged in readiness matrices", () => {
  const prod = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launch = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prod, /NO-GO/i);
  assert.match(launch, /NO-GO/i);
});

test("companyPipeline keys present for all locales", () => {
  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].companyPipeline.title.length > 0, locale);
  }
});
