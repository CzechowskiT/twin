import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 useLoadWhenVisible hook defers until viewport + tab visible", () => {
  const src = read("src/hooks/use-load-when-visible.ts");
  assert.match(src, /export function useLoadWhenVisible/);
  assert.match(src, /IntersectionObserver/);
  assert.match(src, /usePageVisibility/);
  assert.match(src, /shouldLoad/);
  assert.match(src, /intersecting && pageVisible/);
  assert.match(src, /observer\.disconnect/);
  assert.match(src, /rootMargin/);
  assert.match(src, /once/);
  assert.match(src, /useRef/);
  assert.match(src, /useState/);
  assert.match(src, /useEffect/);
  assert.match(src, /HTMLDivElement/);
  assert.match(src, /return \{ ref/);
  assert.match(src, /pageVisible/);
  assert.match(src, /intersecting/);
});

test("2 LightweightRouteShell paints without blocking hidden tabs", () => {
  const src = read("src/components/lightweight-route-shell.tsx");
  assert.match(src, /export function LightweightRouteShell/);
  assert.match(src, /usePageVisibility/);
  assert.match(src, /SLOW_PAINT_MS/);
  assert.match(src, /lightweight-route-shell-skeleton/);
  assert.match(src, /lightweight-route-shell-ready/);
  assert.match(src, /forceShow/);
  assert.match(src, /paintReady/);
  assert.match(src, /hidden/);
  assert.match(src, /skeleton/);
  assert.match(src, /requestAnimationFrame/);
  assert.match(src, /setTimeout/);
  assert.match(src, /clearTimeout/);
  assert.match(src, /children/);
  assert.match(src, /cancelAnimationFrame/);
  assert.match(src, /4_000/);
});

test("3 route-aware marquee: safe strip on workspace/auth, full on marketing", () => {
  const marquee = read("src/components/marketing/company-logo-marquee.tsx");
  const safe = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const siteTop = read("src/components/site-top-marquee.tsx");
  assert.match(marquee, /export function CompanyLogoMarquee/);
  assert.match(marquee, /MARQUEE_SEGMENTS/);
  assert.match(marquee, /marketing-marquee-track/);
  assert.match(marquee, /usePageVisibility/);
  assert.match(marquee, /useReducedMotionPreference/);
  assert.match(marquee, /staticMarquee/);
  assert.doesNotMatch(marquee, /will-change/);
  assert.doesNotMatch(marquee, /backdrop-blur/);
  assert.match(safe, /export function PerformanceSafeMovingLogoMarquee/);
  assert.match(safe, /performance-safe-marquee-track/);
  assert.match(safe, /usePageVisibility/);
  assert.match(safe, /useReducedMotionPreference/);
  assert.match(siteTop, /isPerformanceLightChromePath/);
  assert.match(siteTop, /PerformanceSafeMovingLogoMarquee/);
  assert.match(siteTop, /CompanyLogoMarquee/);
  assert.match(siteTop, /dynamic\(/);
});

test("4 workspace route classification and html data attribute sync", () => {
  const classify = read("src/lib/performance-route-classification.ts");
  const sync = read("src/components/workspace-route-sync.tsx");
  const providers = read("src/components/providers.tsx");
  assert.match(classify, /isWorkspacePath/);
  assert.match(classify, /isAuthPath/);
  assert.match(classify, /isPerformanceLightChromePath/);
  assert.match(classify, /\/dashboard/);
  assert.match(classify, /\/recruiter/);
  assert.match(classify, /\/company/);
  assert.match(classify, /\/login/);
  assert.match(sync, /data-workspace-route/);
  assert.match(sync, /WorkspaceRouteSync/);
  assert.match(providers, /WorkspaceRouteSync/);
  assert.match(classify, /\/workspace/);
  assert.match(classify, /\/profile/);
  assert.match(classify, /\/onboarding/);
  assert.match(classify, /\/register/);
});

test("5 globals pause marquee when hidden and strip workspace blur", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\[data-workspace-route="true"\]/);
  assert.match(css, /company-logo-marquee/);
  assert.match(css, /performance-safe-logo-marquee/);
  assert.match(css, /site-top-marquee-band/);
  assert.match(css, /backdrop-filter: none/);
  assert.doesNotMatch(css, /html\[data-workspace-route="true"\][\s\S]{0,400}\.marketing-marquee-track[\s\S]{0,120}animation: none/);
  assert.match(css, /html\[data-page-hidden="true"\]/);
  assert.match(css, /marketing-marquee-track/);
  assert.match(css, /performance-safe-marquee-track/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(css, /twin-studio-ambient/);
  assert.match(css, /landing-ambient__mesh/);
  assert.match(css, /landing-ambient__orb/);
  assert.match(css, /twin-nature-wallpaper-img/);
});

test("6 workspace layouts use LightweightRouteShell via WorkspaceRouteLayout", () => {
  const layout = read("src/components/workspace-route-layout.tsx");
  const dashboard = read("src/app/dashboard/layout.tsx");
  const recruiter = read("src/app/recruiter/recruiter-layout-client.tsx");
  const recruiterLayout = read("src/app/recruiter/layout.tsx");
  const company = read("src/app/company/layout.tsx");
  const login = read("src/app/login/login-layout-client.tsx");
  assert.match(layout, /LightweightRouteShell/);
  assert.match(layout, /PersonaWorkspaceGate/);
  assert.match(layout, /WorkspaceRouteSkeleton/);
  assert.match(dashboard, /WorkspaceRouteLayout/);
  assert.match(recruiter, /WorkspaceRouteLayout/);
  assert.doesNotMatch(recruiterLayout, /"use client"/);
  assert.match(company, /WorkspaceRouteLayout/);
  assert.match(login, /LightweightRouteShell/);
  assert.match(login, /AuthRouteSkeleton/);
  assert.match(layout, /withOnboarding/);
  assert.match(dashboard, /withOnboarding/);
  assert.match(company, /surface="company"/);
  assert.match(recruiter, /surface="recruiter"/);
});

test("7 route-aware background skipped on workspace/auth paths", () => {
  const bg = read("src/components/route-aware-background.tsx");
  const site = read("src/components/site-chrome.tsx");
  assert.match(bg, /isPerformanceLightChromePath/);
  assert.match(bg, /return null/);
  assert.match(bg, /NatureBackground/);
  assert.match(bg, /RouteAwareBackground/);
  assert.match(site, /SiteTopMarquee/);
  assert.match(site, /RouteAwareBackground/);
  assert.match(site, /immersive/);
  assert.match(site, /waitlist/);
  assert.doesNotMatch(bg, /pointermove/);
  assert.match(bg, /MARKETING_SURFACE/);
  assert.match(bg, /isMarketingPublicPath/);
  assert.match(bg, /twin-studio-ambient/);
  assert.match(bg, /resolveNatureVariant/);
  assert.match(bg, /usePathname/);
});

test("8 company talent pool defers readiness and details panels", () => {
  const client = read("src/app/company/talent-pool/company-talent-pool-client.tsx");
  assert.match(client, /useLoadWhenVisible/);
  assert.match(client, /readinessDeferred/);
  assert.match(client, /detailsDeferred/);
  assert.match(client, /shouldLoad/);
  assert.match(client, /useAbortableFetch/);
  assert.match(client, /dynamic\(/);
  assert.match(client, /CompanyTalentPoolReadinessGuide/);
  assert.match(client, /readinessPanel/);
  assert.match(client, /roleSkillCoverage/);
  assert.match(client, /readinessSnapshot/);
  assert.match(client, /recordsList/);
  assert.match(client, /trustPanel/);
  assert.match(client, /animate-pulse/);
  assert.match(client, /ref=\{readinessDeferred\.ref\}/);
  assert.match(client, /ref=\{detailsDeferred\.ref\}/);
});

test("9 talent radar lazy-loads modals and defers heavy panels", () => {
  const radar = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(radar, /useLoadWhenVisible/);
  assert.match(radar, /detailsDeferred/);
  assert.match(radar, /summaryDeferred/);
  assert.match(radar, /dynamic\(/);
  assert.match(radar, /TalentRadarCandidateGroups/);
  assert.match(radar, /TalentRadarDraftModal/);
  assert.match(radar, /TalentRadarDismissModal/);
  assert.match(radar, /TalentRadarSnoozeModal/);
  assert.match(radar, /useAbortableFetch/);
  assert.match(radar, /fetchAbortable/);
  assert.match(radar, /ssr: false/);
  assert.match(radar, /TalentRadarSummaryPanel/);
  assert.match(radar, /shouldLoad/);
  assert.match(radar, /animate-pulse/);
  assert.doesNotMatch(radar, /from "@\/components\/recruiter\/talent-radar\/talent-radar-decision-modals"/);
});

test("10 digest defers lower sections and uses abortable fetch", () => {
  const digest = read("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(digest, /useLoadWhenVisible/);
  assert.match(digest, /lowerSectionsDeferred/);
  assert.match(digest, /useAbortableFetch/);
  assert.match(digest, /useMemo\(\(\) => payload\?\.sections/);
  assert.match(digest, /TalentRadarDigestSummary/);
  assert.match(digest, /TalentRadarDigestNarrative/);
  assert.match(digest, /TalentRadarDigestSection/);
  assert.match(digest, /shouldLoad/);
  assert.match(digest, /ref=\{lowerSectionsDeferred\.ref\}/);
  assert.match(digest, /animate-pulse/);
  assert.match(digest, /fetchAbortable/);
  assert.match(digest, /digestHasContent/);
  assert.match(digest, /RECRUITER_TALENT_RADAR_DIGEST_MARKERS/);
  assert.match(digest, /backToRadar/);
  assert.match(digest, /disclaimer/);
});

test("11 import preview uses abortable fetch and visibility deferral", () => {
  const imp = read("src/app/recruiter/talent-pool/import/recruiter-talent-pool-import-client.tsx");
  assert.match(imp, /useAbortableFetch/);
  assert.match(imp, /useLoadWhenVisible/);
  assert.match(imp, /previewDeferred/);
  assert.match(imp, /fetchAbortable/);
  assert.match(imp, /previewPanel/);
  assert.match(imp, /shouldLoad/);
  assert.match(imp, /ref=\{previewDeferred\.ref\}/);
  assert.match(imp, /import\/preview/);
  assert.match(imp, /import\/commit/);
  assert.match(imp, /animate-pulse/);
  assert.match(imp, /runPreview/);
  assert.match(imp, /runCommit/);
  assert.match(imp, /csv_text/);
  assert.match(imp, /commitButton/);
  assert.match(imp, /resultPanel/);
});

test("12 heavy marketing and dashboard routes use dynamic imports", () => {
  const forCo = read("src/app/(marketing)/for-companies/page.tsx");
  const investor = read("src/app/investor/page.tsx");
  const metrics = read("src/app/investor/metrics/page.tsx");
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.match(forCo, /dynamic\(/);
  assert.match(forCo, /PersonaMarketingPage/);
  assert.match(forCo, /ssr: false/);
  assert.match(investor, /dynamic\(/);
  assert.match(investor, /InvestorRoomPage/);
  assert.match(metrics, /InvestorMetricsRealityDashboard/);
  assert.match(metrics, /WorkspaceRouteLayout/);
  assert.match(dashboard, /dynamic\(/);
  assert.match(dashboard, /DashboardModals/);
  assert.match(dashboard, /FeedbackModal/);
  assert.match(dashboard, /HelpWidget/);
  assert.match(dashboard, /DashboardTutorial/);
  assert.match(dashboard, /ssr: false/);
  assert.match(forCo, /animate-pulse/);
  assert.match(investor, /animate-pulse/);
});

test("13 demo data is lazy-loaded and capped", () => {
  const lazy = read("src/lib/lazy-demo-data.ts");
  const brief = read("src/components/career-assistant/global-job-brief-panel.tsx");
  assert.match(lazy, /DEMO_ARRAY_CAP/);
  assert.match(lazy, /capDemoArray/);
  assert.match(lazy, /loadJobBriefDemoModule/);
  assert.match(lazy, /loadEmployerPricingDemoModule/);
  assert.match(lazy, /loadJobEmployerDemoModule/);
  assert.match(lazy, /import\("@\/lib\/job-brief-demo-data"\)/);
  assert.match(brief, /loadJobBriefDemoModule/);
  assert.match(brief, /capDemoArray/);
  assert.match(brief, /cancelled = true/);
  assert.match(brief, /animate-pulse/);
  assert.doesNotMatch(brief, /import \{[^}]*getDemoGlobalJobBrief/);
  assert.match(brief, /import type \{ GlobalJobBriefData \}/);
  assert.match(brief, /cappedBrief/);
  assert.match(lazy, /slice\(0, cap\)/);
  assert.match(lazy, /10/);
  assert.match(brief, /similarRoles: capDemoArray/);
});

test("14 prior multi-tab hardening utilities remain wired", () => {
  const visibility = read("src/hooks/use-page-visibility.ts");
  const interval = read("src/hooks/use-background-aware-interval.ts");
  const abort = read("src/hooks/use-abortable-fetch.ts");
  const dedupe = read("src/lib/public-health-client.ts");
  const sync = read("src/components/page-visibility-sync.tsx");
  const nature = read("src/components/nature-background.tsx");
  assert.match(visibility, /visibilitychange/);
  assert.match(interval, /pauseWhenHidden/);
  assert.match(abort, /AbortController/);
  assert.match(dedupe, /createRequestDeduper/);
  assert.match(sync, /data-page-hidden/);
  assert.match(nature, /usePageVisibility/);
  assert.match(nature, /removeEventListener/);
  assert.match(read("src/hooks/dashboard/use-dashboard-polling.ts"), /document\.hidden/);
  assert.match(read("src/lib/waitlist/use-waitlist-stats.ts"), /useBackgroundAwareInterval/);
  assert.match(read("src/components/marketing/company-logo-marquee.tsx"), /staticMarquee/);
  assert.match(read("src/app/dashboard/calendar/page.tsx"), /pageHidden/);
  assert.match(read("src/lib/oauth-auth.ts"), /fetchPublicHealthJson/);
  assert.match(read("src/components/investor/investor-metrics-reality-dashboard.tsx"), /fetchPublicHealthJson/);
  assert.match(read("src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx"), /useAbortableFetch/);
});

test("15 package registers P0 and prior performance tests", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:p0-browser-memory-multitab-performance/);
  assert.match(pkg, /test:multi-tab-performance-hardening/);
  assert.match(pkg, /p0-browser-memory-multitab-performance\.test\.ts/);
  assert.match(pkg, /multi-tab-performance-hardening\.test\.ts/);
  assert.doesNotMatch(pkg, /test:p0-browser-memory-multitab-performance.*test:p0-browser-memory-multitab-performance/);
  const scriptLine = pkg.match(/"test:p0-browser-memory-multitab-performance": "[^"]+"/);
  assert.ok(scriptLine);
  assert.match(scriptLine![0], /tsx/);
  assert.match(pkg, /"build": "next build"/);
  assert.match(pkg, /"lint": "eslint"/);
  assert.match(pkg, /"dev": "next dev"/);
  assert.match(pkg, /"start": "next start"/);
  assert.ok(pkg.includes("test:company-talent-pool-view-mvp"));
  assert.ok(pkg.includes("test:recruiter-talent-radar-mvp"));
  assert.ok(pkg.includes("test:homepage-nav"));
  assert.ok(pkg.includes("test:investor-room-mvp"));
});

test("16 phase3b static inventory blocked — 20 routes, browser gated, P0 OPEN", () => {
  const helper = read("e2e/helpers/phase3b-controlled-routes.ts");
  assert.match(helper, /PHASE3B_ALL_ROUTES/);
  assert.match(helper, /PHASE3B_ROUTE_COUNT/);

  const phase3bTest = read("scripts/phase3b-controlled-multitab.test.ts");
  assert.match(phase3bTest, /PHASE3B_ROUTE_COUNT, 20/);
  assert.match(phase3bTest, /Phase 3B.*HARD BLOCKED/i);

  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-controlled-multitab-browser/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  assert.match(pkg, /test:e2e.*DISABLED/i);

  const phase3bDoc = readFileSync(join(root, "..", "docs", "PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md"), "utf8");
  assert.match(phase3bDoc, /STATUS: BLOCKED/i);
  assert.match(phase3bDoc, /DO NOT RUN/i);

  const p0Doc = readFileSync(join(root, "..", "docs", "P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md"), "utf8");
  assert.match(p0Doc, /36 routes/i);
  assert.match(p0Doc, /Phase 3B.*BLOCKED/i);
});
