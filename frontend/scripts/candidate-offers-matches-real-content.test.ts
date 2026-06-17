/**
 * Candidate offers & matches — distinct pages must not bounce to generic dashboard.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  CANDIDATE_MATCHES_PAGE_MARKER,
  CANDIDATE_OFFERS_PAGE_MARKER,
} from "../src/lib/candidate-offers-matches-demo-data";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 /dashboard/jobs route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/jobs/page.tsx")));
});

test("2 /dashboard/jobs does not redirect to dashboard as final behavior", () => {
  const jobsPage = read("src/app/dashboard/jobs/page.tsx");
  const discovery = read("src/components/job/candidate-job-discovery.tsx");
  assert.doesNotMatch(jobsPage, /redirect\s*\(\s*["'`]\/dashboard/);
  assert.doesNotMatch(jobsPage, /redirect\s*\(\s*["'`]\/workspace\/candidate\/jobs/);
  assert.doesNotMatch(discovery, /router\.replace\s*\(\s*["'`]\/dashboard/);
  assert.match(jobsPage, /CandidateJobDiscovery/);
});

test("3 /dashboard/jobs renders route-specific offers content", () => {
  const discovery = read("src/components/job/candidate-job-discovery.tsx");
  assert.match(discovery, new RegExp(CANDIDATE_OFFERS_PAGE_MARKER));
  assert.match(discovery, /jobBoard\.discoveryTitle/);
});

test("4 /dashboard/jobs is not generic dashboard panel page", () => {
  const jobsPage = read("src/app/dashboard/jobs/page.tsx");
  assert.doesNotMatch(jobsPage, /CandidateModuleNav/);
  assert.doesNotMatch(jobsPage, /DashboardCommandCenter/);
});

test("5 /dashboard/matches route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/matches/page.tsx")));
});

test("6 /dashboard/matches does not redirect to dashboard as final behavior", () => {
  const matchesPage = read("src/app/dashboard/matches/page.tsx");
  const workspace = read("src/components/candidate/candidate-matches-workspace.tsx");
  assert.doesNotMatch(matchesPage, /redirect\s*\(\s*["'`]\/dashboard/);
  assert.doesNotMatch(matchesPage, /router\.replace/);
  assert.doesNotMatch(workspace, /router\.replace/);
  assert.doesNotMatch(workspace, /#dashboard-matches/);
});

test("7 /dashboard/matches renders route-specific matches content", () => {
  const workspace = read("src/components/candidate/candidate-matches-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_MATCHES_PAGE_MARKER));
  assert.match(workspace, /candidateMatchesPage\.pageTitle/);
});

test("8 /dashboard/matches is not generic dashboard panel page", () => {
  const matchesPage = read("src/app/dashboard/matches/page.tsx");
  assert.doesNotMatch(matchesPage, /CandidateModuleNav/);
  assert.match(matchesPage, /CandidateMatchesWorkspace/);
});

test("9 candidate module config links Oferty to /dashboard/jobs", () => {
  const jobs = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "jobs");
  assert.ok(jobs);
  assert.equal(jobs.href, CANDIDATE_CANONICAL_ROUTES.jobs);
});

test("10 candidate module config links Dopasowania to /dashboard/matches", () => {
  const matches = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "matches");
  assert.ok(matches);
  assert.equal(matches.href, CANDIDATE_CANONICAL_ROUTES.matches);
});

test("11 no dashboard bounce remains in jobs/matches implementation", () => {
  const blob = [
    "src/app/dashboard/jobs/page.tsx",
    "src/app/dashboard/matches/page.tsx",
    "src/components/candidate/candidate-matches-workspace.tsx",
    "src/components/job/candidate-job-discovery.tsx",
  ]
    .map((p) => read(p))
    .join("\n");
  assert.doesNotMatch(blob, /router\.replace\s*\(\s*[`'"]\/dashboard/);
  assert.doesNotMatch(blob, /redirect\s*\(\s*[`'"]\/dashboard[`'"]\s*\)/);
});

test("12 shell/gate/fallback/layout files not modified by offers/matches fix", () => {
  const featurePaths = [
    "src/app/dashboard/jobs/page.tsx",
    "src/app/dashboard/matches/page.tsx",
    "src/components/candidate/candidate-matches-workspace.tsx",
    "src/components/job/candidate-job-discovery.tsx",
    "src/components/candidate-workspace-subnav.tsx",
    "src/components/ux/workspace-flow-steps.tsx",
    "src/lib/candidate-workspace-modules.ts",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
});
