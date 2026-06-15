import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_TALENT_POOL_FORBIDDEN_COPY,
  COMPANY_TALENT_POOL_MARKERS,
  COMPANY_TALENT_POOL_ROUTE,
  companyTalentPoolPayloadHasForbiddenPii,
  isCompanyTalentPoolWorkspaceScoped,
  type CompanyTalentPoolPayload,
} from "../src/lib/company-talent-pool";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const samplePayload: CompanyTalentPoolPayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  generated_at: "2026-06-15T12:00:00Z",
  executive_summary: {
    known_candidates: 1,
    imported_candidates: 2,
    radar_ready: 1,
    data_gaps: 1,
    potential_duplicates: 0,
    active_sources: 1,
    planned_sources: 2,
  },
  summary: {
    total_records: 2,
    shown: 2,
    quality_high: 1,
    quality_medium: 1,
    quality_low: 0,
    import_batches: 1,
    last_import_at: "2026-06-15T10:00:00",
    last_import_status: "committed",
  },
  data_quality: {
    levels: { high: 1, medium: 1 },
    top_warnings: [{ code: "missing_skills", count: 1 }],
    dimensions: {
      missing_role_title: 0,
      missing_skills: 1,
      missing_consent: 1,
      stale_records: 0,
      duplicates: 0,
    },
  },
  source_coverage: {
    imported_internal_pool: 2,
    import_sources: { csv_paste: 1 },
    external_sourcing: false,
    live_ats_sync: false,
    applications: 0,
    inbox: 1,
    scorecards: 0,
    notes: 0,
    import_pool: 2,
    ats_connectors_planned: true,
  },
  items: [
    {
      id: 1,
      display_name: "Alex Kowalski",
      job_title: "Backend Engineer",
      skills: ["Python"],
      source: "imported_internal_pool",
    },
  ],
  links: {
    recruiter_import: "/recruiter/talent-pool/import",
    integrations: "/company/integrations",
    pipeline: "/company/pipeline",
    recruiter_pool: "/recruiter/talent-pool",
  },
  scope_note: "Internal only",
};

test("1 company talent pool route exists", () => {
  assert.equal(COMPANY_TALENT_POOL_ROUTE, "/company/talent-pool");
  assert.match(readSrc("src/app/company/talent-pool/page.tsx"), /CompanyTalentPoolClient/);
  assert.match(readSrc("src/app/api/company/talent-pool/route.ts"), /talent-pool/);
});

test("2 dashboard card module configured", () => {
  const mod = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "talent_pool");
  assert.ok(mod);
  assert.equal(mod?.href, "/company/talent-pool");
  assert.equal(mod?.status, "pilot");
  assert.equal(mod?.titleKey, "workspaceModules.companyTalentPoolTitle");
});

test("3 nav and cross-links wired", () => {
  assert.match(readSrc("src/components/company/company-workspace-nav.tsx"), /COMPANY_TALENT_POOL_ROUTE/);
  assert.match(readSrc("src/app/company/pipeline/company-pipeline-client.tsx"), /\/company\/talent-pool/);
  assert.match(readSrc("src/app/company/integrations/company-integrations-client.tsx"), /\/company\/talent-pool/);
  assert.match(readSrc("src/app/company/roles/page.tsx"), /\/company\/talent-pool/);
});

test("4 hero chips and summary panels", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /chipPilot/);
  assert.match(client, /chipInternalFirst/);
  assert.match(client, /chipNoOutreach/);
  assert.match(client, /chipRecruiterReview/);
  assert.match(client, /chipAtsPlanned/);
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.summaryPanel/);
  assert.match(client, /EXEC_SUMMARY_KEYS/);
});

test("5 data quality and source coverage panels", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.qualityPanel/);
  assert.match(client, /QUALITY_DIM_KEYS/);
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.sourceCoverage/);
  assert.match(client, /SOURCE_KEYS/);
});

test("6 empty state and records list", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.emptyState/);
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.recordsList/);
  assert.match(client, /recordsSafeNote/);
});

test("7 no forbidden outreach language", () => {
  const blob = JSON.stringify(en.companyTalentPool);
  for (const pattern of COMPANY_TALENT_POOL_FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern);
  }
  assert.match(en.companyTalentPool.chipNoOutreach.toLowerCase(), /no automatic outreach/);
  assert.match(en.companyTalentPool.trustCopy.toLowerCase(), /no live ats sync/);
});

test("8 no contact PII fields in client", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.doesNotMatch(client, /\bemail\b/i);
  assert.doesNotMatch(client, /\bphone\b/i);
  assert.equal(companyTalentPoolPayloadHasForbiddenPii(samplePayload), false);
  assert.equal(companyTalentPoolPayloadHasForbiddenPii({ email: "x@y.com" }), true);
});

test("9 workspace scoped payload guard", () => {
  assert.equal(isCompanyTalentPoolWorkspaceScoped(samplePayload), true);
  assert.equal(isCompanyTalentPoolWorkspaceScoped({ ...samplePayload, source: "external" }), false);
});

test("10 integrations readiness includes talent pool", () => {
  const integrations = readSrc("src/lib/company-integrations-readiness.ts");
  assert.match(integrations, /talent_pool_import/);
  assert.match(integrations, /\/company\/talent-pool/);
});

test("11 design doc referenced", () => {
  const doc = readFileSync(join(root, "..", "docs", "COMPANY_TALENT_POOL_VIEW_MVP_2026-06-15.md"), "utf8");
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /company\/talent-pool/);
});

test("12-13 i18n keys present for all locales", () => {
  for (const locale of LOCALES) {
    const pool = dictionaries[locale].companyTalentPool;
    assert.ok(pool.title.length > 0, `title ${locale}`);
    assert.ok(pool.summaryKnownCandidates.length > 0, `summary ${locale}`);
    assert.ok(dictionaries[locale].workspaceModules.companyTalentPoolTitle.length > 0, `module ${locale}`);
  }
});

test("14 launch stance unchanged in matrices", () => {
  const prodMatrix = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launchMatrix = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prodMatrix, /NO-GO/i);
  assert.match(launchMatrix, /NO-GO/i);
  assert.match(prodMatrix, /COMPANY_TALENT_POOL_VIEW_MVP_2026-06-15/);
});

test("15 backend service exists", () => {
  assert.match(
    readFileSync(join(root, "..", "backend/app/services/company_talent_pool.py"), "utf8"),
    /build_company_talent_pool/,
  );
  assert.match(readFileSync(join(root, "..", "backend/app/api/company.py"), "utf8"), /\/talent-pool/);
});

test("16 PL dashboard card title", () => {
  assert.match(dictionaries.pl.workspaceModules.companyTalentPoolTitle, /Pamięć talentów/);
  assert.match(dictionaries.pl.workspaceModules.companyTalentPoolCta, /Otwórz talent pool/i);
});
