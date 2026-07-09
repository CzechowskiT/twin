/**
 * Wave 2B Slice 3 — company dashboard core MAKE_GREEN static guard (2026-07-09).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  isWorkspaceGreenVisible,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_COMPANY_CORE_ALWAYS_IN_HUB,
  WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_SLICE3_MAKE_GREEN_MODULE_ID,
  WAVE2B_SLICE3_MAKE_GREEN_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { COMPANY_HIRING_ROUTE } from "../src/lib/company-hiring-dashboard";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import {
  COMPANY_DASHBOARD_SHIP_STATUS,
  COMPANY_PIPELINE_SHIP_STATUS,
  COMPANY_PRIMARY_NAV_HREFS,
  COMPANY_ROLES_SHIP_STATUS,
} from "../src/lib/seven-day-d4-company";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE2B_COMPANY_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE2B_COMPANY_DASHBOARD_2026-07-09.md";
const DEMO_LOGIN_DOC = "docs/DEMO_LOGIN_FOR_FOUNDER.md";

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave2b company dashboard doc exists with stance and selected module", () => {
  const doc = readRepo(WAVE2B_COMPANY_DOC);
  assert.match(doc, /Wave 2B/i);
  assert.match(doc, /WAVE2B_SLICE3_MAKE_GREEN_MODULE: company_dashboard/);
  assert.match(doc, /WAVE2B_SLICE3_BACK_IN_HUB: true/);
  assert.match(doc, /WAVE2B_SLICE3_M8_SMOKE: NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave2b slice3 gate exports — company core green, hidden count unchanged", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE2B_SLICE3_MAKE_GREEN_MODULE_ID, "company_dashboard");
  assert.deepEqual(WAVE2B_SLICE3_MAKE_GREEN_SOR_IDS, [
    "company_dashboard",
    "roles",
    "company_roles",
    "pipeline",
    "company_pipeline",
  ]);
  assert.equal(WAVE2B_COMPANY_CORE_ALWAYS_IN_HUB, true);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.equal(WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes("company_dashboard"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes("roles"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes("company_roles"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes("pipeline"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.company.includes("company_pipeline"));
});

test("3 seven-day-d4 — company core live, visible in hub and primary nav", () => {
  assert.equal(COMPANY_DASHBOARD_SHIP_STATUS, "live");
  assert.equal(COMPANY_ROLES_SHIP_STATUS, "live");
  assert.equal(COMPANY_PIPELINE_SHIP_STATUS, "live");
  assert.equal(shouldHideFromDefaultHub("company", "roles"), false);
  assert.equal(shouldHideFromDefaultHub("company", "pipeline"), false);
  assert.equal(classifyProductSurfaceTier("company", "roles"), "LIVE");
  assert.equal(classifyProductSurfaceTier("company", "pipeline"), "LIVE");
  assert.ok((COMPANY_PRIMARY_NAV_HREFS as readonly string[]).includes("/company/dashboard"));
  assert.ok((COMPANY_PRIMARY_NAV_HREFS as readonly string[]).includes("/company/roles"));
  assert.ok((COMPANY_PRIMARY_NAV_HREFS as readonly string[]).includes("/company/pipeline"));
});

test("4 company workspace — roles/pipeline primary live, non-green hidden", () => {
  const split = splitWorkspaceModules("company", COMPANY_WORKSPACE_MODULES);
  const roles = split.primary.find((m) => m.id === "roles");
  const pipeline = split.primary.find((m) => m.id === "pipeline");
  assert.ok(roles);
  assert.ok(pipeline);
  assert.equal(roles?.status, "live");
  assert.equal(pipeline?.status, "live");
  assert.equal(split.primary.filter((m) => m.status === "live").length, 2);
  assert.equal(split.roadmap.length, 0);
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(split.hidden.some((m) => m.id === "billing"));
  assert.ok(split.hidden.some((m) => m.id === "integrations"));
  assert.ok(split.hidden.some((m) => m.id === "talent_pool"));
  assert.ok(split.hidden.some((m) => m.id === "hiring_cockpit"));
  assert.ok(split.hidden.some((m) => m.id === "team"));
});

test("5 company pages — token gate, API proxy, human decision UX", () => {
  const dashboard = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(dashboard, /COMPANY_DASHBOARD_SHIP_STATUS/);
  assert.match(dashboard, /data-wave2b-company-dashboard-green/);
  assert.match(dashboard, /RecruiterAccessFields/);
  assert.match(dashboard, /\/api\/company\/dashboard/);
  assert.match(dashboard, /companyHiring\.boundaryNote/);
  assert.doesNotMatch(dashboard, /auto outreach/i);
  assert.doesNotMatch(dashboard, /live ATS/i);

  const roles = read("src/app/company/roles/page.tsx");
  assert.match(roles, /COMPANY_ROLES_SHIP_STATUS/);
  assert.match(roles, /data-wave2b-company-roles-green/);
  assert.match(roles, /\/api\/company\/roles/);
  assert.match(roles, /companyJobs\.boundaryNote/);

  const pipeline = read("src/app/company/pipeline/company-pipeline-client.tsx");
  assert.match(pipeline, /COMPANY_PIPELINE_SHIP_STATUS/);
  assert.match(pipeline, /data-wave2b-company-pipeline-green/);
  assert.match(pipeline, /\/api\/company\/pipeline/);
  assert.match(pipeline, /companyPipeline\.humanDecisionNote/);
});

test("6 SoR company core routes — live, human decision, no ATS sync", () => {
  const routes = getSystemOfRecordRoutesForPersona("company");
  const dashboard = routes.find((r) => r.id === "company_dashboard");
  const roles = routes.find((r) => r.id === "company_roles");
  const pipeline = routes.find((r) => r.id === "company_pipeline");
  assert.ok(dashboard);
  assert.ok(roles);
  assert.ok(pipeline);
  assert.equal(dashboard?.status, "live");
  assert.equal(roles?.status, "live");
  assert.equal(pipeline?.status, "live");
  assert.equal(dashboard?.href, COMPANY_HIRING_ROUTE);
  assert.equal(roles?.href, "/company/roles");
  assert.equal(pipeline?.href, "/company/pipeline");
  assert.ok(dashboard?.boundaryTags.includes("human_decision_required"));
  assert.ok(dashboard?.boundaryTags.includes("no_ats_sync"));
  assert.ok(roles?.boundaryTags.includes("human_decision_required"));
  assert.ok(pipeline?.boundaryTags.includes("human_decision_required"));
  assert.ok(pipeline?.boundaryTags.includes("no_ats_sync"));
});

test("7 honest copy — human decision, no ATS or auto outreach in strings", () => {
  const hubLead = en.workspaceModules.companyHubLead ?? "";
  const rolesValue = en.workspaceModules.companyRolesValue ?? "";
  const pipelineValue = en.workspaceModules.companyPipelineValue ?? "";
  const dashboardValue = en.systemOfRecord.companyDashboardValue ?? "";
  const hiringBoundary = en.companyHiring.boundaryNote ?? "";
  const rolesBoundary = en.companyJobs.boundaryNote ?? "";
  const pipelineNote = en.companyPipeline.humanDecisionNote ?? "";
  assert.match(hubLead, /human decision/i);
  assert.match(hubLead, /hidden/i);
  assert.match(rolesValue, /human decision/i);
  assert.match(rolesValue, /no delegated apply/i);
  assert.match(rolesValue, /no auto outreach/i);
  assert.match(pipelineValue, /human decision/i);
  assert.match(pipelineValue, /no live ATS/i);
  assert.match(dashboardValue, /human decision/i);
  assert.match(hiringBoundary, /Human decision required/i);
  assert.match(hiringBoundary, /No delegated apply live/i);
  assert.match(rolesBoundary, /Human decision required/i);
  assert.match(pipelineNote, /No delegated apply/i);

  const plValue = dictionaries.pl.workspaceModules.companyRolesValue ?? "";
  assert.match(plValue, /decyzja człowieka/i);
});

test("8 M8 smoke honesty — no company recruiter token in founder demo doc", () => {
  const demoDoc = readRepo(DEMO_LOGIN_DOC);
  assert.match(demoDoc, /demo@twin\.career/);
  assert.doesNotMatch(demoDoc, /recruiter.*token/i);
  const waveDoc = readRepo(WAVE2B_COMPANY_DOC);
  assert.match(waveDoc, /NEEDS_FOUNDER_AUTH_SMOKE/);
});

test("9 primary limits — company ceiling 3, core green visible", () => {
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.company, 3);
  assert.ok(isWorkspaceGreenVisible("company", "company_dashboard"));
  assert.ok(isWorkspaceGreenVisible("company", "roles"));
  assert.ok(isWorkspaceGreenVisible("company", "pipeline"));
  assert.ok(!isWorkspaceGreenVisible("company", "billing"));
  assert.ok(!isWorkspaceGreenVisible("company", "talent_pool"));

  const dashboard = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(dashboard, /SystemOfRecordNavigationHub/);
  assert.match(dashboard, /persona="company"/);
});

test("10 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE2B_COMPANY_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("11 npm script test:all-workspace-modules-green-wave2b-company-dashboard-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave2b-company-dashboard-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave2b-company-dashboard-guard\.test\.ts/);
});
