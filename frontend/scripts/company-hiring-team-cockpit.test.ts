/**
 * Company Hiring Team Cockpit — route, demo data, and hard-ban guards (24 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getCompanyHiringCockpitDemo,
  COMPANY_HIRING_COCKPIT_DEMO_ATS_ID,
  COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
} from "../src/lib/company-hiring-cockpit-demo-data";
import {
  LAUNCH_STANCE,
  COMPANY_HIRING_COCKPIT_FORBIDDEN_PATTERNS,
  COMPANY_HIRING_COCKPIT_MARKERS,
  COMPANY_HIRING_COCKPIT_MODULE_LINKS,
  COMPANY_HIRING_COCKPIT_PAGE_MARKER,
  COMPANY_HIRING_COCKPIT_ROUTE,
  getCompanyHiringCockpitRecord,
  companyHiringCockpitHref,
  resolveCompanyHiringCockpit,
} from "../src/lib/company-hiring-cockpit";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const COCKPIT_COMPONENT = "src/components/company/company-hiring-team-cockpit-workspace.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 hiring-cockpit route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/hiring-cockpit/page.tsx")));
});

test("2 route constant and href helper resolve to /company/hiring-cockpit", () => {
  assert.equal(COMPANY_HIRING_COCKPIT_ROUTE, "/company/hiring-cockpit");
  assert.equal(companyHiringCockpitHref(), "/company/hiring-cockpit");
});

test("3 demo IDs are demo-candidate-001 demo-role-001 lever-mapping-pilot", () => {
  assert.equal(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID, "demo-candidate-001");
  assert.equal(COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID, "demo-role-001");
  assert.equal(COMPANY_HIRING_COCKPIT_DEMO_ATS_ID, "lever-mapping-pilot");
});

test("4 resolveCompanyHiringCockpit returns deterministic pilot record", () => {
  const record = resolveCompanyHiringCockpit();
  assert.ok(record.pilot_labelled);
  assert.equal(record.candidate_id, COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID);
  assert.equal(getCompanyHiringCockpitRecord().role_id, COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID);
  assert.equal(getCompanyHiringCockpitDemo().ats_connector_id, "lever-mapping-pilot");
});

test("5 candidate shortlist has 4-6 items", () => {
  const count = getCompanyHiringCockpitDemo().candidate_shortlist.length;
  assert.ok(count >= 4 && count <= 6, `expected 4-6, got ${count}`);
});

test("6 cockpit renders all 11 section markers", () => {
  const cockpit = read(COCKPIT_COMPONENT);
  assert.match(cockpit, new RegExp(COMPANY_HIRING_COCKPIT_PAGE_MARKER));
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.header/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.openRoles/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.candidateShortlist/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.pendingFeedback/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.scorecardsReview/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.trustConsentWarnings/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.teamAssignments/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.communicationDrafts/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.pipelineOverview/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.decisionChecklist/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.humanBoundary/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.moduleLinks/);
});

test("7 header includes badges and module quick links", () => {
  const cockpit = read(COCKPIT_COMPONENT);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MARKERS\.pilotBadge/);
  assert.match(cockpit, /data-launch-stance=\{LAUNCH_STANCE\}/);
  assert.match(cockpit, /COMPANY_HIRING_COCKPIT_MODULE_LINKS/);
  assert.ok(COMPANY_HIRING_COCKPIT_MODULE_LINKS.length >= 9);
});

test("8 i18n keys exist for companyHiringCockpit EN", () => {
  assert.ok(en.companyHiringCockpit.pageEyebrow.length > 3);
  assert.ok(en.companyHiringCockpit.humanBoundaryBody.includes("do not decide"));
  assert.ok(en.companyHiringCockpit.commDraftsLead.includes("draft"));
});

test("9 i18n keys exist for companyHiringCockpit PL", () => {
  const pl = dictionaries.pl.companyHiringCockpit;
  assert.ok(pl.title.length > 3);
  assert.ok(pl.humanBoundaryBody.includes("nie decydują"));
  assert.ok(pl.openHiringCockpit.length > 3);
});

test("10 all locales expose companyHiringCockpit namespace", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].companyHiringCockpit;
    assert.ok(section.demoJourneyTitle.length > 3, locale);
    assert.ok(section.linkDecisionMemory.length > 3, locale);
  }
});

test("11 system-of-record hub registers company hiring cockpit route", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_hiring_cockpit");
  assert.ok(entry);
  assert.equal(entry?.href, "/company/hiring-cockpit");
  assert.equal(entry?.persona, "company");
});

test("12 founder-led demo journey includes company hiring cockpit step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /companyHiringCockpitHref/);
  assert.match(routes, /id: "company_hiring_cockpit"/);
  assert.match(routes, /\/company\/hiring-cockpit/);
});

test("13 executive product proof links to hiring cockpit", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /companyHiringCockpitHref/);
  assert.match(proof, /id: "hiring_cockpit"/);
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS/);
});

test("14 company dashboard promo links to hiring cockpit", () => {
  const dashboard = read("src/app/company/dashboard/company-dashboard-client.tsx");
  assert.match(dashboard, /companyHiringCockpitHref/);
  assert.match(dashboard, /companyHiringCockpit\.openHiringCockpit/);
  assert.match(dashboard, /COMPANY_HIRING_COCKPIT_MARKERS\.hubPromo/);
});

test("15 launch stance remains NO-GO in cockpit boundary", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  const workspace = read(COCKPIT_COMPONENT);
  assert.match(workspace, /data-launch-stance=\{LAUNCH_STANCE\}/);
  const checklist = JSON.stringify(getCompanyHiringCockpitDemo().decision_checklist);
  assert.match(checklist, /NO-GO/);
});

test("16 demo data does not depend on unmerged domain kernel", () => {
  const demo = read("src/lib/company-hiring-cockpit-demo-data.ts");
  const lib = read("src/lib/company-hiring-cockpit.ts");
  assert.doesNotMatch(demo, /system-of-record-domain/);
  assert.doesNotMatch(lib, /system-of-record-domain/);
});

test("17 cockpit copy avoids forbidden outreach/compliance claims", () => {
  const blob = [
    read("src/lib/company-hiring-cockpit-demo-data.ts"),
    read(COCKPIT_COMPONENT),
  ].join("\n");
  for (const pattern of COMPANY_HIRING_COCKPIT_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `${pattern} in hiring cockpit surfaces`);
  }
});

test("18 module links point to shipped company SOR routes", () => {
  for (const link of COMPANY_HIRING_COCKPIT_MODULE_LINKS) {
    assert.ok(link.href.startsWith("/company"), link.id);
    const valid =
      link.href === "/company/dashboard" ||
      link.href === "/company/roles" ||
      link.href.includes("demo-candidate-001") ||
      link.href.includes("demo-role-001") ||
      link.href.includes("integrations");
    assert.ok(valid, link.id);
  }
});

test("19 open roles include demo-role-001", () => {
  const roles = getCompanyHiringCockpitDemo().open_roles;
  assert.ok(roles.some((row) => row.role_id === "demo-role-001"));
});

test("20 shell/gate/fallback/layout files not modified by hiring cockpit feature", () => {
  const featurePaths = [
    "src/lib/company-hiring-cockpit.ts",
    "src/lib/company-hiring-cockpit-demo-data.ts",
    COCKPIT_COMPONENT,
    "src/app/company/hiring-cockpit/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("21 docs file exists for company hiring team cockpit", () => {
  assert.ok(existsSync(join(root, "..", "docs/COMPANY_HIRING_TEAM_COCKPIT_2026-06-17.md")));
});

test("22 package.json exposes hiring cockpit test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:company-hiring-team-cockpit/);
  assert.match(pkg, /test:company-hiring-team-cockpit-browser/);
});

test("23 comm drafts queue is draft-only — no sent language in demo summaries", () => {
  const drafts = getCompanyHiringCockpitDemo().communication_drafts;
  assert.ok(drafts.length >= 2);
  for (const row of drafts) {
    assert.doesNotMatch(row.summary, /sent|outbound live|sync completed/i);
    assert.match(row.summary.toLowerCase(), /draft|copy-only|no outbound|approved/);
  }
});

test("24 workspace nav exposes hiring cockpit after dashboard", () => {
  const nav = read("src/components/company/company-workspace-nav.tsx");
  assert.match(nav, /COMPANY_HIRING_COCKPIT_ROUTE/);
  assert.match(nav, /"companyHiringCockpit"/);
  assert.match(nav, /COMPANY_HIRING_ROUTE/);
  const cockpitIdx = nav.indexOf("COMPANY_HIRING_COCKPIT_ROUTE");
  const dashboardIdx = nav.indexOf("COMPANY_HIRING_ROUTE");
  assert.ok(cockpitIdx >= 0 && dashboardIdx >= 0 && dashboardIdx < cockpitIdx);
  const module = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "hiring_cockpit");
  assert.ok(module);
  assert.equal(module?.href, COMPANY_HIRING_COCKPIT_ROUTE);
});
