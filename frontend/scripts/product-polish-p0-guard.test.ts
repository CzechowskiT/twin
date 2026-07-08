/**
 * Product Polish 1.0 P0 — static guard for limited-launch surface slice.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { en, dictionaries } from "../src/lib/i18n";
import {
  isPilotPreviewChromePath,
  isPilotPreviewDeepLinkPath,
  PILOT_PREVIEW_BOUNDARY_MARKER,
  SHOW_DASHBOARD_AUTO_APPLY_STRIP,
  SHOW_DASHBOARD_EXTENDED_HOME_MODULES,
  SHOW_RECRUITER_HUB_PRIMARY_PROMOS,
} from "../src/lib/product-polish-p0";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const SLICE_DOC = "docs/PRODUCT_POLISH_1_P0_SLICE_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 P0 flags hide auto-apply strip and extended dashboard overload", () => {
  assert.equal(SHOW_DASHBOARD_AUTO_APPLY_STRIP, false);
  assert.equal(SHOW_DASHBOARD_EXTENDED_HOME_MODULES, false);
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.doesNotMatch(dashboard, /<NightlyAutoApplyStrip/);
  assert.doesNotMatch(dashboard, /from "@\/components\/nightly-auto-apply-strip"/);
  assert.match(dashboard, /SHOW_DASHBOARD_EXTENDED_HOME_MODULES/);
  assert.match(dashboard, /data-dashboard-extended-modules/);
  assert.match(dashboard, /WorkspaceQuickActions/);
  assert.match(dashboard, /\/dashboard\/jobs/);
  assert.match(dashboard, /\/dashboard\/matches/);
  assert.match(dashboard, /\/dashboard\/applications/);
  assert.match(dashboard, /\/dashboard\/calendar/);
  assert.match(dashboard, /\/profile/);
});

test("2 auto-apply module stays paused — not live on dashboard home", () => {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "auto_apply");
  assert.ok(mod);
  assert.equal(mod!.status, "paused");
  const strip = read("src/components/nightly-auto-apply-strip.tsx");
  assert.match(strip, /id="auto-apply-readiness"/);
});

test("3 recruiter hub promos hidden — core quick actions stay primary", () => {
  assert.equal(SHOW_RECRUITER_HUB_PRIMARY_PROMOS, false);
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /SHOW_RECRUITER_HUB_PRIMARY_PROMOS/);
  assert.match(hub, /\/recruiter\/inbox/);
  assert.match(hub, /\/recruiter\/pipeline/);
  assert.match(hub, /\/recruiter\/jobs/);
  assert.match(hub, /\/recruiter\/search/);
  assert.doesNotMatch(hub, /mt-6 block[\s\S]{0,80}RECRUITER_DAILY_COCKPIT_MARKERS\.hubPromo/);
  assert.match(hub, /\{SHOW_RECRUITER_HUB_PRIMARY_PROMOS \?/);
});

test("4 demo deep links get pilot preview boundary without breaking routes", () => {
  const boundary = read("src/components/pilot-preview-boundary.tsx");
  const chrome = read("src/components/site-chrome.tsx");
  assert.match(boundary, /PilotPreviewBoundary/);
  assert.match(boundary, /isPilotPreviewChromePath/);
  assert.match(boundary, /PILOT_PREVIEW_BOUNDARY_MARKER/);
  assert.match(boundary, /data-testid=\{PILOT_PREVIEW_BOUNDARY_MARKER\}/);
  assert.match(boundary, /productPolish\.pilotPreviewBanner/);
  assert.match(chrome, /PilotPreviewBoundary/);
  assert.match(chrome, /isPilotPreviewChromePath/);
  assert.equal(isPilotPreviewDeepLinkPath("/recruiter/daily-cockpit"), true);
  assert.equal(isPilotPreviewDeepLinkPath("/recruiter/trust-review-queue"), true);
  assert.equal(isPilotPreviewDeepLinkPath("/dashboard"), false);
  assert.equal(isPilotPreviewDeepLinkPath("/recruiter/inbox"), false);
  assert.equal(isPilotPreviewChromePath("/login"), false);
  assert.equal(isPilotPreviewChromePath("/login/candidate"), false);
  assert.equal(isPilotPreviewChromePath("/register"), false);
  assert.equal(isPilotPreviewChromePath("/waitlist"), false);
  assert.equal(isPilotPreviewChromePath("/first-1000"), false);
  assert.equal(isPilotPreviewChromePath("/demo"), false);
  assert.equal(isPilotPreviewChromePath("/how-it-works"), false);
  assert.equal(isPilotPreviewChromePath("/recruiter/daily-cockpit"), true);
});

test("5 homepage CTA fatigue reduced — primary waitlist, secondary text link", () => {
  const hero = read("src/components/marketing/landing-hero.tsx");
  const ctaBand = read("src/components/marketing/landing-cta-band.tsx");
  for (const src of [hero, ctaBand]) {
    assert.match(src, /twin-header-cta[\s\S]{0,200}joinWishlist/);
    assert.match(src, /href="\/register"[\s\S]{0,120}twin-link/);
    assert.doesNotMatch(src, /section-cta-primary[\s\S]{0,200}getStarted/);
  }
});

test("6 logo marquee disclaimer is i18n and visible on marketing chrome", () => {
  const marquee = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /marquee-logo-disclaimer/);
  assert.match(marquee, /site\.marqueeLogoDisclaimer/);
  assert.match(en.site.marqueeLogoDisclaimer ?? "", /Representative company logos/i);
  assert.match(dictionaries.pl.site.marqueeLogoDisclaimer ?? "", /Logotypy firm/i);
});

test("7 slice doc states P0 CLOSED, Gate E PASS, Gate F PENDING, Launch NO-GO", () => {
  const doc = readRepo(SLICE_DOC);
  assert.match(doc, /P0 CLOSED/i);
  assert.match(doc, /Gate E PASS/i);
  assert.match(doc, /Gate F PENDING/i);
  assert.match(doc, /Launch NO-GO|NO-GO/i);
  assert.match(doc, /NOT Launch GO/i);
  assert.doesNotMatch(doc, /Gate F[^\n]*\*\*YES\*\*/i);
});

test("8 npm script test:product-polish-p0-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:product-polish-p0-guard/);
  assert.match(pkg, /product-polish-p0-guard\.test\.ts/);
});
