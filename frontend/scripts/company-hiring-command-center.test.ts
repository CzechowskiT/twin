/**
 * Company Hiring Command Center — route, demo data, and hard-ban guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getCompanyHiringCommandCenterDemo,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
} from "../src/lib/company-hiring-command-center-demo-data";
import {
  LAUNCH_STANCE,
  COMPANY_HIRING_COMMAND_CENTER_FORBIDDEN_PATTERNS,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS,
  COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS,
  COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  COMPANY_HIRING_COMMAND_CENTER_ROUTE,
  COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS,
  companyHiringCommandCenterHref,
  resolveCompanyHiringCommandCenter,
} from "../src/lib/company-hiring-command-center";
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

const WORKSPACE = "src/components/company/company-hiring-command-center-workspace.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 hiring-command-center route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/hiring-command-center/page.tsx")));
  assert.equal(COMPANY_HIRING_COMMAND_CENTER_ROUTE, "/company/hiring-command-center");
  assert.equal(companyHiringCommandCenterHref(), "/company/hiring-command-center");
});

test("2 demo IDs match hiring cockpit sample", () => {
  assert.equal(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "demo-candidate-001");
  assert.equal(COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID, "demo-role-001");
});

test("3 resolveCompanyHiringCommandCenter returns deterministic record", () => {
  const record = resolveCompanyHiringCommandCenter();
  assert.ok(record.pilot_labelled);
  assert.equal(getCompanyHiringCommandCenterDemo().candidate_id, COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID);
});

test("4 shortlist has 4 items", () => {
  assert.equal(getCompanyHiringCommandCenterDemo().shortlist.length, 4);
});

test("5 workspace renders all 9 section markers on inner divs", () => {
  const ws = read(WORKSPACE);
  assert.match(ws, new RegExp(COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER));
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.header/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.roleReadiness/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.shortlist/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.pendingFeedback/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.decisionBlockers/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.trustBoundaries/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.hiringTeamTasks/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.nextMeetingReadiness/);
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.boundaryPanel/);
  assert.doesNotMatch(ws, /<Card[^>]*data-testid/);
});

test("6 disabled action buttons present", () => {
  const ws = read(WORKSPACE);
  assert.match(ws, /company-hiring-command-center-action-\$\{action\.key\}-disabled/);
  assert.equal(COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS.length, 5);
  const keys = COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS.map((a) => a.key);
  assert.deepEqual(keys, ["approve", "reject", "request_interview", "message_recruiter", "export_share"]);
});

test("7 i18n EN and PL namespaces exist", () => {
  assert.ok(en.companyHiringCommandCenter.title);
  assert.ok(dictionaries.pl.companyHiringCommandCenter.title);
  assert.ok(en.companyHiringCommandCenter.boundaryPanelBody.includes("do not decide"));
  assert.ok(dictionaries.pl.companyHiringCommandCenter.boundaryPanelBody.includes("nie decydują"));
});

test("8 all locales expose companyHiringCommandCenter namespace", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].companyHiringCommandCenter;
    assert.ok(section.demoJourneyTitle.length > 3, locale);
    assert.ok(section.openCommandCenter.length > 3, locale);
  }
});

test("9 system-of-record hub registers company hiring command center", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_hiring_command_center");
  assert.ok(entry);
  assert.equal(entry?.href, "/company/hiring-command-center");
  assert.equal(entry?.persona, "company");
});

test("10 founder-led demo journey includes command center", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /companyHiringCommandCenterHref/);
  assert.match(routes, /id: "company_hiring_command_center"/);
});

test("11 executive product proof links to command center", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /companyHiringCommandCenterHref/);
  assert.match(proof, /id: "hiring_command_center"/);
});

test("12 launch stance remains NO-GO in boundary panel", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  const ws = read(WORKSPACE);
  assert.match(ws, /data-launch-stance=\{LAUNCH_STANCE\}/);
  assert.match(ws, /launchNoGoLine/);
  assert.match(ws, /p0OpenLine/);
  assert.match(ws, /phase3bBlockedLine/);
});

test("13 forbidden copy patterns absent from feature surfaces", () => {
  const blob = [read("src/lib/company-hiring-command-center-demo-data.ts"), read(WORKSPACE)].join("\n");
  for (const pattern of COMPANY_HIRING_COMMAND_CENTER_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(blob, pattern, `${pattern} in command center surfaces`);
  }
});

test("14 module links point to shipped company SOR routes", () => {
  assert.ok(COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS.length >= 10);
  for (const link of COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS) {
    assert.ok(link.href.startsWith("/company") || link.href.includes("demo-candidate-001"), link.id);
  }
});

test("15 shell/gate/fallback/layout files not modified", () => {
  const featurePaths = [
    "src/lib/company-hiring-command-center.ts",
    "src/lib/company-hiring-command-center-demo-data.ts",
    WORKSPACE,
    "src/app/company/hiring-command-center/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
});

test("16 docs file exists", () => {
  assert.ok(existsSync(join(root, "..", "docs/COMPANY_HIRING_COMMAND_CENTER_2026-06-19.md")));
});

test("17 package.json exposes test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:company-hiring-command-center/);
  assert.match(pkg, /test:company-hiring-command-center-browser/);
});

test("18 workspace nav exposes command center after hiring cockpit", () => {
  const nav = read("src/components/company/company-workspace-nav.tsx");
  assert.match(nav, /COMPANY_HIRING_COMMAND_CENTER_ROUTE/);
  const cockpitIdx = nav.indexOf("COMPANY_HIRING_COCKPIT_ROUTE");
  const centerIdx = nav.indexOf("COMPANY_HIRING_COMMAND_CENTER_ROUTE");
  assert.ok(cockpitIdx >= 0 && centerIdx > cockpitIdx);
  const module = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "hiring_command_center");
  assert.ok(module);
});
