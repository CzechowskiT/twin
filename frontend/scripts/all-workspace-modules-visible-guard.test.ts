/**
 * All-workspace modules visible guard — founder decision 2026-07-10.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ALL_WORKSPACE_MODULE_IDS,
  getActivationEntriesForWorkspace,
  getWorkspaceModuleActivationEntry,
  isWorkspaceModuleVisible,
  WORKSPACE_MODULE_ACTIVATION,
} from "../src/lib/all-workspace-modules-activation";
import { WORKSPACE_GREEN_ONLY_MODE } from "../src/lib/all-workspace-green-gate";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { INVESTOR_PUBLIC_PREVIEW_MODULES, INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import {
  splitActivationSurfaceRoutes,
  splitProductSurfaceRoutes,
} from "../src/lib/product-surface-visibility";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";
import {
  CAREER_COMPASS_BROWSER_SMOKE_STATUS,
  CAREER_COMPASS_SHIP_STATUS,
  HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB,
  TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d2-candidate";
import {
  HIDE_RECRUITER_INTEGRATIONS_FROM_HUB,
  RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d3-recruiter";
import {
  HIDE_COMPANY_INTEGRATIONS_FROM_HUB,
  COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "../src/lib/seven-day-d4-company";
import {
  HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB,
  HIDE_INVESTOR_DATA_ROOM_FROM_HUB,
  HIDE_INVESTOR_PLACEMENT_FROM_HUB,
  HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW,
} from "../src/lib/seven-day-d5-investor";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const FOUNDER_DOC = "docs/FOUNDER_ALL_MODULES_VISIBLE_AND_GREEN_DECISION_2026-07-10.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 green-only mode disabled — activation model supersedes", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  const src = read("src/lib/all-workspace-modules-activation.ts");
  assert.match(src, /isWorkspaceModuleVisible/);
  assert.match(src, /WORKSPACE_MODULE_ACTIVATION/);
});

test("2 founder and master plan docs exist with stance", () => {
  const founder = readRepo(FOUNDER_DOC);
  const plan = readRepo(MASTER_PLAN);
  assert.match(founder, /Launch NO-GO/);
  assert.match(founder, /Gate F.*PENDING/i);
  assert.match(founder, /P0.*CLOSED/i);
  assert.match(plan, /Wave A/);
  assert.match(plan, /Wave B/);
  assert.match(plan, /Career Compass/);
});

test("3 candidate trust center restored to visible hub", () => {
  assert.equal(HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB, false);
  assert.equal(TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  const split = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  const shown = [...split.primary, ...split.roadmap];
  assert.ok(shown.some((r) => r.id === "candidate_trust"));
  assert.ok(isWorkspaceModuleVisible("candidate_trust"));
});

test("4 recruiter integrations talent pool radar cockpit trust review visible; demos hub-hidden", () => {
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_HUB, false);
  assert.equal(RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  const split = splitActivationSurfaceRoutes("recruiter", getSystemOfRecordRoutesForPersona("recruiter"));
  const shown = [...split.core, ...split.extended, ...split.pilotPreview, ...split.comingSoonPaused];
  for (const id of [
    "recruiter_integrations",
    "recruiter_talent_pool",
    "recruiter_talent_radar",
    "recruiter_daily_cockpit",
    "recruiter_trust_review_queue",
  ]) {
    assert.ok(shown.some((r) => r.id === id), id);
  }
  assert.ok(!isWorkspaceModuleVisible("recruiter_demo_collaboration"));
  assert.ok(split.internal.some((r) => r.id === "recruiter_demo_collaboration"));
});

test("5 company integrations team talent pool cockpit command center billing visible in hub or internal", () => {
  assert.equal(HIDE_COMPANY_INTEGRATIONS_FROM_HUB, false);
  assert.equal(COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE, false);
  const split = splitActivationSurfaceRoutes("company", getSystemOfRecordRoutesForPersona("company"));
  const shown = [...split.core, ...split.extended, ...split.pilotPreview, ...split.comingSoonPaused];
  for (const id of [
    "company_integrations",
    "company_team",
    "company_talent_pool",
    "company_hiring_cockpit",
    "company_hiring_command_center",
  ]) {
    assert.ok(shown.some((r) => r.id === id), id);
  }
  assert.ok(split.internal.some((r) => r.id === "company_billing"));
  assert.ok(!isWorkspaceModuleVisible("company_demo_pipeline"));
});

test("6 investor incomplete modules hub-hidden (Full Product Completion 2026-07-22)", () => {
  // Jul-10 "all visible" superseded for DEMO/incomplete investor surfaces.
  assert.equal(HIDE_INVESTOR_DATA_ROOM_FROM_HUB, true);
  assert.equal(HIDE_INVESTOR_PLACEMENT_FROM_HUB, true);
  assert.equal(HIDE_INVESTOR_PUBLIC_LOGIN_FROM_PREVIEW, true);
  assert.equal(HIDE_BOARD_FROM_INVESTOR_DEFAULT_HUB, true);
  assert.ok(!isWorkspaceModuleVisible("investor_data_room"));
  assert.ok(!isWorkspaceModuleVisible("investor_placement"));
  assert.ok(!isWorkspaceModuleVisible("investor_trust_proof"));
  assert.ok(!isWorkspaceModuleVisible("login"));
  assert.ok(!isWorkspaceModuleVisible("recruiter_demo_pipeline"));
  const investorRoutes = getSystemOfRecordRoutesForPersona("investor");
  const split = splitActivationSurfaceRoutes("investor", investorRoutes);
  const shown = [...split.core, ...split.extended, ...split.pilotPreview, ...split.comingSoonPaused];
  assert.ok(shown.some((r) => r.id === "investor_product_proof"));
  assert.ok(shown.some((r) => r.id === "investor_metrics"));
});

test("7 hub component uses activation sections", () => {
  const hub = read("src/components/workspace/system-of-record-navigation-hub.tsx");
  assert.match(hub, /splitActivationSurfaceRoutes/);
  assert.match(hub, /data-activation-hub-section/);
  assert.match(hub, /productSurface\.coreSectionTitle/);
});

test("8 all workspaces have module inventory", () => {
  for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
    const entries = getActivationEntriesForWorkspace(persona);
    assert.ok(entries.length >= 8, persona);
  }
  assert.ok(ALL_WORKSPACE_MODULE_IDS.length >= 40);
  assert.ok(WORKSPACE_MODULE_ACTIVATION.length >= 40);
});

test("9 INTERNAL modules hidden — auto_apply revoke_delete billing", () => {
  assert.ok(!isWorkspaceModuleVisible("auto_apply"));
  assert.ok(!isWorkspaceModuleVisible("candidate_revoke_delete"));
  assert.ok(!isWorkspaceModuleVisible("company_billing"));
  const candidateSplit = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  assert.ok(candidateSplit.hidden.some((r) => r.id === "candidate_revoke_delete"));
});

test("10 career compass GREEN LIVE after Wave B smoke PASS", () => {
  assert.equal(CAREER_COMPASS_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(CAREER_COMPASS_SHIP_STATUS, "live");
  const route = getSystemOfRecordRoutesForPersona("candidate").find((r) => r.id === "candidate_career_compass");
  assert.ok(route);
  assert.equal(route!.status, "live");
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "career_compass");
  assert.equal(mod!.status, "live");
  const entry = getWorkspaceModuleActivationEntry("candidate_career_compass");
  assert.ok(entry);
  assert.equal(entry!.activationStatus, "LIVE");
  assert.equal(entry!.green, true);
});

test("11 npm script registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:all-workspace-modules-visible-guard/);
});
