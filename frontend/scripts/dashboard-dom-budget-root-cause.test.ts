/**
 * Gate E attempt 18 — static guard for /dashboard DOM_FAIL (dom-fail:21094).
 * Root cause: home dashboard rendered full matches + jobs + applications feeds
 * (up to 200 rows each) on one page; sibling routes use dedicated workspaces.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 /dashboard remains in Phase 3B route registry", () => {
  const routes = read("e2e/helpers/phase3b-controlled-routes.ts");
  assert.match(routes, /PHASE3B_CANDIDATE_ROUTES[\s\S]*"\/dashboard"/);
  assert.doesNotMatch(routes, /exclude.*\/dashboard|skip.*\/dashboard/i);
});

test("2 DOM budget threshold stays 15000 — not raised or bypassed", () => {
  const routes = read("e2e/helpers/phase3b-controlled-routes.ts");
  assert.match(routes, /PHASE3B_DOM_FAIL\s*=\s*15000/);
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /PHASE3B_DOM_FAIL/);
  assert.doesNotMatch(spec, /PHASE3B_DOM_FAIL\s*=\s*2\d{4,}/);
});

test("3 home dashboard preview caps are defined and wired", () => {
  const budget = read("src/lib/dashboard-dom-budget.ts");
  assert.match(budget, /DASHBOARD_HOME_MATCHES_PREVIEW\s*=\s*\d+/);
  assert.match(budget, /DASHBOARD_HOME_JOBS_PREVIEW\s*=\s*\d+/);
  assert.match(budget, /DASHBOARD_HOME_APPLICATIONS_PREVIEW\s*=\s*\d+/);

  const page = read("src/app/dashboard/page.tsx");
  assert.match(page, /DASHBOARD_HOME_MATCHES_PREVIEW/);
  assert.match(page, /previewLimit=\{DASHBOARD_HOME_MATCHES_PREVIEW\}/);
  assert.match(page, /previewLimit=\{DASHBOARD_HOME_JOBS_PREVIEW\}/);
  assert.match(page, /previewLimit=\{DASHBOARD_HOME_APPLICATIONS_PREVIEW\}/);
  assert.match(page, /viewAllHref="\/dashboard\/matches"/);
  assert.match(page, /viewAllHref="\/dashboard\/jobs"/);
  assert.match(page, /viewAllHref="\/dashboard\/applications"/);
});

test("4 heavy sections slice items when previewLimit is set", () => {
  const jobs = read("src/components/dashboard/jobs-section.tsx");
  assert.match(jobs, /previewLimit/);
  assert.match(jobs, /jobs\.items\.slice\(0, previewLimit\)/);
  assert.match(jobs, /previewMode \? null :/);

  const matches = read("src/components/dashboard/matches-section.tsx");
  assert.match(matches, /visibleMatches\.slice\(0, previewLimit\)/);

  const apps = read("src/components/dashboard/applications-section.tsx");
  assert.match(apps, /applications\.slice\(0, previewLimit\)/);
});

test("5 no simultaneous hidden duplicate desktop/mobile dashboard feeds", () => {
  const dashboardComponents = [
    "src/components/dashboard/jobs-section.tsx",
    "src/components/dashboard/matches-section.tsx",
    "src/components/dashboard/applications-section.tsx",
    "src/app/dashboard/page.tsx",
  ];
  const blob = dashboardComponents.map((p) => read(p)).join("\n");
  assert.doesNotMatch(blob, /hidden\s+md:block[\s\S]{0,120}JobList/);
  assert.doesNotMatch(blob, /md:hidden[\s\S]{0,120}JobList[\s\S]{0,400}md:block[\s\S]{0,120}JobList/);
});

test("6 scope lock — frontend-only dashboard DOM budget guard", () => {
  const allowed = [
    "src/lib/dashboard-dom-budget.ts",
    "src/app/dashboard/page.tsx",
    "src/components/dashboard/jobs-section.tsx",
    "src/components/dashboard/matches-section.tsx",
    "src/components/dashboard/applications-section.tsx",
    "src/lib/i18n.ts",
    "scripts/dashboard-dom-budget-root-cause.test.ts",
    "package.json",
  ];
  for (const rel of allowed) {
    assert.ok(read(rel).length > 0, `expected frontend/${rel}`);
  }
  const smokeYml = readFileSync(join(repoRoot, ".github/workflows/smoke.yml"), "utf8");
  assert.doesNotMatch(smokeYml, /dashboard-dom-budget-root-cause/);
});

test("7 package registers dashboard dom-budget root-cause guard", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:dashboard-dom-budget-root-cause/);
});

test("8 no Launch GO / P0 CLOSED / Gate F YES language in product guard sources", () => {
  const blob = [
    read("src/lib/dashboard-dom-budget.ts"),
    read("src/app/dashboard/page.tsx"),
  ].join("\n");
  assert.doesNotMatch(blob, /\bLaunch GO\b|\bP0 CLOSED\b|\bGate F YES\b/i);
});
