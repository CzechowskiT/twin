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
  companyTalentPoolRadarHref,
  companyTalentPoolRadarHrefIsRoleAware,
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
      missing_location: 1,
      missing_seniority: 1,
      low_evidence: 1,
      missing_consent: 1,
      stale_records: 0,
      duplicates: 0,
    },
  },
  role_skill_coverage: {
    top_roles: [{ title: "Backend Engineer", count: 2 }],
    top_skills: [{ skill: "Python", count: 1 }],
    weak_coverage: [
      {
        role_title: "Product Manager",
        candidate_count: 1,
        gap_count: 1,
        coverage_warning: "Few pool candidates",
        job_id: 42,
        suggested_action: "ask_recruiter_review",
      },
    ],
    suggested_actions: [
      { code: "ask_recruiter_review", label: "Ask recruiter to review", href: "/recruiter/talent-pool" },
    ],
  },
  readiness: {
    counts: {
      ready: 1,
      needs_enrichment: 1,
      duplicate_review: 0,
      consent_required: 1,
      stale: 0,
    },
    candidates: [
      {
        id: 1,
        display_name: "Alex Kowalski",
        job_title: "Backend Engineer",
        readiness_state: "ready",
        radar_href: "/recruiter/talent-radar?role_id=42",
      },
    ],
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
    talent_radar: "/recruiter/talent-radar",
  },
  scope_note: "Internal only",
};

test("1 route and BFF exist", () => {
  assert.equal(COMPANY_TALENT_POOL_ROUTE, "/company/talent-pool");
  assert.match(readSrc("src/app/company/talent-pool/page.tsx"), /CompanyTalentPoolClient/);
  assert.match(readSrc("src/app/api/company/talent-pool/route.ts"), /talent-pool/);
});

test("2 dashboard module pilot card", () => {
  const mod = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "talent_pool");
  assert.ok(mod);
  assert.equal(mod?.href, "/company/talent-pool");
  assert.equal(mod?.status, "pilot");
});

test("3 nav and cross-links wired", () => {
  assert.match(readSrc("src/components/company/company-workspace-nav.tsx"), /COMPANY_TALENT_POOL_ROUTE/);
  assert.match(readSrc("src/app/company/pipeline/company-pipeline-client.tsx"), /\/company\/talent-pool/);
  assert.match(readSrc("src/app/company/integrations/company-integrations-client.tsx"), /\/company\/talent-pool/);
});

test("4 role and skill coverage panel", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.roleSkillCoverage/);
  assert.match(client, /roleCoverageTitle/);
  assert.match(client, /skillCoverageTitle/);
  assert.match(client, /weakCoverageTitle/);
  assert.match(client, /role_skill_coverage\.top_roles/);
  assert.match(client, /role_skill_coverage\.top_skills/);
});

test("5 readiness states panel", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.readinessPanel/);
  assert.match(client, /readinessReady/);
  assert.match(client, /readinessNeedsEnrichment/);
  assert.match(client, /readinessDuplicateReview/);
  assert.match(client, /readinessConsentRequired/);
  assert.match(client, /readinessStale/);
});

test("6 expanded quality dimensions", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /qualityMissingLocation/);
  assert.match(client, /qualityMissingSeniority/);
  assert.match(client, /qualityLowEvidence/);
  assert.ok(samplePayload.data_quality.dimensions.missing_location === 1);
});

test("7 role-aware radar links", () => {
  assert.equal(companyTalentPoolRadarHref(42), "/recruiter/talent-radar?role_id=42");
  assert.equal(companyTalentPoolRadarHref(), "/recruiter/talent-radar");
  assert.equal(
    companyTalentPoolRadarHrefIsRoleAware(samplePayload.readiness.candidates[0].radar_href),
    true,
  );
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  const cta = readSrc("src/components/company/company-talent-pool-radar-cta.tsx");
  assert.match(client, /CompanyTalentPoolRadarCta/);
  assert.match(cta, /COMPANY_TALENT_POOL_MARKERS\.radarLink/);
});

test("8 ask recruiter to review i18n", () => {
  assert.match(en.companyTalentPool.askRecruiterReview.toLowerCase(), /ask recruiter to review/);
  assert.match(dictionaries.pl.companyTalentPool.askRecruiterReview.toLowerCase(), /poproś rekrutera/);
  assert.match(en.companyTalentPool.roleCoverageTitle.toLowerCase(), /role/);
  assert.match(en.companyTalentPool.skillCoverageTitle.toLowerCase(), /skill/);
});

test("9 no forbidden outreach or PII", () => {
  const blob = JSON.stringify(en.companyTalentPool);
  for (const pattern of COMPANY_TALENT_POOL_FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern);
  }
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.doesNotMatch(client, /\bemail\b/i);
  assert.equal(companyTalentPoolPayloadHasForbiddenPii(samplePayload), false);
});

test("10 workspace scoped payload guard", () => {
  assert.equal(isCompanyTalentPoolWorkspaceScoped(samplePayload), true);
  assert.equal(isCompanyTalentPoolWorkspaceScoped({ ...samplePayload, source: "external" }), false);
});

test("11 backend view service fields", () => {
  const service = readFileSync(join(root, "..", "backend/app/services/company_talent_pool.py"), "utf8");
  assert.match(service, /role_skill_coverage/);
  assert.match(service, /readiness/);
  assert.match(service, /missing_location/);
  assert.match(service, /low_evidence/);
});

test("12 backend view tests file", () => {
  const tests = readFileSync(join(root, "..", "backend/tests/test_company_talent_pool_view.py"), "utf8");
  assert.match(tests, /test_role_skill_coverage_top_roles_and_skills/);
  assert.match(tests, /test_readiness_states_and_counts/);
  assert.match(tests, /test_expanded_quality_dimensions/);
});

test("13 i18n keys for all locales", () => {
  for (const locale of LOCALES) {
    const pool = dictionaries[locale].companyTalentPool;
    assert.ok(pool.readinessTitle.length > 0, `readiness ${locale}`);
    assert.ok(pool.roleCoverageTitle.length > 0, `role coverage ${locale}`);
    assert.ok(pool.askRecruiterReview.length > 0, `ask recruiter ${locale}`);
  }
});

test("14 launch stance unchanged", () => {
  const doc = readFileSync(join(root, "..", "docs", "COMPANY_TALENT_POOL_VIEW_MVP_2026-06-15.md"), "utf8");
  assert.match(doc, /NO-GO/i);
  assert.match(doc, /role_skill_coverage|readiness/i);
});

test("15 design doc and matrices reference view", () => {
  const prodMatrix = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launchMatrix = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prodMatrix, /COMPANY_TALENT_POOL_VIEW_MVP_2026-06-15/);
  assert.match(launchMatrix, /NO-GO/i);
  assert.match(dictionaries.pl.workspaceModules.companyTalentPoolTitle, /Pamięć talentów/);
});
