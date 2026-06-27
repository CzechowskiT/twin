/**
 * System-of-record navigation hub — static route registry and hub wiring (13 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectSystemOfRecordHrefs,
  getSystemOfRecordRoutesForPersona,
  SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS,
  SYSTEM_OF_RECORD_HUB_MARKER,
  SYSTEM_OF_RECORD_ROUTES,
} from "../src/lib/system-of-record-routes";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";
import type { MarketingPersona } from "../src/lib/marketing-persona";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(root, "src/app");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function normalizeHref(href: string): string {
  const raw = href.split("#")[0]?.split("?")[0] ?? "/";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw || "/";
}

function routePageExists(pathname: string): boolean {
  const base = normalizeHref(pathname);
  if (!base.startsWith("/") || base.startsWith("mailto:")) return true;

  const routeGroupAliases: Record<string, string[]> = {
    "/demo": ["(marketing)/demo"],
  };
  const alias = routeGroupAliases[base];
  if (alias) {
    for (const segments of alias.map((a) => a.split("/"))) {
      if (existsSync(join(appRoot, ...segments, "page.tsx"))) return true;
    }
  }

  const segments = base.split("/").filter(Boolean);
  const direct = join(appRoot, ...segments, "page.tsx");
  if (existsSync(direct)) return true;

  const dynamicChecks: [string, string][] = [
    ["candidates", "[candidateId]"],
    ["roles", "[roleId]"],
    ["jobs", "[jobId]"],
  ];
  for (const [marker, param] of dynamicChecks) {
    const idx = segments.indexOf(marker);
    if (idx === -1) continue;
    const dynamicSegments = [...segments.slice(0, idx + 1), param, ...segments.slice(idx + 2)];
    if (existsSync(join(appRoot, ...dynamicSegments, "page.tsx"))) return true;
  }
  return false;
}

test("1 central registry exports routes for all four personas", () => {
  const personas: MarketingPersona[] = ["candidate", "recruiter", "company", "investor"];
  for (const persona of personas) {
    assert.ok(getSystemOfRecordRoutesForPersona(persona).length >= 8, persona);
  }
  assert.ok(SYSTEM_OF_RECORD_ROUTES.length >= 40);
});

test("2 candidate hub includes panel jobs matches career compass profile cv applications evidence calendar plan identity referrals", () => {
  const ids = getSystemOfRecordRoutesForPersona("candidate").map((r) => r.id);
  for (const id of [
    "candidate_panel",
    "candidate_jobs",
    "candidate_matches",
    "candidate_career_compass",
    "candidate_profile",
    "candidate_cv",
    "candidate_applications",
    "candidate_evidence",
    "candidate_calendar",
    "candidate_plan",
    "candidate_identity",
    "candidate_referrals",
  ]) {
    assert.ok(ids.includes(id), id);
  }
});

test("2b candidate career compass is pilot read-only — no live-action CTA", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_career_compass");
  assert.ok(route);
  assert.equal(route!.status, "pilot");
  assert.equal(route!.href, "/dashboard/career");
  assert.ok(route!.boundaryTags.includes("pilot"));
  assert.ok(route!.hintKey);
});

test("3 recruiter hub includes inbox pipeline calendar jobs demo talent radar pool import profile collaboration trust team communication ats integrations analytics search", () => {
  const ids = getSystemOfRecordRoutesForPersona("recruiter").map((r) => r.id);
  for (const id of [
    "recruiter_inbox",
    "recruiter_pipeline",
    "recruiter_calendar",
    "recruiter_jobs",
    "recruiter_demo_pipeline",
    "recruiter_talent_radar",
    "recruiter_talent_pool_import",
    "recruiter_demo_profile_360",
    "recruiter_demo_collaboration",
    "recruiter_ats_import_readiness",
    "recruiter_search",
  ]) {
    assert.ok(ids.includes(id), id);
  }
});

test("3b recruiter pipeline live with human decision and no ATS sync", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_pipeline");
  assert.ok(route);
  assert.equal(route!.status, "live");
  assert.equal(route!.href, "/recruiter/pipeline");
  assert.ok(route!.boundaryTags.includes("human_decision_required"));
  assert.ok(route!.boundaryTags.includes("no_ats_sync"));
});

test("3c recruiter calendar not_live — calendar sync not live", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_calendar");
  assert.ok(route);
  assert.equal(route!.status, "not_live");
  assert.equal(route!.href, "/recruiter/calendar");
  assert.ok(route!.boundaryTags.includes("not_live"));
  assert.ok(route!.hintKey);
  const hint = en.workspaceModules.recruiterCalendarHint.toLowerCase();
  assert.match(hint, /inbox|sync|not live|nie aktywn/i);
});

test("4 company hub includes dashboard roles pipeline demo talent pool profile collaboration trust team communication ats integrations team billing", () => {
  const ids = getSystemOfRecordRoutesForPersona("company").map((r) => r.id);
  for (const id of [
    "company_dashboard",
    "company_roles",
    "company_pipeline",
    "company_demo_pipeline",
    "company_talent_pool",
    "company_demo_profile_360",
    "company_ats_import_readiness",
    "company_billing",
  ]) {
    assert.ok(ids.includes(id), id);
  }
});

test("4b company pipeline live with token hint and human decision boundary", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_pipeline");
  assert.ok(route);
  assert.equal(route!.status, "live");
  assert.equal(route!.href, "/company/pipeline");
  assert.ok(route!.hintKey);
  assert.ok(route!.boundaryTags.includes("human_decision_required"));
  assert.ok(route!.boundaryTags.includes("no_ats_sync"));
  const hint = en.workspaceModules.companyPipelineHint.toLowerCase();
  assert.match(hint, /token|pilot|human|decision|review/i);
});

test("4c company dashboard live with tenant token hint", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_dashboard");
  assert.ok(route);
  assert.equal(route!.status, "live");
  assert.ok(route!.hintKey);
  const hint = en.systemOfRecord.companyDashboardHint.toLowerCase();
  assert.match(hint, /token|pilot|slug|tenant|scope/i);
});

test("4d all company live SoR entries carry token or scope hints", () => {
  const live = getSystemOfRecordRoutesForPersona("company").filter((r) => r.status === "live");
  assert.ok(live.length >= 3);
  for (const route of live) {
    assert.ok(route.hintKey, `${route.id} missing hintKey`);
  }
});

test("5 investor hub includes public room workspace metrics roadmap data room calculator placement demo and proof cards", () => {
  const ids = getSystemOfRecordRoutesForPersona("investor").map((r) => r.id);
  for (const id of [
    "investor_public_room",
    "investor_workspace_hub",
    "investor_metrics",
    "investor_demo",
    "investor_sor_proof_pipeline",
    "investor_sor_proof_collaboration",
    "investor_sor_proof_ats",
  ]) {
    assert.ok(ids.includes(id), id);
  }
});

test("6 all registry hrefs resolve to existing app routes", () => {
  for (const href of collectSystemOfRecordHrefs()) {
    assert.ok(routePageExists(href), `missing page: ${href}`);
  }
});

test("7 boundary tags map to i18n label keys for all locales", () => {
  const tags = Object.keys(SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS) as (keyof typeof SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS)[];
  for (const locale of LOCALES) {
    for (const tag of tags) {
      const key = SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS[tag];
      const val = key.split(".").reduce<unknown>((acc, part) => {
        if (acc && typeof acc === "object" && part in acc) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, dictionaries[locale]);
      assert.ok(typeof val === "string" && val.length > 0, `${locale} ${key}`);
    }
  }
});

test("8 SystemOfRecordModuleCard uses Link — no inert navigation buttons", () => {
  const card = read("src/components/workspace/system-of-record-module-card.tsx");
  assert.match(card, /<Link/);
  assert.match(card, /data-sor-module/);
  assert.doesNotMatch(card, /<button[^>]*>[\s\S]*systemOfRecord/);
});

test("9 hub pages wire SystemOfRecordNavigationHub for all personas", () => {
  assert.match(read("src/components/dashboard/candidate-module-nav.tsx"), /SystemOfRecordNavigationHub/);
  assert.match(read("src/app/recruiter/page.tsx"), /SystemOfRecordNavigationHub/);
  assert.match(read("src/app/company/dashboard/company-dashboard-client.tsx"), /SystemOfRecordNavigationHub/);
  assert.match(read("src/app/workspace/investor/page.tsx"), /SystemOfRecordNavigationHub/);
  assert.match(read("src/components/investor/investor-room-page.tsx"), /SystemOfRecordNavigationHub/);
});

test("10 hard-ban shell gate layout files were not modified by this feature", () => {
  for (const rel of FORBIDDEN_SHELL_FILES) {
    const src = read(rel);
    assert.doesNotMatch(src, /system-of-record-navigation-hub|SystemOfRecordNavigationHub/);
    assert.doesNotMatch(src, /system-of-record-routes/);
  }
});

test("11 pilot and not-live modules carry explicit boundary or status badges", () => {
  const pilot = SYSTEM_OF_RECORD_ROUTES.filter((r) => r.status === "pilot" || r.status === "not_live");
  assert.ok(pilot.length >= 10);
  for (const route of pilot) {
    assert.ok(route.boundaryTags.length >= 1 || route.status === "not_live");
  }
  assert.match(read("src/components/workspace/system-of-record-boundary-badge.tsx"), /data-sor-boundary/);
});

test("12 registry avoids hidden PII field patterns", () => {
  const blob = JSON.stringify(SYSTEM_OF_RECORD_ROUTES);
  assert.doesNotMatch(blob, /candidate_email|recruiter_email|password|ssn/i);
});

test("13 hub marker constant matches navigation hub test id", () => {
  assert.equal(SYSTEM_OF_RECORD_HUB_MARKER, "system-of-record-navigation-hub");
  assert.match(read("src/components/workspace/system-of-record-navigation-hub.tsx"), /data-testid=\{SYSTEM_OF_RECORD_HUB_MARKER\}/);
  const copy = [
    en.systemOfRecord.boundaryNoOutreach,
    en.systemOfRecord.boundaryNoAtsSync,
    en.systemOfRecord.recruiterHubLead,
  ].join("\n");
  assert.match(copy.toLowerCase(), /outreach|ats|sync/);
});
