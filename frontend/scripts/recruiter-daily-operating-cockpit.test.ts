/**
 * Recruiter Daily Operating Cockpit — route, demo data, and hard-ban guards (23 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getRecruiterDailyCockpitDemo,
  RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
} from "../src/lib/recruiter-daily-operating-cockpit-demo-data";
import {
  LAUNCH_STANCE,
  RECRUITER_DAILY_COCKPIT_FORBIDDEN_PATTERNS,
  RECRUITER_DAILY_COCKPIT_MARKERS,
  RECRUITER_DAILY_COCKPIT_MODULE_LINKS,
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  RECRUITER_DAILY_COCKPIT_ROUTE,
  getRecruiterDailyCockpitRecord,
  recruiterDailyCockpitHref,
  resolveRecruiterDailyCockpit,
} from "../src/lib/recruiter-daily-operating-cockpit";
import { RECRUITER_ANALYTICS_ROUTE } from "../src/lib/recruiter-analytics";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const COCKPIT_COMPONENT = "src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 daily-cockpit route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/daily-cockpit/page.tsx")));
});

test("2 route constant and href helper resolve to /recruiter/daily-cockpit", () => {
  assert.equal(RECRUITER_DAILY_COCKPIT_ROUTE, "/recruiter/daily-cockpit");
  assert.equal(recruiterDailyCockpitHref(), "/recruiter/daily-cockpit");
});

test("3 demo IDs are demo-candidate-001 demo-role-001 lever-mapping-pilot", () => {
  assert.equal(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "demo-candidate-001");
  assert.equal(RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID, "demo-role-001");
  assert.equal(RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID, "lever-mapping-pilot");
});

test("4 resolveRecruiterDailyCockpit returns deterministic pilot record", () => {
  const record = resolveRecruiterDailyCockpit();
  assert.ok(record.pilot_labelled);
  assert.equal(record.candidate_id, RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID);
  assert.equal(getRecruiterDailyCockpitRecord().role_id, RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID);
  assert.equal(getRecruiterDailyCockpitDemo().ats_connector_id, "lever-mapping-pilot");
});

test("5 priority worklist has 6-8 items", () => {
  const count = getRecruiterDailyCockpitDemo().priority_worklist.length;
  assert.ok(count >= 6 && count <= 8, `expected 6-8, got ${count}`);
});

test("6 cockpit renders all section markers", () => {
  const cockpit = read(COCKPIT_COMPONENT);
  assert.match(cockpit, new RegExp(RECRUITER_DAILY_COCKPIT_PAGE_MARKER));
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.header/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.priorityWorklist/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.decisionQueue/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.trustConsentQueue/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.feedbackScorecardQueue/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.commDraftsQueue/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.atsImportQueue/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.pipelineChanges/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.dailyChecklist/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.humanBoundary/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.moduleLinks/);
});

test("7 header includes badges and module quick links", () => {
  const cockpit = read(COCKPIT_COMPONENT);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MARKERS\.pilotBadge/);
  assert.match(cockpit, /data-launch-stance=\{LAUNCH_STANCE\}/);
  assert.match(cockpit, /RECRUITER_DAILY_COCKPIT_MODULE_LINKS/);
  assert.ok(RECRUITER_DAILY_COCKPIT_MODULE_LINKS.length >= 8);
});

test("8 i18n keys exist for recruiterDailyCockpit EN", () => {
  assert.ok(en.recruiterDailyCockpit.pageEyebrow.length > 3);
  assert.ok(en.recruiterDailyCockpit.humanBoundaryBody.includes("do not decide"));
  assert.ok(en.recruiterDailyCockpit.commDraftsLead.includes("draft"));
});

test("9 i18n keys exist for recruiterDailyCockpit PL", () => {
  const pl = dictionaries.pl.recruiterDailyCockpit;
  assert.ok(pl.title.length > 3);
  assert.ok(pl.humanBoundaryBody.includes("nie decydują"));
  assert.ok(pl.openDailyCockpit.length > 3);
});

test("10 all locales expose recruiterDailyCockpit namespace", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].recruiterDailyCockpit;
    assert.ok(section.demoJourneyTitle.length > 3, locale);
    assert.ok(section.linkDecisionMemory.length > 3, locale);
  }
});

test("11 system-of-record hub registers recruiter daily cockpit route", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_daily_cockpit");
  assert.ok(entry);
  assert.equal(entry?.href, "/recruiter/daily-cockpit");
  assert.equal(entry?.persona, "recruiter");
});

test("12 founder-led demo journey includes daily cockpit step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /recruiterDailyCockpitHref/);
  assert.match(routes, /id: "daily_cockpit"/);
  assert.match(routes, /\/recruiter\/daily-cockpit/);
});

test("13 executive product proof links to daily cockpit", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /recruiterDailyCockpitHref/);
  assert.match(proof, /id: "daily_cockpit"/);
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS/);
});

test("14 recruiter hub quick action links to daily cockpit", () => {
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /recruiterDailyCockpitHref/);
  assert.match(hub, /recruiterDailyCockpit\.openDailyCockpit/);
});

test("15 launch stance remains NO-GO in cockpit boundary", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  const workspace = read(COCKPIT_COMPONENT);
  assert.match(workspace, /data-launch-stance=\{LAUNCH_STANCE\}/);
  const checklist = JSON.stringify(getRecruiterDailyCockpitDemo().daily_checklist);
  assert.match(checklist, /NO-GO/);
});

test("16 demo data does not depend on unmerged domain kernel", () => {
  const demo = read("src/lib/recruiter-daily-operating-cockpit-demo-data.ts");
  const lib = read("src/lib/recruiter-daily-operating-cockpit.ts");
  assert.doesNotMatch(demo, /system-of-record-domain/);
  assert.doesNotMatch(lib, /system-of-record-domain/);
});

test("17 cockpit copy avoids forbidden outreach/compliance claims", () => {
  const blob = [
    read("src/lib/recruiter-daily-operating-cockpit-demo-data.ts"),
    read(COCKPIT_COMPONENT),
  ].join("\n");
  for (const pattern of RECRUITER_DAILY_COCKPIT_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `${pattern} in daily cockpit surfaces`);
  }
});

test("18 module links point to shipped SOR routes", () => {
  for (const link of RECRUITER_DAILY_COCKPIT_MODULE_LINKS) {
    assert.ok(link.href.startsWith("/recruiter"), link.id);
    const valid =
      link.href === "/recruiter" ||
      link.href.includes("demo-candidate-001") ||
      link.href.includes("demo-role-001") ||
      link.href.includes("integrations");
    assert.ok(valid, link.id);
  }
});

test("19 ATS import queue references lever-mapping-pilot connector", () => {
  const queue = getRecruiterDailyCockpitDemo().ats_import_queue;
  assert.ok(queue.some((row) => row.connector === "lever-mapping-pilot"));
});

test("20 shell/gate/fallback/layout files not modified by daily cockpit feature", () => {
  const featurePaths = [
    "src/lib/recruiter-daily-operating-cockpit.ts",
    "src/lib/recruiter-daily-operating-cockpit-demo-data.ts",
    COCKPIT_COMPONENT,
    "src/app/recruiter/daily-cockpit/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("21 docs file exists for recruiter daily operating cockpit", () => {
  assert.ok(existsSync(join(root, "..", "docs/RECRUITER_DAILY_OPERATING_COCKPIT_2026-06-17.md")));
});

test("22 package.json exposes daily cockpit test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:recruiter-daily-operating-cockpit/);
  assert.match(pkg, /test:recruiter-daily-operating-cockpit-browser/);
});

test("23 comm drafts queue is draft-only — no sent language in demo summaries", () => {
  const drafts = getRecruiterDailyCockpitDemo().comm_drafts_review;
  assert.ok(drafts.length >= 2);
  for (const row of drafts) {
    assert.doesNotMatch(row.summary, /sent|outbound live|sync completed/i);
    assert.match(row.summary.toLowerCase(), /draft|copy-only|no outbound|approved/);
  }
});

test("24 workspace nav exposes daily cockpit before analytics", () => {
  const nav = read("src/components/recruiter/recruiter-workspace-nav.tsx");
  assert.match(nav, /\/recruiter\/daily-cockpit/);
  assert.match(nav, /recruiterDailyCockpit\.navLink/);
  assert.match(nav, /\/recruiter\/analytics/);
  const dailyIdx = nav.indexOf("/recruiter/daily-cockpit");
  const analyticsIdx = nav.indexOf("/recruiter/analytics");
  assert.ok(dailyIdx >= 0 && analyticsIdx >= 0 && dailyIdx < analyticsIdx);
});

test("25 daily-cockpit route is not analytics placeholder page", () => {
  const page = read("src/app/recruiter/daily-cockpit/page.tsx");
  const analyticsPage = read("src/app/recruiter/analytics/page.tsx");
  assert.match(page, /RecruiterDailyOperatingCockpitWorkspace/);
  assert.doesNotMatch(page, /RecruiterAnalyticsClient/);
  assert.match(analyticsPage, /RecruiterAnalyticsClient/);
  assert.doesNotMatch(analyticsPage, /RecruiterDailyOperatingCockpitWorkspace/);
});

test("26 recruiter hub promo card links to daily cockpit", () => {
  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /RECRUITER_DAILY_COCKPIT_MARKERS\.hubPromo/);
  assert.match(hub, /recruiterDailyCockpitHref/);
});

test("27 analytics placeholder markers stay on analytics route only", () => {
  const analytics = read("src/app/recruiter/analytics/recruiter-analytics-client.tsx");
  const cockpit = read(COCKPIT_COMPONENT);
  assert.match(analytics, /RECRUITER_ANALYTICS_MARKERS\.loadButton/);
  assert.match(analytics, /RECRUITER_ANALYTICS_PAGE_MARKER/);
  assert.doesNotMatch(cockpit, /RECRUITER_ANALYTICS_MARKERS\.loadButton/);
  assert.equal(RECRUITER_ANALYTICS_ROUTE, "/recruiter/analytics");
});

test("28 workspace modules register daily cockpit separately from analytics", () => {
  const daily = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "daily_cockpit");
  const analytics = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "analytics");
  assert.ok(daily);
  assert.ok(analytics);
  assert.equal(daily?.href, RECRUITER_DAILY_COCKPIT_ROUTE);
  assert.equal(analytics?.href, RECRUITER_ANALYTICS_ROUTE);
});
