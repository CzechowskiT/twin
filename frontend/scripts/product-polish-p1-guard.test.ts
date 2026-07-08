/**
 * Product Polish 1.0 P1 — static guard for limited-launch UX slice.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";
import {
  HIDE_THIN_MARKETING_NAV_LINKS,
  MOBILE_HEADER_DEMO_IN_MENU_ONLY,
  MOBILE_HEADER_LANG_IN_MENU,
  SHOW_COMPANY_ONBOARDING_EMPTY_STATE,
  SHOW_RECRUITER_HUB_NEXT_ACTION,
  THIN_MARKETING_PATHS,
  TRUST_CENTER_OVERVIEW_MODE,
} from "../src/lib/product-polish-p1";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P1_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 thin marketing nav hidden — routes use coming-soon surface", () => {
  assert.equal(HIDE_THIN_MARKETING_NAV_LINKS, true);
  assert.deepEqual([...THIN_MARKETING_PATHS], ["/partners", "/careers", "/media"]);
  const footer = read("src/components/site-footer.tsx");
  const header = read("src/components/site-header-bar.tsx");
  assert.match(footer, /HIDE_THIN_MARKETING_NAV_LINKS/);
  assert.match(footer, /THIN_MARKETING_PATHS/);
  assert.match(header, /THIN_MARKETING_PATHS/);
  for (const path of THIN_MARKETING_PATHS) {
    const page = read(`src/app/(marketing)${path}/page.tsx`);
    assert.match(page, /MarketingComingSoonSurface/);
  }
});

test("2 mobile header declutters demo and language picker", () => {
  assert.equal(MOBILE_HEADER_DEMO_IN_MENU_ONLY, true);
  assert.equal(MOBILE_HEADER_LANG_IN_MENU, true);
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /MOBILE_HEADER_DEMO_IN_MENU_ONLY/);
  assert.match(header, /hidden md:inline-flex/);
  assert.match(header, /MOBILE_HEADER_LANG_IN_MENU/);
  assert.match(header, /hidden md:block/);
});

test("3 trust center overview mode with advanced details", () => {
  assert.equal(TRUST_CENTER_OVERVIEW_MODE, true);
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /TRUST_CENTER_OVERVIEW_MODE/);
  assert.match(trust, /advancedModulesToggle/);
  assert.match(trust, /WorkspaceStatusBadge/);
});

test("4 recruiter hub next action when promos off", () => {
  assert.equal(SHOW_RECRUITER_HUB_NEXT_ACTION, true);
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /RecruiterHubNextAction/);
  assert.match(hub, /recruiter-hub-next-action/);
});

test("5 company onboarding empty state without token-first screen", () => {
  assert.equal(SHOW_COMPANY_ONBOARDING_EMPTY_STATE, true);
  const company = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(company, /onboardingTitle/);
  assert.match(company, /connectWorkspaceToggle/);
  assert.match(company, /company-workspace-connect/);
});

test("6 unified workspace status badge includes coming soon", () => {
  const badge = read("src/components/workspace/workspace-status-badge.tsx");
  assert.match(badge, /coming_soon/);
  assert.match(en.workspaceModules.statusComingSoon, /Coming soon/i);
  assert.match(dictionaries.pl.workspaceModules.statusComingSoon, /Wkrótce/i);
});

test("7 P1 slice doc exists with stance footer", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P1 slice/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});
