/**
 * Wave 3 Slice 2 — recruiter + company integrations MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE guard (2026-07-09).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  GREEN_WORKSPACE_ALLOWED_IDS,
  isWorkspaceGreenVisible,
  RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_SLICE2_COMPANY_INTEGRATIONS_MODULE_ID,
  WAVE3_SLICE2_COMPANY_INTEGRATIONS_SOR_IDS,
  WAVE3_SLICE2_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE3_SLICE2_MOVE_TO_ROADMAP_ACTION,
  WAVE3_SLICE2_RECRUITER_INTEGRATIONS_MODULE_ID,
  WAVE3_SLICE2_RECRUITER_INTEGRATIONS_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
} from "../src/lib/all-workspace-green-gate";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import {
  COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  COMPANY_INTEGRATIONS_ROADMAP_STATUS,
  COMPANY_PRIMARY_NAV_HREFS,
  HIDE_COMPANY_INTEGRATIONS_FROM_HUB,
  HIDE_COMPANY_INTEGRATIONS_FROM_NAV,
} from "../src/lib/seven-day-d4-company";
import {
  HIDE_RECRUITER_INTEGRATIONS_FROM_HUB,
  HIDE_RECRUITER_INTEGRATIONS_FROM_NAV,
  RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  RECRUITER_INTEGRATIONS_ROADMAP_STATUS,
  RECRUITER_PRIMARY_NAV_HREFS,
} from "../src/lib/seven-day-d3-recruiter";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { COMPANY_ENTRY_PREVIEW_CARDS } from "../src/lib/company-entry-navigation";
import { COMPANY_INTEGRATIONS_ROUTE } from "../src/lib/company-integrations-readiness";
import { getSystemOfRecordRoutesForPersona, SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE3_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE3_INTEGRATIONS_2026-07-09.md";
const PR_441_MERGE_SHA = "07046c6d4764b90d45c58a5e4f8d1233977d2363";

const RECRUITER_GREEN_HUB_IDS = ["inbox", "pipeline", "jobs", "search", "analytics"] as const;
const COMPANY_GREEN_HUB_IDS = ["roles", "pipeline"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave3 integrations doc exists with stance and PR #441 merge SHA", () => {
  const doc = readRepo(WAVE3_DOC);
  assert.match(doc, /Wave 3/i);
  assert.match(doc, new RegExp(PR_441_MERGE_SHA));
  assert.match(doc, /MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE/);
  assert.match(doc, /WAVE3_SLICE2_MOVE_TO_ROADMAP_MODULES: recruiter_integrations, company_integrations/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave3 slice2 gate exports — historical constants + green-only superseded", () => {
  // Founder decision 2026-07-10 — green-only mode off; full activation surface visible.
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  assert.equal(WAVE3_SLICE2_RECRUITER_INTEGRATIONS_MODULE_ID, "integrations");
  assert.equal(WAVE3_SLICE2_COMPANY_INTEGRATIONS_MODULE_ID, "integrations");
  assert.equal(WAVE3_SLICE2_MOVE_TO_ROADMAP_ACTION, "MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE");
  assert.equal(RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#recruiter-integrations");
  assert.equal(COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF, "/investor/roadmap#company-integrations");
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE3_SLICE2_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("integrations"));
  assert.ok(!GREEN_WORKSPACE_ALLOWED_IDS.company.includes("integrations"));
  // With green-only off, visibility helper allows non-green modules (honest COMING_SOON badges).
  assert.equal(isWorkspaceGreenVisible("recruiter", "integrations"), true);
  assert.equal(isWorkspaceGreenVisible("company", "integrations"), true);
  assert.ok(WAVE3_SLICE2_RECRUITER_INTEGRATIONS_SOR_IDS.includes("recruiter_integrations"));
  assert.ok(WAVE3_SLICE2_COMPANY_INTEGRATIONS_SOR_IDS.includes("company_integrations"));
});

test("3 seven-day flags — integrations restored to workspace hub/nav (Wave 1 supersedes hide)", () => {
  assert.equal(RECRUITER_INTEGRATIONS_ROADMAP_STATUS, "coming_soon");
  assert.equal(COMPANY_INTEGRATIONS_ROADMAP_STATUS, "coming_soon");
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_HUB, false);
  assert.equal(HIDE_COMPANY_INTEGRATIONS_FROM_HUB, false);
  assert.equal(RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  assert.equal(COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_NAV, false);
  assert.equal(HIDE_COMPANY_INTEGRATIONS_FROM_NAV, false);
  assert.equal(shouldHideFromDefaultHub("recruiter", "integrations"), false);
  assert.equal(shouldHideFromDefaultHub("company", "integrations"), false);
  assert.equal(classifyProductSurfaceTier("recruiter", "integrations", "coming_soon"), "COMING_SOON");
  assert.equal(classifyProductSurfaceTier("company", "integrations", "coming_soon"), "COMING_SOON");
});

test("4 recruiter workspace — live primary + integrations in roadmap", () => {
  const split = splitWorkspaceModules("recruiter", RECRUITER_WORKSPACE_MODULES);
  assert.ok(split.roadmap.length >= 1);
  assert.ok(split.primary.every((m) => m.status === "live" || m.status === "pilot"));
  assert.ok(split.roadmap.some((m) => m.id === "integrations"));
  assert.ok(!split.hidden.some((m) => m.id === "integrations"));
  for (const id of RECRUITER_GREEN_HUB_IDS) {
    assert.ok(
      split.primary.some((m) => m.id === id) || split.roadmap.some((m) => m.id === id),
      `missing green hub card ${id}`,
    );
  }
});

test("5 company workspace — live primary + integrations in roadmap", () => {
  const split = splitWorkspaceModules("company", COMPANY_WORKSPACE_MODULES);
  assert.ok(split.roadmap.length >= 1);
  assert.ok(split.roadmap.some((m) => m.id === "integrations"));
  assert.ok(!split.hidden.some((m) => m.id === "integrations"));
  for (const id of COMPANY_GREEN_HUB_IDS) {
    assert.ok(
      split.primary.some((m) => m.id === id) || split.roadmap.some((m) => m.id === id),
      `missing green hub card ${id}`,
    );
  }
});

test("6 workspace nav — integrations present in extended nav", () => {
  const recruiterNav = read("src/components/recruiter/recruiter-workspace-nav.tsx");
  assert.match(recruiterNav, /HIDE_RECRUITER_INTEGRATIONS_FROM_NAV/);
  const recruiterExtended = recruiterNav.split("const EXTENDED_TABS")[1]?.split("function isPrimaryHref")[0] ?? "";
  assert.match(recruiterExtended, /\/recruiter\/integrations/);
  const companyNav = read("src/components/company/company-workspace-nav.tsx");
  assert.match(companyNav, /HIDE_COMPANY_INTEGRATIONS_FROM_NAV/);
  const companyExtended = companyNav.split("const EXTENDED_TABS")[1]?.split("function isPrimaryHref")[0] ?? "";
  assert.match(companyExtended, /COMPANY_INTEGRATIONS_ROUTE|\/company\/integrations/);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 5);
  assert.equal(COMPANY_PRIMARY_NAV_HREFS.length, 3);
});

test("7 recruiter hub — quick actions include analytics; integrations deep-link preserved", () => {
  const page = read("src/app/recruiter/page.tsx");
  assert.match(page, /\/recruiter\/analytics/);
});

test("8 deep link pages — roadmap badge, honest copy, roadmap link", () => {
  const recruiter = read("src/app/recruiter/integrations/recruiter-integrations-client.tsx");
  assert.match(recruiter, /RECRUITER_INTEGRATIONS_ROADMAP_STATUS/);
  assert.match(recruiter, /data-wave3-recruiter-integrations-roadmap/);
  assert.match(recruiter, /RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF/);
  assert.match(recruiter, /data-wave3-integrations-outside-workspace/);
  assert.match(en.recruiterIntegrations.outsideWorkspaceNote ?? "", /product roadmap/i);
  assert.match(en.recruiterIntegrations.outsideWorkspaceNote ?? "", /No live ATS or calendar sync/i);
  assert.match(en.recruiterIntegrations.roadmapBoundary ?? "", /does not sync/i);

  const company = read("src/app/company/integrations/company-integrations-client.tsx");
  assert.match(company, /COMPANY_INTEGRATIONS_ROADMAP_STATUS/);
  assert.match(company, /data-wave3-company-integrations-roadmap/);
  assert.match(company, /COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF/);
  assert.match(company, /data-wave3-integrations-outside-workspace/);
  assert.match(en.companyIntegrations.outsideWorkspaceNote ?? "", /product roadmap/i);
  assert.doesNotMatch(company, /Connected/i);
});

test("9 investor roadmap — recruiter and company integrations sections", () => {
  const panel = read("src/components/investor/investor-roadmap-founder-updates-panel.tsx");
  assert.match(panel, /id="recruiter-integrations"/);
  assert.match(panel, /id="company-integrations"/);
  assert.match(panel, /data-wave3-recruiter-integrations-roadmap/);
  assert.match(panel, /data-wave3-company-integrations-roadmap/);
  assert.match(en.investorRoadmap.recruiterIntegrationsRoadmapLead ?? "", /product roadmap/i);
  assert.match(en.investorRoadmap.recruiterIntegrationsRoadmapBody ?? "", /No live ATS or calendar sync/i);
  assert.match(en.investorRoadmap.recruiterIntegrationsRoadmapBody ?? "", /readiness previews only/i);
  assert.match(en.investorRoadmap.companyIntegrationsRoadmapLead ?? "", /product roadmap/i);
  const founderRoadmap = read("src/lib/investor-founder-roadmap.ts");
  assert.match(founderRoadmap, /nextRecruiterIntegrations/);
  assert.match(founderRoadmap, /nextCompanyIntegrations/);
});

test("10 marketing — company entry integrations deep-link to workspace; honest no-live-sync copy", () => {
  const integrationsCard = COMPANY_ENTRY_PREVIEW_CARDS.find((c) => c.id === "integrations");
  assert.equal(integrationsCard?.href, COMPANY_INTEGRATIONS_ROUTE);
  assert.match(en.companyEntry.previewIntegrationsDesc ?? "", /roadmap|No live sync|no live sync/i);
  const marketing = read("src/components/marketing/persona-marketing-page.tsx");
  assert.match(marketing, /data-wave3-integrations-marketing-roadmap/);
  assert.match(marketing, /RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF/);
  assert.match(marketing, /COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF/);
  const personaPages = read("src/lib/persona-pages.ts");
  assert.match(personaPages, /#recruiter-integrations/);
  assert.match(personaPages, /#company-integrations/);
});

test("11 routes and SoR preserved — integration routes still registered", () => {
  const recruiterRoutes = getSystemOfRecordRoutesForPersona("recruiter");
  const recruiterIds = recruiterRoutes.map((r) => r.id);
  assert.ok(recruiterIds.includes("recruiter_integrations"));
  assert.ok(recruiterIds.includes("recruiter_ats_import_readiness"));
  const companyRoutes = getSystemOfRecordRoutesForPersona("company");
  const companyIds = companyRoutes.map((r) => r.id);
  assert.ok(companyIds.includes("company_integrations"));
  assert.ok(companyIds.includes("company_ats_import_readiness"));
  const recruiterSor = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_integrations");
  assert.equal(recruiterSor?.href, "/recruiter/integrations");
  const companySor = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_integrations");
  assert.equal(companySor?.href, "/company/integrations");
});

test("12 SoR hub split — integrations in roadmap (not internal)", () => {
  const recruiterSplit = splitProductSurfaceRoutes("recruiter", getSystemOfRecordRoutesForPersona("recruiter"));
  assert.ok(recruiterSplit.roadmap.length >= 1);
  assert.ok(
    recruiterSplit.roadmap.some((r) => r.id === "recruiter_integrations") ||
      recruiterSplit.primary.some((r) => r.id === "recruiter_integrations"),
  );
  assert.ok(!recruiterSplit.hidden.some((r) => r.id === "recruiter_integrations"));
  const companySplit = splitProductSurfaceRoutes("company", getSystemOfRecordRoutesForPersona("company"));
  assert.ok(companySplit.roadmap.length >= 1);
  assert.ok(
    companySplit.roadmap.some((r) => r.id === "company_integrations") ||
      companySplit.primary.some((r) => r.id === "company_integrations"),
  );
  assert.ok(!companySplit.hidden.some((r) => r.id === "company_integrations"));
});

test("13 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE3_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
  const plLead = dictionaries.pl.investorRoadmap.recruiterIntegrationsRoadmapLead ?? "";
  assert.match(plLead, /roadmapie produktu/i);
});

test("14 npm script test:all-workspace-modules-green-wave3-integrations-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave3-integrations-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave3-integrations-guard\.test\.ts/);
});
