import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_TALENT_POOL_FORBIDDEN_COPY,
  COMPANY_TALENT_POOL_MARKERS,
  companyTalentPoolRadarHrefIsRoleAware,
  type CompanyTalentPoolPayload,
} from "../src/lib/company-talent-pool";
import { resolveCompanyTalentPoolNextBestAction } from "../src/lib/company-talent-pool-next-best-action";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const basePayload: CompanyTalentPoolPayload = {
  company_slug: "nova-hiring-pl",
  source: "workspace",
  generated_at: "2026-06-15T12:00:00Z",
  executive_summary: {
    known_candidates: 5,
    imported_candidates: 5,
    radar_ready: 2,
    data_gaps: 1,
    potential_duplicates: 0,
    active_sources: 2,
    planned_sources: 1,
  },
  summary: {
    total_records: 5,
    shown: 5,
    quality_high: 3,
    quality_medium: 2,
    quality_low: 0,
    import_batches: 1,
    last_import_at: "2026-06-15T10:00:00",
    last_import_status: "committed",
  },
  data_quality: {
    levels: { high: 3, medium: 2 },
    top_warnings: [],
    dimensions: {
      missing_role_title: 0,
      missing_skills: 0,
      missing_location: 0,
      missing_seniority: 0,
      low_evidence: 0,
      missing_consent: 0,
      stale_records: 0,
      duplicates: 0,
    },
  },
  role_skill_coverage: {
    top_roles: [],
    top_skills: [],
    weak_coverage: [],
    suggested_actions: [],
  },
  readiness: {
    counts: { ready: 2, needs_enrichment: 1, duplicate_review: 0, consent_required: 0, stale: 0 },
    candidates: [],
  },
  source_coverage: {
    imported_internal_pool: 5,
    import_sources: { csv_paste: 1 },
    external_sourcing: false,
    live_ats_sync: false,
    applications: 0,
    inbox: 0,
    scorecards: 0,
    notes: 0,
    import_pool: 5,
    ats_connectors_planned: true,
  },
  items: [{ id: 1, display_name: "Alex K.", job_title: "Engineer", skills: ["Go"], source: "imported_internal_pool" }],
  links: {
    recruiter_import: "/recruiter/talent-pool/import",
    integrations: "/company/integrations",
    pipeline: "/company/pipeline",
    recruiter_pool: "/recruiter/talent-pool",
    talent_radar: "/recruiter/talent-radar",
  },
  scope_note: "Internal only",
};

test("1 premium workspace selector component wired", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  const selector = readSrc("src/components/company/company-talent-pool-workspace-selector.tsx");
  assert.match(client, /CompanyTalentPoolWorkspaceSelector/);
  assert.match(selector, /COMPANY_TALENT_POOL_MARKERS\.workspaceSelector/);
  assert.match(selector, /previewSettingsToggle/);
  assert.doesNotMatch(client, /RecruiterAccessFields/);
});

test("2 workspace selector i18n PL labels from spec", () => {
  const pl = dictionaries.pl.companyTalentPool;
  assert.match(pl.workspaceSelectorEyebrow, /Workspace firmy/i);
  assert.match(pl.workspaceCompanyLabel, /Firma/i);
  assert.match(pl.workspacePilotCodeLabel, /Kod dostępu pilota/i);
  assert.match(pl.workspaceLoadCta, /Załaduj workspace/i);
  assert.match(pl.previewSettingsToggle, /Ustawienia podglądu/i);
});

test("3 readiness explanation panel", () => {
  const guide = readSrc("src/components/company/company-talent-pool-readiness-guide.tsx");
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(guide, /readinessGuideTitle/);
  assert.match(guide, /readinessGuideReadyBody/);
  assert.match(guide, /readinessGuideDuplicateReviewBody/);
  assert.match(guide, /readinessActionEnrichImport/);
  assert.match(client, /CompanyTalentPoolReadinessGuide/);
  assert.match(en.companyTalentPool.readinessGuideTitle.toLowerCase(), /readiness/);
});

test("4 role-aware radar CTA — no confusing open role copy", () => {
  const cta = readSrc("src/components/company/company-talent-pool-radar-cta.tsx");
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(cta, /openRecruiterRadar/);
  assert.match(cta, /openRecruiterRadarHint/);
  assert.match(cta, /askRecruiterReview/);
  assert.doesNotMatch(client, /openRoleRadar/);
  assert.match(dictionaries.pl.companyTalentPool.openRecruiterRadar, /Radarze rekrutera/);
});

test("5 radar href role-aware guard", () => {
  assert.equal(companyTalentPoolRadarHrefIsRoleAware("/recruiter/talent-radar?role_id=42"), true);
  assert.equal(companyTalentPoolRadarHrefIsRoleAware("/recruiter/talent-radar"), false);
});

test("6 next best action panel markers", () => {
  const panel = readSrc("src/components/company/company-talent-pool-next-action.tsx");
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(panel, /COMPANY_TALENT_POOL_MARKERS\.nextBestAction/);
  assert.match(panel, /nbaTitle/);
  assert.match(client, /resolveCompanyTalentPoolNextBestAction/);
});

test("7 NBA empty pool → import", () => {
  const empty = resolveCompanyTalentPoolNextBestAction({
    ...basePayload,
    executive_summary: { ...basePayload.executive_summary, known_candidates: 0 },
    items: [],
  });
  assert.equal(empty.code, "import");
  assert.equal(empty.href, "/recruiter/talent-pool/import");
});

test("8 NBA duplicates → review", () => {
  const dup = resolveCompanyTalentPoolNextBestAction({
    ...basePayload,
    executive_summary: { ...basePayload.executive_summary, potential_duplicates: 2 },
  });
  assert.equal(dup.code, "review_duplicates");
});

test("9 NBA missing skills → enrich", () => {
  const enrich = resolveCompanyTalentPoolNextBestAction({
    ...basePayload,
    data_quality: {
      ...basePayload.data_quality,
      dimensions: { ...basePayload.data_quality.dimensions, missing_skills: 3 },
    },
  });
  assert.equal(enrich.code, "enrich");
});

test("10 NBA radar ready → ask recruiter", () => {
  const ask = resolveCompanyTalentPoolNextBestAction({
    ...basePayload,
    executive_summary: { ...basePayload.executive_summary, radar_ready: 3 },
  });
  assert.equal(ask.code, "ask_recruiter");
});

test("11 NBA healthy → open radar", () => {
  const healthy = resolveCompanyTalentPoolNextBestAction({
    ...basePayload,
    executive_summary: { ...basePayload.executive_summary, radar_ready: 0 },
  });
  assert.equal(healthy.code, "open_radar");
  assert.match(healthy.href, /talent-radar/);
});

test("12 trust copy visible panel", () => {
  const client = readSrc("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_MARKERS\.trustPanel/);
  assert.match(dictionaries.pl.companyTalentPool.trustCopy, /nie kontaktuje kandydatów/i);
  assert.match(en.companyTalentPool.trustCopy.toLowerCase(), /does not contact candidates/);
});

test("13 no forbidden outreach copy in new strings", () => {
  const blob = JSON.stringify(en.companyTalentPool);
  for (const pattern of COMPANY_TALENT_POOL_FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern);
  }
});

test("14 executive UX i18n keys all locales", () => {
  for (const locale of LOCALES) {
    const pool = dictionaries[locale].companyTalentPool;
    assert.ok(pool.nbaTitle.length > 0, `nba ${locale}`);
    assert.ok(pool.readinessGuideTitle.length > 0, `guide ${locale}`);
    assert.ok(pool.workspaceLoadCta.length > 0, `workspace ${locale}`);
    assert.ok(pool.openRecruiterRadar.length > 0, `radar ${locale}`);
  }
});

test("15 docs reference executive UX polish", () => {
  const doc = readFileSync(join(root, "..", "docs", "COMPANY_TALENT_POOL_VIEW_MVP_2026-06-15.md"), "utf8");
  const runbook = readFileSync(
    join(root, "..", "docs", "FOUNDER_AUTHENTICATED_PERSONA_SMOKE_RUNBOOK_2026-06-12.md"),
    "utf8",
  );
  assert.match(doc, /executive UX|workspace selector|next best action/i);
  assert.match(runbook, /talent-pool/);
  assert.match(doc, /test:company-talent-pool-executive-ux/);
});
