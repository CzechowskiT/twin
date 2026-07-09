/**
 * Seven-day D4 company slice — hub next action, integrations roadmap, pilot boundaries.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { COMPANY_INTEGRATION_ROWS } from "../src/lib/company-integrations-readiness";
import {
  COLLAPSE_COMPANY_DEMO_JOURNEYS,
  COMPANY_HUB_NEXT_ACTION_HREF,
  COMPANY_INTEGRATIONS_ROADMAP_STATUS,
  COMPANY_PRIMARY_NAV_HREFS,
  COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT,
  DELEGATED_APPLY_NOT_LIVE_IN_COMPANY_UI,
  HIDE_COMPANY_BILLING_FROM_NAV,
  HIRING_COCKPIT_LIMITED_PILOT,
  INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC,
  SHOW_COMPANY_HUB_NEXT_ACTION,
  SHOW_COMPANY_HUB_PRIMARY_PROMOS,
  SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED,
  TALENT_POOL_LIMITED_PILOT,
} from "../src/lib/seven-day-d4-company";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D4_DOC = "docs/SEVEN_DAY_D4_COMPANY_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function moduleStatus(id: string) {
  const mod = COMPANY_WORKSPACE_MODULES.find((m) => m.id === id);
  assert.ok(mod, `missing module ${id}`);
  return mod!.status;
}

function companyUiBlob(): string {
  return [
    read("src/app/company/dashboard/company-dashboard-client.tsx"),
    read("src/app/company/roles/page.tsx"),
    read("src/app/company/pipeline/company-pipeline-client.tsx"),
    read("src/app/company/integrations/company-integrations-client.tsx"),
    read("src/app/company/billing/company-billing-client.tsx"),
    read("src/app/company/talent-pool/company-talent-pool-client.tsx"),
    read("src/components/company/company-workspace-nav.tsx"),
  ].join("\n");
}

test("1 D4 execution doc exists with stance footer", () => {
  const doc = readRepo(D4_DOC);
  assert.match(doc, /Seven-day D4/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 seven-day-d4 flags — hub next action, integrations roadmap, collapsed nav", () => {
  assert.equal(SHOW_COMPANY_HUB_PRIMARY_PROMOS, false);
  assert.equal(SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED, false);
  assert.equal(SHOW_COMPANY_HUB_NEXT_ACTION, true);
  assert.equal(COMPANY_HUB_NEXT_ACTION_HREF, "/company/roles");
  assert.equal(COMPANY_INTEGRATIONS_ROADMAP_STATUS, "coming_soon");
  assert.equal(HIDE_COMPANY_BILLING_FROM_NAV, true);
  assert.equal(COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT, true);
  assert.equal(COLLAPSE_COMPANY_DEMO_JOURNEYS, true);
  assert.equal(TALENT_POOL_LIMITED_PILOT, true);
  assert.equal(HIRING_COCKPIT_LIMITED_PILOT, true);
  assert.equal(INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC, true);
  assert.equal(DELEGATED_APPLY_NOT_LIVE_IN_COMPANY_UI, true);
  assert.equal(COMPANY_PRIMARY_NAV_HREFS.length, 3);
});

test("3 workspace modules — integrations coming soon, billing not live, core live", () => {
  assert.equal(moduleStatus("roles"), "live");
  assert.equal(moduleStatus("pipeline"), "live");
  assert.equal(moduleStatus("integrations"), "coming_soon");
  assert.equal(moduleStatus("billing"), "not_live");
  assert.equal(moduleStatus("hiring_cockpit"), "pilot");
  assert.equal(moduleStatus("team"), "pilot");
});

test("4 product surface — green-only roles/pipeline primary; non-green hidden", () => {
  const split = splitWorkspaceModules("company", COMPANY_WORKSPACE_MODULES);
  assert.ok(split.primary.some((m) => m.id === "roles"));
  assert.ok(split.primary.some((m) => m.id === "pipeline"));
  assert.equal(split.roadmap.length, 0);
  assert.ok(split.hidden.some((m) => m.id === "integrations"));
  assert.ok(split.hidden.some((m) => m.id === "hiring_cockpit"));
  assert.ok(split.hidden.some((m) => m.id === "billing"));
  assert.equal(shouldHideFromDefaultHub("company", "billing"), true);
  assert.equal(classifyProductSurfaceTier("company", "integrations", "coming_soon"), "INTERNAL");
});

test("5 company workspace nav — primary three, billing hidden, collapsed extended", () => {
  const nav = read("src/components/company/company-workspace-nav.tsx");
  assert.match(nav, /COMPANY_PRIMARY_NAV_HREFS/);
  assert.match(nav, /COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT/);
  assert.match(nav, /HIDE_COMPANY_BILLING_FROM_NAV/);
  assert.match(nav, /data-company-nav-primary/);
  assert.match(nav, /data-company-nav-extended-toggle/);
  const primaryBlock = nav.split("const EXTENDED_TABS")[0] ?? nav;
  assert.doesNotMatch(primaryBlock, /\/company\/billing/);
  assert.doesNotMatch(primaryBlock, /\/company\/hiring-cockpit/);
});

test("6 company dashboard — next action, roadmap promos collapsed, primary promos off", () => {
  const dashboard = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.equal(SHOW_COMPANY_HUB_PRIMARY_PROMOS, false);
  assert.match(dashboard, /CompanyHubNextAction/);
  assert.match(dashboard, /SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED/);
  assert.match(dashboard, /data-company-hub-roadmap-promos/);
  assert.match(dashboard, /data-seven-day-company-roadmap-promos-collapsed/);
  assert.match(dashboard, /company-hub-next-action/);
});

test("7 integrations — coming soon roadmap, honest ATS and calendar rows", () => {
  const client = read("src/app/company/integrations/company-integrations-client.tsx");
  assert.match(client, /COMPANY_INTEGRATIONS_ROADMAP_STATUS/);
  assert.match(client, /data-seven-day-company-integrations-roadmap-boundary/);
  assert.match(en.companyIntegrations.roadmapBoundary ?? "", /Coming soon/i);
  assert.match(en.companyIntegrations.roadmapBoundary ?? "", /No live ATS sync|does not sync/i);
  const ats = COMPANY_INTEGRATION_ROWS.find((r) => r.id === "ats_webhooks");
  assert.equal(ats?.status, "planned");
  const calendar = COMPANY_INTEGRATION_ROWS.find((r) => r.id === "employer_calendar");
  assert.equal(calendar?.status, "not_live");
  const csv = COMPANY_INTEGRATION_ROWS.find((r) => r.id === "talent_pool_import");
  assert.equal(csv?.status, "pilot");
});

test("8 billing — premium preview only, not checkout", () => {
  const billing = read("src/app/company/billing/company-billing-client.tsx");
  assert.match(billing, /BILLING_PREMIUM_PREVIEW_ONLY/);
  assert.match(billing, /PremiumPreviewSurface/);
  assert.doesNotMatch(billing, /checkout/i);
  assert.match(en.productPolish.premiumPreviewCompanyLead ?? "", /not live|preview-only/i);
});

test("9 roles and pipeline — demo journeys collapsed, human decision copy", () => {
  const roles = read("src/app/company/roles/page.tsx");
  assert.match(roles, /COLLAPSE_COMPANY_DEMO_JOURNEYS/);
  assert.match(roles, /data-seven-day-company-demo-journeys-collapsed/);
  assert.doesNotMatch(roles, /DemoJourneyPilotStatus/);
  assert.match(en.companyJobs.demoJourneysBoundary ?? "", /human decision required/i);

  const pipeline = read("src/app/company/pipeline/company-pipeline-client.tsx");
  assert.match(pipeline, /companyPipeline\.humanDecisionNote/);
  assert.match(en.companyPipeline.humanDecisionNote ?? "", /Human decision required/i);
  assert.match(en.companyPipeline.humanDecisionNote ?? "", /No delegated apply/i);
});

test("10 talent pool — limited pilot boundary", () => {
  const pool = read("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(pool, /data-seven-day-company-talent-pool-pilot-boundary/);
  assert.match(en.companyTalentPool.pilotBoundaryBody ?? "", /No live ATS sync/i);
  assert.match(dictionaries.pl.companyTalentPool.pilotBoundaryBody ?? "", /Bez live sync ATS/i);
});

test("11 delegated apply not live in company UI", () => {
  const blob = companyUiBlob();
  assert.doesNotMatch(blob, /\bdelegated apply is live\b/i);
  assert.match(en.companyPipeline.humanDecisionNote ?? "", /delegated apply/i);
  assert.match(en.companyJobs.demoJourneysBoundary ?? "", /delegated apply/i);
});

test("12 npm script test:seven-day-d4-company-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d4-company-guard":/);
  assert.match(pkg, /seven-day-d4-company-guard\.test\.ts/);
});
