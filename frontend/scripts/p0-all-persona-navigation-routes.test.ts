/**
 * P0 all-persona navigation — static route inventory and href guards (15 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { en } from "../src/lib/i18n";
import { loginPathWithNext } from "../src/lib/login-redirect";
import type { MarketingPersona } from "../src/lib/marketing-persona";
import {
  headerMarketingLaneLinks,
  logoutRedirectPath,
} from "../src/lib/persona-access";
import { PERSONA_MODULE_ROUTES } from "../src/lib/persona-module-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(root, "src/app");

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
  const segments = base.split("/").filter(Boolean);
  const pagePath = join(appRoot, ...segments, "page.tsx");
  return existsSync(pagePath);
}

function moduleHrefs(persona: MarketingPersona): string[] {
  return PERSONA_MODULE_ROUTES[persona].map(normalizeHref);
}

test("1 workspace module hrefs resolve to existing app routes or safe external links", () => {
  const personas: MarketingPersona[] = ["candidate", "recruiter", "company", "investor"];
  for (const persona of personas) {
    for (const href of moduleHrefs(persona)) {
      if (href.startsWith("mailto:")) continue;
      assert.ok(routePageExists(href), `${persona} module href missing page: ${href}`);
    }
  }
});

test("2 candidate Oferty route /dashboard/jobs does not 404", () => {
  assert.ok(routePageExists(CANDIDATE_CANONICAL_ROUTES.jobs));
  assert.match(read("src/app/dashboard/jobs/page.tsx"), /CandidateJobDiscovery/);
  assert.doesNotMatch(read("src/app/dashboard/jobs/page.tsx"), /redirect\s*\(\s*["'`]\/dashboard/);
});

test("3 candidate Dopasowania route /dashboard/matches does not 404", () => {
  assert.ok(routePageExists(CANDIDATE_CANONICAL_ROUTES.matches));
  assert.match(read("src/app/dashboard/matches/page.tsx"), /CandidateMatchesWorkspace/);
  assert.doesNotMatch(read("src/components/candidate/candidate-matches-workspace.tsx"), /router\.replace/);
});

test("4 candidate Profil i CV route /profile exists with meaningful fallback shell", () => {
  assert.ok(routePageExists(CANDIDATE_CANONICAL_ROUTES.profile));
  assert.match(read("src/app/profile/layout.tsx"), /PersonaWorkspaceGate/);
  assert.match(read("src/app/profile/page.tsx"), /CandidateWorkspaceSubnav/);
  assert.equal(
    CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "profile")?.href,
    CANDIDATE_CANONICAL_ROUTES.profile,
  );
});

test("5 recruiter module hrefs do not point at missing pages", () => {
  for (const href of moduleHrefs("recruiter")) {
    assert.ok(routePageExists(href), `recruiter href missing: ${href}`);
  }
});

test("6 company module hrefs do not point at missing pages", () => {
  for (const href of moduleHrefs("company")) {
    assert.ok(routePageExists(href), `company href missing: ${href}`);
  }
});

test("7 investor module hrefs do not point at missing pages", () => {
  for (const href of moduleHrefs("investor")) {
    if (href.startsWith("mailto:")) continue;
    assert.ok(routePageExists(href), `investor href missing: ${href}`);
  }
});

test("8 recruiter inbox is a single module card — no duplicate inbox CTAs", () => {
  const inboxModules = RECRUITER_WORKSPACE_MODULES.filter(
    (m) => normalizeHref(m.href) === "/recruiter/inbox",
  );
  assert.equal(inboxModules.length, 1);
  assert.equal(inboxModules[0]?.id, "inbox");
  assert.ok(routePageExists("/recruiter/inbox"));
  for (const duplicateId of ["notes_scorecards", "scheduling", "audit"] as const) {
    assert.ok(!RECRUITER_WORKSPACE_MODULES.some((m) => m.id === duplicateId));
  }
});

test("9 planned or not-live modules expose explicit status badges", () => {
  const notLive = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "calendar");
  assert.ok(notLive);
  assert.equal(notLive.status, "not_live");
  assert.match(read("src/components/workspace/workspace-status-badge.tsx"), /data-workspace-status/);
  assert.match(read("src/components/workspace/workspace-module-card.tsx"), /WorkspaceStatusBadge/);
});

test("10 workspace module cards use Link or mailto — no inert navigation buttons", () => {
  const card = read("src/components/workspace/workspace-module-card.tsx");
  assert.match(card, /<Link/);
  assert.doesNotMatch(card, /<button[^>]*>[\s\S]*workspaceModules/);
});

test("11 logout redirect target is homepage /", () => {
  for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
    assert.equal(logoutRedirectPath(persona), "/");
  }
  assert.match(read("src/components/site-header-bar.tsx"), /logoutRedirectPath/);
});

test("12 homepage marketing chrome exposes visible Demo link", () => {
  const links = headerMarketingLaneLinks();
  assert.ok(links.some((l) => l.href === "/demo" && l.labelKey === "nav.demo"));
  assert.match(read("src/components/marketing-header.tsx"), /showMarketingPersonaNav/);
});

test("13 auth deep links preserve next destination", () => {
  const dest = "/dashboard/matches?foo=1";
  const login = loginPathWithNext("/login/candidate", dest);
  assert.match(login, /next=%2Fdashboard%2Fmatches/);
  assert.match(read("src/components/persona-workspace-gate.tsx"), /loginPathWithNext/);
});

test("14 hard-ban copy — calendar modules stay not live or paused", () => {
  const recruiterCal = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "calendar");
  assert.equal(recruiterCal?.status, "not_live");
  const autoApply = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "auto_apply");
  assert.equal(autoApply?.status, "paused");
  const text = [
    en.workspaceModules.recruiterCalendarValue,
    en.workspaceModules.recruiterCalendarHint,
    en.workspaceModules.candidateAutoApplyValue,
    en.workspaceModules.candidateAutoApplyHint,
  ].join("\n");
  assert.match(text.toLowerCase(), /not live|paused|wstrzymany|niedostępn/);
});

test("15 workspace module cards avoid hidden PII field patterns in configs", () => {
  const allModules = [
    ...CANDIDATE_WORKSPACE_MODULES,
    ...RECRUITER_WORKSPACE_MODULES,
    ...COMPANY_WORKSPACE_MODULES,
    ...INVESTOR_WORKSPACE_MODULES,
  ];
  const blob = JSON.stringify(allModules);
  assert.doesNotMatch(blob, /email|phone|ssn|password/i);
  assert.doesNotMatch(blob, /candidate_name|recruiter_email/i);
});

test("16 company live pipeline module exposes tenant hint — distinct from demo pipeline", () => {
  const pipeline = COMPANY_WORKSPACE_MODULES.find((m) => m.id === "pipeline");
  assert.ok(pipeline);
  assert.equal(pipeline!.status, "live");
  assert.ok(pipeline!.hintKey);
  const hint = en.workspaceModules.companyPipelineHint.toLowerCase();
  assert.match(hint, /no ats|ats writeback|writeback/i);
  assert.match(en.workspaceModules.companyPipelineValue.toLowerCase(), /not the sample|live segment/i);
  assert.match(en.jobPipeline.demoJourneyDesc.toLowerCase(), /sample|demo|not your live/i);
});
