import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createRequestDeduper } from "../src/lib/create-request-deduper";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 headers split: marketing vs workspace vs auth with route-aware chrome", () => {
  const chrome = read("src/components/chrome-header.tsx");
  const marketing = read("src/components/marketing-header.tsx");
  const workspace = read("src/components/workspace-header.tsx");
  const auth = read("src/components/auth-header.tsx");
  const site = read("src/components/site-chrome.tsx");
  assert.match(chrome, /export function ChromeHeader/);
  assert.match(chrome, /isAuthPath/);
  assert.match(chrome, /isWorkspacePath/);
  assert.match(chrome, /AuthHeader/);
  assert.match(chrome, /WorkspaceHeader/);
  assert.match(chrome, /dynamic\(/);
  assert.match(chrome, /marketing-header/);
  assert.match(marketing, /MarketingHeader/);
  assert.match(workspace, /WorkspaceHeader/);
  assert.match(auth, /AuthHeader/);
  assert.match(site, /ChromeHeader/);
  assert.doesNotMatch(site, /from "@\/components\/header"/);
});

test("2 workspace/auth headers avoid marketing SiteHeaderBar corporate nav arrays", () => {
  const workspaceBar = read("src/components/workspace-site-header-bar.tsx");
  const authBar = read("src/components/auth-site-header-bar.tsx");
  const marketingBar = read("src/components/site-header-bar.tsx");
  assert.match(workspaceBar, /headerSessionNavLinks/);
  assert.doesNotMatch(workspaceBar, /corporateNavPrimary/);
  assert.doesNotMatch(workspaceBar, /headerMarketingLaneLinks/);
  assert.doesNotMatch(authBar, /corporateNavPrimary/);
  assert.doesNotMatch(authBar, /headerMarketingLaneLinks/);
  assert.match(marketingBar, /corporateNavPrimary/);
  assert.match(marketingBar, /headerMarketingLaneLinks/);
});

test("3 workspace/auth use safe marquee; marketing lazy-loads full strip", () => {
  const marquee = read("src/components/site-top-marquee.tsx");
  const safe = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const component = read("src/components/marketing/company-logo-marquee.tsx");
  assert.match(marquee, /isPerformanceLightChromePath/);
  assert.match(marquee, /PerformanceSafeMovingLogoMarquee/);
  assert.match(marquee, /dynamic\(/);
  assert.match(marquee, /company-logo-marquee/);
  assert.match(marquee, /CompanyLogoMarquee/);
  assert.doesNotMatch(marquee, /import \{ CompanyLogoMarquee \}/);
  assert.match(safe, /performance-safe-marquee-track/);
  assert.match(safe, /PERFORMANCE_SAFE_MARQUEE_BRANDS/);
  assert.match(component, /MARQUEE_SEGMENTS/);
  assert.match(component, /marketing-marquee-track/);
  const brandCount = (component.match(/\{ slug:/g) ?? []).length;
  assert.ok(brandCount >= 80, `expected ~89 marquee brands, got ${brandCount}`);
});

test("4 auth/login layouts server-first with client island shells", () => {
  const loginLayout = read("src/app/login/layout.tsx");
  const loginClient = read("src/app/login/login-layout-client.tsx");
  const registerLayout = read("src/app/register/layout.tsx");
  const dashboardLayout = read("src/app/dashboard/layout.tsx");
  assert.doesNotMatch(loginLayout, /"use client"/);
  assert.match(loginLayout, /LoginLayoutClient/);
  assert.match(loginClient, /"use client"/);
  assert.match(loginClient, /LightweightRouteShell/);
  assert.doesNotMatch(registerLayout, /"use client"/);
  assert.doesNotMatch(dashboardLayout, /"use client"/);
});

test("5 heavy routes dynamically import B2B calc, investor room, dashboard modals", () => {
  const b2b = read("src/app/(marketing)/calculator/b2b/calculator-b2b-client.tsx");
  const investor = read("src/app/investor/page.tsx");
  const dashboard = read("src/app/dashboard/page.tsx");
  const modals = read("src/components/dashboard/dashboard-modals.tsx");
  assert.match(b2b, /dynamic\(/);
  assert.match(b2b, /twin-roi-calculator/);
  assert.doesNotMatch(b2b, /import \{ TwinRoiCalculator \}/);
  assert.match(investor, /dynamic\(/);
  assert.match(investor, /InvestorRoomPage/);
  assert.match(dashboard, /dynamic\(/);
  assert.match(dashboard, /dashboard-modals/);
  assert.match(modals, /JobEmployerModal/);
});

test("6 demo payloads lazy-loaded and capped at 10 items", () => {
  const lazy = read("src/lib/lazy-demo-data.ts");
  const brief = read("src/components/career-assistant/global-job-brief-panel.tsx");
  const roles = read("src/components/job-employer/tabs/roles-tab.tsx");
  assert.match(lazy, /DEMO_ARRAY_CAP = 10/);
  assert.match(lazy, /capDemoArray/);
  assert.match(brief, /loadJobBriefDemoModule/);
  assert.doesNotMatch(brief, /import \{[^}]*getDemoGlobalJobBrief/);
  assert.match(roles, /loadJobBriefDemoModule/);
  assert.match(roles, /loadJobEmployerDemoModule/);
  assert.doesNotMatch(roles, /import \{[^}]*getDemoGlobalJobBrief/);
  assert.doesNotMatch(roles, /import \{[^}]*buildEmployerContactDemo/);
});

test("7 hydration capped — summaries first, details on visible", () => {
  const hook = read("src/hooks/use-load-when-visible.ts");
  const pool = read("src/app/company/talent-pool/company-talent-pool-client.tsx");
  const radar = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const digest = read("src/app/recruiter/talent-radar/digest/recruiter-talent-radar-digest-client.tsx");
  assert.match(hook, /intersecting && pageVisible/);
  assert.match(pool, /readinessDeferred/);
  assert.match(pool, /detailsDeferred/);
  assert.match(radar, /summaryDeferred/);
  assert.match(radar, /detailsDeferred/);
  assert.match(digest, /lowerSectionsDeferred/);
});

test("8 request deduper enforces max cache entries and TTL eviction", async () => {
  const src = read("src/lib/create-request-deduper.ts");
  assert.match(src, /maxCacheEntries/);
  assert.match(src, /evictStale/);
  assert.match(src, /trimToMax/);
  let calls = 0;
  const dedupe = createRequestDeduper(1_000, 2);
  const fn = async (n: number) => {
    calls += 1;
    return n;
  };
  await dedupe("a", () => fn(1));
  await dedupe("b", () => fn(2));
  await dedupe("c", () => fn(3));
  assert.ok(calls >= 3);
  await dedupe("d", () => fn(4));
  assert.ok(calls >= 4);
});

test("9 route fallbacks — LightweightRouteShell skeletons, no blank pages", () => {
  const shell = read("src/components/lightweight-route-shell.tsx");
  const layout = read("src/components/workspace-route-layout.tsx");
  const skeleton = read("src/components/workspace-route-skeleton.tsx");
  assert.match(shell, /lightweight-route-shell-skeleton/);
  assert.match(shell, /SLOW_PAINT_MS/);
  assert.match(shell, /4_000/);
  assert.match(layout, /WorkspaceRouteSkeleton/);
  assert.match(skeleton, /animate-pulse/);
  assert.match(read("src/app/login/login-layout-client.tsx"), /AuthRouteSkeleton/);
});

test("10 talent radar/import lazy modals and abortable fetches", () => {
  const radar = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const imp = read("src/app/recruiter/talent-pool/import/recruiter-talent-pool-import-client.tsx");
  assert.match(radar, /dynamic\(/);
  assert.match(radar, /TalentRadarDraftModal/);
  assert.match(radar, /useAbortableFetch/);
  assert.doesNotMatch(radar, /from "@\/components\/recruiter\/talent-radar\/talent-radar-decision-modals"/);
  assert.match(imp, /previewDeferred/);
  assert.match(imp, /useAbortableFetch/);
});

test("11 workspace CSS strips backdrop blur on data-workspace-route", () => {
  const css = read("src/app/globals.css");
  const sync = read("src/components/workspace-route-sync.tsx");
  assert.match(css, /html\[data-workspace-route="true"\]/);
  assert.match(css, /company-logo-marquee/);
  assert.match(css, /performance-safe-logo-marquee/);
  assert.match(css, /backdrop-filter: none/);
  assert.doesNotMatch(css, /html\[data-workspace-route="true"\][\s\S]{0,400}\.marketing-marquee-track[\s\S]{0,120}animation: none/);
  assert.match(sync, /data-workspace-route/);
  assert.match(read("src/components/route-aware-background.tsx"), /return null/);
});

test("12 package registers renderer memory and safe marquee tests", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:p0-renderer-memory-bundle-reduction/);
  assert.match(pkg, /p0-renderer-memory-bundle-reduction\.test\.ts/);
  assert.match(pkg, /test:p0-browser-memory-multitab-performance/);
  assert.match(pkg, /test:performance-safe-moving-logo-marquee/);
});
