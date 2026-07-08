/**
 * Product Polish 1.0 P2 — static guard for calendar, billing, badge migration.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";
import {
  BILLING_PREMIUM_PREVIEW_ONLY,
  CALENDAR_PROVIDER_TIERS,
  FORCE_MICROSOFT_CALENDAR_COMING_SOON,
  INVESTOR_ROOM_SIMPLIFIED_PREVIEW,
} from "../src/lib/product-polish-p2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P2_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 calendar provider tiers — Google live, Microsoft coming soon, ICS preview", () => {
  assert.equal(CALENDAR_PROVIDER_TIERS.google, "live");
  assert.equal(CALENDAR_PROVIDER_TIERS.microsoft, "coming_soon");
  assert.equal(CALENDAR_PROVIDER_TIERS.ics, "preview");
  assert.equal(FORCE_MICROSOFT_CALENDAR_COMING_SOON, true);
  const panel = read("src/components/calendar/calendar-connections-panel.tsx");
  assert.match(panel, /CALENDAR_PROVIDER_TIERS/);
  assert.match(panel, /FORCE_MICROSOFT_CALENDAR_COMING_SOON/);
  assert.match(panel, /productPolish\.calendarGoogleTitle/);
  assert.match(panel, /productPolish\.calendarMicrosoftTitle/);
  assert.match(panel, /productPolish\.calendarIcsTitle/);
});

test("2 billing premium preview — waitlist/contact only", () => {
  assert.equal(BILLING_PREMIUM_PREVIEW_ONLY, true);
  const surface = read("src/components/workspace/premium-preview-surface.tsx");
  assert.match(surface, /PremiumPreviewSurface/);
  assert.match(surface, /WorkspaceStatusBadge/);
  assert.match(surface, /productPolish\.premiumPreviewWaitlistCta/);
  const billing = read("src/app/dashboard/billing/page.tsx");
  assert.match(billing, /PremiumPreviewSurface/);
  const companyBilling = read("src/app/company/billing/company-billing-client.tsx");
  assert.match(companyBilling, /PremiumPreviewSurface/);
});

test("3 workspace status badge includes preview tier", () => {
  const badge = read("src/components/workspace/workspace-status-badge.tsx");
  assert.match(badge, /preview/);
  assert.match(en.workspaceModules.statusPreview, /Preview/i);
  assert.match(dictionaries.pl.workspaceModules.statusPreview, /Podgląd/i);
});

test("4 pilot submodule headers and integration row badges", () => {
  const header = read("src/components/workspace/workspace-pilot-page-header.tsx");
  assert.match(header, /WorkspaceStatusBadge/);
  const integrations = read("src/app/recruiter/integrations/recruiter-integrations-client.tsx");
  assert.match(integrations, /IntegrationRowStatusBadge/);
  assert.match(integrations, /WorkspacePilotPageHeader/);
  const companyIntegrations = read("src/app/company/integrations/company-integrations-client.tsx");
  assert.match(companyIntegrations, /IntegrationRowStatusBadge/);
});

test("5 investor room simplified preview", () => {
  assert.equal(INVESTOR_ROOM_SIMPLIFIED_PREVIEW, true);
  const investor = read("src/components/investor/investor-room-page.tsx");
  assert.match(investor, /INVESTOR_ROOM_SIMPLIFIED_PREVIEW/);
  assert.match(investor, /WorkspaceStatusBadge/);
});

test("6 marketing coming soon uses unified badge", () => {
  const marketing = read("src/components/marketing/marketing-coming-soon-surface.tsx");
  assert.match(marketing, /WorkspaceStatusBadge/);
  assert.match(marketing, /coming_soon/);
});

test("7 P2 slice doc exists with stance footer", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P2 slice/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});
