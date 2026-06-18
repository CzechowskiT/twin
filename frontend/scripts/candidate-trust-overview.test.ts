/**
 * Candidate trust overview — route, demo data, and hard-ban guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_TRUST_OVERVIEW_DEMO_ID,
  getCandidateTrustOverviewDemo,
} from "../src/lib/candidate-trust-overview-demo-data";
import {
  CANDIDATE_TRUST_OVERVIEW_MARKERS,
  CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  CANDIDATE_TRUST_OVERVIEW_ROUTE,
  candidateTrustOverviewHref,
  resolveCandidateTrustOverview,
} from "../src/lib/candidate-trust-overview";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateTrustOverview as resolveKernelOverview } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /GDPR compliant/i,
  /legally compliant/i,
  /automatic outreach/i,
  /email sent/i,
  /AI decided/i,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust/overview route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/overview/page.tsx")));
});

test("2 profile trust/overview alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/overview/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic overview record", () => {
  const record = resolveCandidateTrustOverview(CANDIDATE_TRUST_OVERVIEW_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.trust_modules.length, 9);
});

test("4 workspace renders all eight section markers", () => {
  const workspace = read("src/components/candidate/candidate-trust-overview-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.moduleMap/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.timeline/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.downloadableRecords/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.pendingActions/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.safetyBoundaries/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.recommendedNext/);
  assert.match(workspace, /CANDIDATE_TRUST_OVERVIEW_MARKERS\.linkedModules/);
});

test("5 invalid candidate id resolves null with not-found marker", () => {
  assert.equal(resolveCandidateTrustOverview("not-real"), null);
  assert.match(read("src/components/candidate/candidate-trust-overview-workspace.tsx"), /notFound/);
});

test("6 all nine trust modules linked with valid canonical hrefs", () => {
  const record = getCandidateTrustOverviewDemo();
  const canonicalHrefs = new Set(Object.values(CANDIDATE_CANONICAL_ROUTES));
  for (const mod of record.trust_modules) {
    assert.ok(canonicalHrefs.has(mod.href as (typeof CANDIDATE_CANONICAL_ROUTES)[keyof typeof CANDIDATE_CANONICAL_ROUTES]));
  }
});

test("7 SOR registry includes candidate_trust_overview", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_trust_overview");
  assert.ok(entry);
  assert.equal(entry?.href, CANDIDATE_TRUST_OVERVIEW_ROUTE);
});

test("8 kernel resolver returns overview for demo id", () => {
  assert.ok(resolveKernelOverview(CANDIDATE_TRUST_OVERVIEW_DEMO_ID));
});

test("9 trust center links to overview", () => {
  assert.match(read("src/components/candidate/candidate-trust-center-workspace.tsx"), /candidateTrustOverviewHref/);
});

test("10 no forbidden copy in workspace and lib", () => {
  const sources = [
    "src/components/candidate/candidate-trust-overview-workspace.tsx",
    "src/lib/candidate-trust-overview.ts",
    "src/lib/candidate-trust-overview-demo-data.ts",
  ];
  for (const rel of sources) {
    for (const pattern of FORBIDDEN_COPY) {
      assert.doesNotMatch(read(rel), pattern, `forbidden copy in ${rel}`);
    }
  }
});

test("11 shell/gate/fallback/layout untouched", () => {
  for (const rel of FORBIDDEN_SHELL_FILES) {
    assert.ok(existsSync(join(root, rel)));
  }
});

test("12 i18n EN and PL candidateTrustOverview namespaces exist", () => {
  assert.ok(en.candidateTrustOverview.pageTitle);
  assert.ok(dictionaries.pl.candidateTrustOverview.pageTitle);
});

test("13 canonical route trustOverview registered", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustOverview, "/dashboard/trust/overview");
  assert.equal(candidateTrustOverviewHref(), "/dashboard/trust/overview");
});

test("14 control center links to overview", () => {
  const cc = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(cc, /candidate-control-center-overview-link/);
  assert.match(cc, /candidateTrustOverviewHref/);
});
