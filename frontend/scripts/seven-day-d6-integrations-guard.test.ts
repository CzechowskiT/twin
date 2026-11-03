/**
 * Seven-day D6 integrations / billing / calendar slice — honest tiers, no fake checkout/sync.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { COMPANY_INTEGRATION_ROWS } from "../src/lib/company-integrations-readiness";
import { RECRUITER_INTEGRATION_ROWS } from "../src/lib/recruiter-integrations-readiness";
import { SHOW_DASHBOARD_AUTO_APPLY_STRIP } from "../src/lib/product-polish-p0";
import {
  ATS_COMING_SOON_NO_LIVE_SYNC,
  AUTO_APPLY_PAUSED_HIDDEN,
  BILLING_PREMIUM_PREVIEW_ONLY,
  CALENDAR_PROVIDER_TIERS,
  CANDIDATE_CALENDAR_HONEST_TIERS,
  COMPANY_SCHEDULING_ROADMAP_ONLY,
  FORCE_MICROSOFT_CALENDAR_COMING_SOON,
  HIDE_CANDIDATE_BILLING_FROM_HUB,
  HIDE_COMPANY_BILLING_FROM_NAV,
  HIDE_RECRUITER_CALENDAR_FROM_NAV,
  NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON,
  NO_FAKE_CHECKOUT_OR_CONNECTED_SYNC_UI,
  RECRUITER_CALENDAR_ROADMAP_ONLY,
  STRIPE_NOT_PUBLIC_LAUNCH,
  STRIPE_SANDBOX_CHECKOUT_ENABLED,
} from "../src/lib/seven-day-d6-integrations";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D6_DOC = "docs/SEVEN_DAY_D6_INTEGRATIONS_BILLING_CALENDAR_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function d6UiBlob(): string {
  return [
    read("src/components/calendar/calendar-connections-panel.tsx"),
    read("src/app/dashboard/billing/page.tsx"),
    read("src/app/company/billing/company-billing-client.tsx"),
    read("src/components/billing/billing-upgrade-experience.tsx"),
    read("src/components/workspace/premium-preview-surface.tsx"),
    read("src/app/recruiter/integrations/recruiter-integrations-client.tsx"),
    read("src/app/company/integrations/company-integrations-client.tsx"),
    read("src/app/recruiter/calendar/page.tsx"),
    read("src/app/dashboard/settings/auto-apply/page.tsx"),
    read("src/components/workspace/integration-row-status-badge.tsx"),
  ].join("\n");
}

test("1 D6 execution doc exists with stance footer and matrices", () => {
  const doc = readRepo(D6_DOC);
  assert.match(doc, /Seven-day D6/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.match(doc, /Status matrices/i);
  assert.match(doc, /Hidden \/ paused/i);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 seven-day-d6 flags — calendar tiers, billing preview, integrations honesty", () => {
  assert.equal(CANDIDATE_CALENDAR_HONEST_TIERS, true);
  assert.equal(RECRUITER_CALENDAR_ROADMAP_ONLY, false);
  assert.equal(COMPANY_SCHEDULING_ROADMAP_ONLY, false);
  assert.equal(NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON, true);
  assert.equal(ATS_COMING_SOON_NO_LIVE_SYNC, true);
  assert.equal(BILLING_PREMIUM_PREVIEW_ONLY, true);
  assert.equal(STRIPE_NOT_PUBLIC_LAUNCH, true);
  assert.equal(AUTO_APPLY_PAUSED_HIDDEN, false);
  assert.equal(NO_FAKE_CHECKOUT_OR_CONNECTED_SYNC_UI, true);
  assert.equal(HIDE_RECRUITER_CALENDAR_FROM_NAV, false);
  assert.equal(HIDE_CANDIDATE_BILLING_FROM_HUB, true);
  assert.equal(HIDE_COMPANY_BILLING_FROM_NAV, true);
  assert.equal(FORCE_MICROSOFT_CALENDAR_COMING_SOON, false);
});

test("3 calendar tiers — Google live, Microsoft coming soon, ICS preview", () => {
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.google, "live");
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.microsoft, "coming_soon");
  assert.deepEqual(CALENDAR_PROVIDER_TIERS.ics, "preview");
  const panel = read("src/components/calendar/calendar-connections-panel.tsx");
  assert.match(panel, /data-seven-day-d6-candidate-calendar/);
  assert.match(panel, /data-seven-day-d6-calendar-boundary/);
  assert.match(panel, /CANDIDATE_CALENDAR_HONEST_TIERS/);
  assert.match(en.productPolish.calendarGoogleLead ?? "", /Live/i);
  assert.match(en.productPolish.calendarMicrosoftLead ?? "", /Coming soon/i);
  assert.match(en.productPolish.calendarIcsLead ?? "", /Preview/i);
  assert.match(en.sevenDayD6.calendarBoundaryLead ?? "", /Google OAuth is live/i);
  assert.match(en.sevenDayD6.calendarBoundaryLead ?? "", /Microsoft 365 is coming soon/i);
});

test("4 recruiter calendar — live holds surface (provider write still gated)", () => {
  const page = read("src/app/recruiter/calendar/page.tsx");
  assert.equal(RECRUITER_CALENDAR_ROADMAP_ONLY, false);
  assert.match(page, /data-recruiter-calendar-live/);
  assert.doesNotMatch(page, /data-seven-day-d6-recruiter-calendar-boundary/);
  assert.match(page, /WorkspaceStatusBadge status="live"/);
  assert.doesNotMatch(page, /Microsoft.*live/i);
});

test("5 billing — premium preview, stripe public launch blocked, sandbox CTA allowed", () => {
  const candidate = read("src/app/dashboard/billing/page.tsx");
  assert.match(candidate, /STRIPE_NOT_PUBLIC_LAUNCH/);
  assert.match(candidate, /data-seven-day-d6-billing-stripe-boundary/);
  assert.match(candidate, /checkoutPublicEnabled/);
  assert.match(candidate, /PremiumPreviewSurface/);
  const company = read("src/app/company/billing/company-billing-client.tsx");
  assert.match(company, /data-seven-day-d6-company-billing/);
  assert.match(company, /PremiumPreviewSurface/);
  assert.match(company, /STRIPE_NOT_PUBLIC_LAUNCH/);
  assert.match(company, /STRIPE_SANDBOX_CHECKOUT_ENABLED/);
  assert.match(company, /checkout-session/);
  assert.match(company, /data-seven-day-d6-billing-sandbox-cta/);
  assert.doesNotMatch(company, /public launch enabled|Stripe is live/i);
  const preview = read("src/components/workspace/premium-preview-surface.tsx");
  assert.match(preview, /premiumPreviewWaitlistCta/);
  assert.match(en.sevenDayD6.billingStripePreviewBoundary ?? "", /not part of the public launch/i);
  assert.match(en.productPolish.premiumPreviewLead ?? "", /no fake upgrade/i);
  assert.equal(STRIPE_SANDBOX_CHECKOUT_ENABLED, true);
  assert.equal(STRIPE_NOT_PUBLIC_LAUNCH, true);
});

test("6 integrations — coming soon rows, no fake connected sync", () => {
  const recruiter = read("src/app/recruiter/integrations/recruiter-integrations-client.tsx");
  assert.match(recruiter, /data-seven-day-d6-integrations-boundary/);
  assert.match(en.sevenDayD6.integrationsNoLiveSyncBoundary ?? "", /No live sync/i);
  const company = read("src/app/company/integrations/company-integrations-client.tsx");
  assert.match(company, /data-seven-day-d6-company-scheduling-boundary/);
  assert.match(en.sevenDayD6.companySchedulingComingSoonTitle ?? "", /Coming soon/i);
  const atsRec = RECRUITER_INTEGRATION_ROWS.find((r) => r.id === "ats_oauth");
  assert.equal(atsRec?.status, "planned");
  const calRec = RECRUITER_INTEGRATION_ROWS.find((r) => r.id === "calendar_sync");
  assert.equal(calRec?.status, "not_live");
  const csvRec = RECRUITER_INTEGRATION_ROWS.find((r) => r.id === "talent_pool_import");
  assert.equal(csvRec?.status, "pilot");
});

test("7 integration badge — not_live normalized to coming_soon for users", () => {
  const badge = read("src/components/workspace/integration-row-status-badge.tsx");
  assert.match(badge, /NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON/);
  assert.match(badge, /mapped = "coming_soon"/);
});

test("8 auto-apply — strip visible when SHOW=true; review-before-submit honesty", () => {
  assert.equal(SHOW_DASHBOARD_AUTO_APPLY_STRIP, true);
  assert.equal(AUTO_APPLY_PAUSED_HIDDEN, false);
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.match(dashboard, /SHOW_DASHBOARD_AUTO_APPLY_STRIP/);
  assert.match(dashboard, /<NightlyAutoApplyStrip/);
  const settings = read("src/app/dashboard/settings/auto-apply/page.tsx");
  assert.match(settings, /AUTO_APPLY_PAUSED_HIDDEN/);
  assert.match(settings, /data-seven-day-d6-auto-apply-review-mode/);
  assert.match(settings, /autoApplyReviewBeforeSubmitBoundary/);
  assert.match(en.sevenDayD6.autoApplyReviewBeforeSubmitBoundary ?? "", /review-before-submit/i);
  assert.match(dictionaries.pl.sevenDayD6.autoApplyReviewBeforeSubmitBoundary ?? "", /review-before-submit/i);
});

test("9 no fake checkout or connected sync in D6 UI blob", () => {
  const blob = d6UiBlob();
  assert.doesNotMatch(blob, /\bfake checkout\b/i);
  assert.doesNotMatch(blob, /\bfully connected\b/i);
  assert.doesNotMatch(blob, /\ball integrations live\b/i);
  assert.doesNotMatch(blob, /\blive sync is on\b/i);
  assert.doesNotMatch(blob, /\bneeds_setup\b/i);
});

test("10 npm script test:seven-day-d6-integrations-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d6-integrations-guard":/);
  assert.match(pkg, /seven-day-d6-integrations-guard\.test\.ts/);
});
