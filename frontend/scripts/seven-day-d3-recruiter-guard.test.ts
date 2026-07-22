/**
 * Seven-day D3 recruiter slice — hub nav, analytics preview, integrations roadmap, pilot boundaries.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import {
  COLLAPSE_RECRUITER_DEMO_JOURNEYS,
  HIDE_RECRUITER_CALENDAR_FROM_NAV,
  HIDE_RECRUITER_INTEGRATIONS_FROM_NAV,
  INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC,
  RECRUITER_ANALYTICS_SHIP_STATUS,
  RECRUITER_INTEGRATIONS_ROADMAP_STATUS,
  RECRUITER_PRIMARY_NAV_HREFS,
  RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT,
  SHOW_RECRUITER_HUB_PRIMARY_PROMOS,
  SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED,
  TALENT_POOL_LIMITED_PILOT,
  TALENT_RADAR_LIMITED_PILOT,
} from "../src/lib/seven-day-d3-recruiter";
import {
  deriveRecruiterAnalyticsSummary,
} from "../src/lib/recruiter-analytics";
import { RECRUITER_INTEGRATION_ROWS } from "../src/lib/recruiter-integrations-readiness";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const D3_DOC = "docs/SEVEN_DAY_D3_RECRUITER_EXECUTION_2026-07-08.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function moduleStatus(id: string) {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === id);
  assert.ok(mod, `missing module ${id}`);
  return mod!.status;
}

test("1 D3 execution doc exists with stance footer", () => {
  const doc = readRepo(D3_DOC);
  assert.match(doc, /Seven-day D3/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
  assert.match(doc, /NOT Launch GO/);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
});

test("2 seven-day-d3 flags — analytics live, integrations roadmap, collapsed nav", () => {
  assert.equal(RECRUITER_ANALYTICS_SHIP_STATUS, "live");
  assert.equal(RECRUITER_INTEGRATIONS_ROADMAP_STATUS, "coming_soon");
  assert.equal(HIDE_RECRUITER_CALENDAR_FROM_NAV, true);
  assert.equal(HIDE_RECRUITER_INTEGRATIONS_FROM_NAV, true);
  assert.equal(RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT, true);
  assert.equal(COLLAPSE_RECRUITER_DEMO_JOURNEYS, true);
  assert.equal(TALENT_RADAR_LIMITED_PILOT, true);
  assert.equal(TALENT_POOL_LIMITED_PILOT, true);
  assert.equal(INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC, true);
  assert.equal(SHOW_RECRUITER_HUB_PRIMARY_PROMOS, false);
  assert.equal(SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED, false);
  assert.equal(RECRUITER_PRIMARY_NAV_HREFS.length, 5);
});

test("3 workspace modules — analytics live, integrations coming soon, calendar not live", () => {
  assert.equal(moduleStatus("analytics"), "live");
  assert.equal(moduleStatus("integrations"), "coming_soon");
  assert.equal(moduleStatus("calendar"), "not_live");
  assert.equal(moduleStatus("inbox"), "live");
  assert.equal(moduleStatus("pipeline"), "live");
  assert.equal(moduleStatus("jobs"), "live");
  assert.equal(moduleStatus("search"), "live");
});

test("4 product surface — green-only primary five; non-green hidden", () => {
  const split = splitWorkspaceModules("recruiter", RECRUITER_WORKSPACE_MODULES);
  assert.ok(split.primary.some((m) => m.id === "inbox"));
  assert.ok(split.primary.some((m) => m.id === "analytics"));
  assert.equal(split.primary.filter((m) => m.status === "live").length, 5);
  assert.equal(split.roadmap.length, 0);
  assert.ok(split.hidden.some((m) => m.id === "calendar"));
  assert.ok(split.hidden.some((m) => m.id === "integrations"));
  assert.equal(shouldHideFromDefaultHub("recruiter", "calendar"), true);
  assert.equal(shouldHideFromDefaultHub("recruiter", "analytics"), false);
  assert.equal(classifyProductSurfaceTier("recruiter", "analytics"), "LIVE");
  assert.equal(classifyProductSurfaceTier("recruiter", "integrations", "coming_soon"), "INTERNAL");
});

test("5 recruiter workspace nav — primary four, calendar hidden, collapsed extended", () => {
  const nav = read("src/components/recruiter/recruiter-workspace-nav.tsx");
  assert.match(nav, /RECRUITER_PRIMARY_NAV_HREFS/);
  assert.match(nav, /RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT/);
  assert.match(nav, /HIDE_RECRUITER_CALENDAR_FROM_NAV/);
  assert.match(nav, /HIDE_RECRUITER_INTEGRATIONS_FROM_NAV/);
  assert.match(nav, /data-recruiter-nav-primary/);
  const extendedBlock = nav.split("const EXTENDED_TABS")[1]?.split("function isPrimaryHref")[0] ?? "";
  assert.doesNotMatch(extendedBlock, /\/recruiter\/integrations/);
  assert.match(nav, /data-recruiter-nav-extended-toggle/);
  assert.match(nav, /data-recruiter-nav-extended-toggle/);
  const primaryBlock = nav.split("const EXTENDED_TABS")[0] ?? nav;
  assert.doesNotMatch(primaryBlock, /\/recruiter\/calendar/);
});

test("6 recruiter hub — green quick actions include analytics, roadmap promos off", () => {
  const page = read("src/app/recruiter/page.tsx");
  assert.match(page, /\/recruiter\/analytics/);
  assert.equal(SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED, false);
});

test("7 analytics — live badge, summary metrics, BE proxy + FE derive", () => {
  const client = read("src/app/recruiter/analytics/recruiter-analytics-client.tsx");
  assert.match(client, /RECRUITER_ANALYTICS_SHIP_STATUS/);
  assert.match(client, /data-seven-day-recruiter-analytics-summary/);
  assert.match(client, /deriveRecruiterAnalyticsSummary/);
  assert.match(client, /\/api\/recruiter\/analytics/);
  assert.match(client, /\/api\/recruiter\/jobs/);
  assert.match(en.recruiterAnalytics.metricActiveRoles ?? "", /Active roles/i);
  assert.match(en.recruiterAnalytics.dataSourceNote ?? "", /read-only workspace API/i);

  const summary = deriveRecruiterAnalyticsSummary(
    {
      company_slug: "nova-hiring-pl",
      source: "workspace",
      generated_at: "2026-07-08T00:00:00Z",
      window_days: 7,
      applications_total: 4,
      applications_by_status: { applied: 2, shortlisted: 2 },
      audit_events_total: 3,
      audit_decisions: 1,
      audit_reviews_opened: 2,
      calendar_sync_live: false,
      readiness: { public_launch: false, analytics_export: false },
    },
    2,
  );
  assert.equal(summary.activeRoles, 2);
  assert.equal(summary.shortlistReady, 2);
  assert.equal(summary.candidatesReviewed, 2);
});

test("8 integrations — coming soon roadmap, no live ATS sync rows", () => {
  const client = read("src/app/recruiter/integrations/recruiter-integrations-client.tsx");
  assert.match(client, /RECRUITER_INTEGRATIONS_ROADMAP_STATUS/);
  assert.match(client, /data-seven-day-integrations-roadmap-boundary/);
  assert.match(en.recruiterIntegrations.roadmapBoundary ?? "", /Coming soon/i);
  assert.match(en.recruiterIntegrations.roadmapBoundary ?? "", /No live ATS sync|does not sync/i);
  const ats = RECRUITER_INTEGRATION_ROWS.find((r) => r.id === "ats_oauth");
  assert.equal(ats?.status, "planned");
  const calendar = RECRUITER_INTEGRATION_ROWS.find((r) => r.id === "calendar_sync");
  assert.equal(calendar?.status, "not_live");
});

test("9 jobs page — demo journey CTAs removed from product UI", () => {
  const page = read("src/app/recruiter/jobs/page.tsx");
  assert.doesNotMatch(page, /demo-role-001/);
  assert.doesNotMatch(page, /COLLAPSE_RECRUITER_DEMO_JOURNEYS/);
  assert.doesNotMatch(page, /DemoJourneyPilotStatus/);
  assert.doesNotMatch(page, /data-seven-day-recruiter-demo-journeys-collapsed/);
  assert.match(page, /\/recruiter\/pipeline/);
});

test("10 talent radar and pool — limited pilot boundaries", () => {
  const radar = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  assert.match(radar, /data-seven-day-talent-radar-pilot-boundary/);
  assert.match(en.recruiterTalentRadar.pilotBoundaryBody ?? "", /No external sourcing/i);
  assert.match(dictionaries.pl.recruiterTalentRadar.pilotBoundaryBody ?? "", /Bez zewnętrznego sourcingu/i);

  const pool = read("src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx");
  assert.match(pool, /data-seven-day-talent-pool-pilot-boundary/);
  assert.match(en.recruiterTalentPool.pilotBoundaryBody ?? "", /No live ATS sync/i);
});

test("11 calendar — hidden from nav, roadmap marker on page", () => {
  const calendar = read("src/app/recruiter/calendar/page.tsx");
  assert.match(calendar, /data-seven-day-recruiter-calendar-roadmap/);
  assert.match(en.recruiterCalendar.notLiveTitle ?? "", /./);
});

test("12 npm script test:seven-day-d3-recruiter-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:seven-day-d3-recruiter-guard":/);
  assert.match(pkg, /seven-day-d3-recruiter-guard\.test\.ts/);
});
