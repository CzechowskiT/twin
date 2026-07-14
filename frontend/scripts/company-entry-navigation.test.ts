import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_ENTRY_B2B_CALCULATOR_ROUTE,
  COMPANY_ENTRY_DASHBOARD_ROUTE,
  COMPANY_ENTRY_MARKERS,
  COMPANY_ENTRY_PREVIEW_CARDS,
  COMPANY_TALENT_POOL_BACK_LINKS,
} from "../src/lib/company-entry-navigation";
import { COMPANY_HIRING_ROUTE } from "../src/lib/company-hiring-dashboard";
import { COMPANY_TALENT_POOL_ROUTE } from "../src/lib/company-talent-pool";
import { PERSONA_PAGES } from "../src/lib/persona-pages";
import { WORKSPACE_PATH } from "../src/lib/persona-auth";
import { sessionPanelHref } from "../src/lib/persona-access";
import { dictionaries, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("canonical company entry routes", () => {
  assert.equal(COMPANY_ENTRY_DASHBOARD_ROUTE, "/company/dashboard");
  assert.equal(COMPANY_ENTRY_DASHBOARD_ROUTE, COMPANY_HIRING_ROUTE);
  assert.equal(COMPANY_TALENT_POOL_BACK_LINKS.dashboard, "/company/dashboard");
  assert.equal(COMPANY_TALENT_POOL_BACK_LINKS.roles, "/company/roles");
});

test("for-companies hero CTAs route to workspace", () => {
  const en = PERSONA_PAGES.companies.en;
  const pl = PERSONA_PAGES.companies.pl;
  assert.equal(en.primaryCta.href, COMPANY_ENTRY_DASHBOARD_ROUTE);
  assert.equal(en.stackedCta?.href, COMPANY_TALENT_POOL_ROUTE);
  assert.equal(en.secondaryCta?.href, COMPANY_ENTRY_B2B_CALCULATOR_ROUTE);
  assert.match(pl.primaryCta.label, /panel firmy/i);
  assert.match(pl.stackedCta?.label ?? "", /pula talent/i);
  assert.equal(en.supplementaryCtas?.length, 2);
});

test("marketing page wires company entry markers and preview", () => {
  const marketing = read("src/components/marketing/persona-marketing-page.tsx");
  const preview = read("src/components/marketing/company-workspace-preview.tsx");
  assert.match(marketing, /COMPANY_ENTRY_MARKERS/);
  assert.match(marketing, /CompanyWorkspacePreview/);
  assert.match(preview, /COMPANY_ENTRY_PREVIEW_CARDS/);
  assert.equal(COMPANY_ENTRY_PREVIEW_CARDS.length, 4);
});

test("company workspace preview cards link to canonical workspace routes", () => {
  const hrefs = COMPANY_ENTRY_PREVIEW_CARDS.map((c) => c.href);
  assert.deepEqual(hrefs, [
    "/company/dashboard",
    "/company/talent-pool",
    "/company/integrations",
    "/calculator/b2b",
  ]);
  for (const href of hrefs) {
    assert.ok(href.startsWith("/company/") || href.startsWith("/calculator/"), href);
  }
});

test("header panel href for company persona targets dashboard", () => {
  assert.equal(WORKSPACE_PATH.company, COMPANY_ENTRY_DASHBOARD_ROUTE);
  assert.equal(sessionPanelHref("company"), "/company/dashboard");
  assert.equal(sessionPanelHref("recruiter"), "/workspace/recruiter");
});

test("talent pool footer back-links include dashboard and roles", () => {
  const client = read("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /COMPANY_TALENT_POOL_BACK_LINKS\.dashboard/);
  assert.match(client, /COMPANY_TALENT_POOL_BACK_LINKS\.roles/);
  assert.match(client, /companyTalentPool\.linkImport/);
});

test("legacy workspace company redirects to dashboard", () => {
  const page = read("src/app/workspace/company/page.tsx");
  assert.match(page, /redirect/);
  assert.match(page, /COMPANY_ENTRY_DASHBOARD_ROUTE/);
});

test("companyEntry i18n keys for en and pl", () => {
  for (const locale of ["en", "pl"] as const) {
    const block = dictionaries[locale].companyEntry;
    assert.ok(block.workspacePreviewTitle.length > 0, locale);
    assert.ok(block.previewDashboardTitle.length > 0, locale);
    assert.ok(block.previewTalentPoolTitle.length > 0, locale);
    assert.ok(block.previewIntegrationsTitle.length > 0, locale);
    assert.ok(block.previewCalculatorTitle.length > 0, locale);
  }
});

test("company talent pool footer i18n includes role-aware import copy", () => {
  assert.match(dictionaries.en.companyTalentPool.linkImport, /role/i);
  assert.match(dictionaries.pl.companyTalentPool.linkImport, /role/i);
  assert.ok(dictionaries.en.companyTalentPool.linkDashboard.length > 0);
  assert.ok(dictionaries.pl.companyTalentPool.linkRoles.length > 0);
});

test("for-companies footer exposes dashboard and talent pool", () => {
  const page = read("src/app/(marketing)/for-companies/page.tsx");
  assert.match(page, /\/company\/dashboard/);
  assert.match(page, /\/company\/talent-pool/);
  assert.match(page, /companyEntry\.footerDashboard/);
});

test("company dashboard hub includes talent pool pilot module", () => {
  const dash = read("src/app/company/dashboard/company-dashboard-client.tsx");
  const modules = read("src/lib/company-workspace-modules.ts");
  assert.match(dash, /SystemOfRecordNavigationHub/);
  assert.match(dash, /data-testid="company-module-grid"/);
  assert.match(modules, /companyTalentPoolTitle/);
  assert.match(modules, /COMPANY_TALENT_POOL_ROUTE/);
  assert.match(modules, /status: "pilot"/);
});

test("package.json registers company entry navigation test", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:company-entry-navigation/);
});

test("for-companies integrations preview stays in company workspace", () => {
  const integrations = COMPANY_ENTRY_PREVIEW_CARDS.find((c) => c.id === "integrations");
  assert.ok(integrations);
  assert.equal(integrations!.href, "/company/integrations");
  assert.notEqual(integrations!.href, "/investor/roadmap#company-integrations");
});

test("company entry markers are stable test ids", () => {
  assert.equal(COMPANY_ENTRY_MARKERS.heroDashboard, "company-entry-hero-dashboard");
  assert.equal(COMPANY_ENTRY_MARKERS.workspacePreview, "company-entry-workspace-preview");
});

test("all locales inherit companyEntry via en fallback or explicit copy", () => {
  for (const locale of LOCALES) {
    const block = dictionaries[locale].companyEntry;
    assert.ok(block.previewDashboardCta.length > 0, locale);
  }
});
