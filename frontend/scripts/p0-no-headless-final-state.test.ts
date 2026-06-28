/**
 * P0 no headless final state — static guards (10 assertions).
 * Phase 3B multitab verification is BLOCKED; this guardrail replaces final-state checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  P0_CRITICAL_ALL_ROUTES,
  P0_CRITICAL_BOARD_ROUTES,
  P0_CRITICAL_CANDIDATE_ROUTES,
  P0_CRITICAL_COMPANY_ROUTES,
  P0_CRITICAL_PUBLIC_ROUTES,
  P0_CRITICAL_RECRUITER_ROUTES,
  P0_MIN_MAIN_CONTENT_CHARS,
  P0_MIN_VISIBLE_TEXT_CHARS,
  P0_PAGE_MARKER_SELECTORS,
  evaluateFinalState,
} from "../e2e/helpers/p0-no-headless-final-state";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 route helper defines all critical persona lanes from mission spec", () => {
  assert.equal(P0_CRITICAL_PUBLIC_ROUTES.length, 3);
  assert.equal(P0_CRITICAL_CANDIDATE_ROUTES.length, 10);
  assert.equal(P0_CRITICAL_RECRUITER_ROUTES.length, 11);
  assert.equal(P0_CRITICAL_COMPANY_ROUTES.length, 11);
  assert.equal(P0_CRITICAL_BOARD_ROUTES.length, 1);
  assert.equal(P0_CRITICAL_ALL_ROUTES.length, 36);
  const required = [
    "/",
    "/demo",
    "/for-companies",
    "/dashboard",
    "/dashboard/jobs",
    "/dashboard/matches",
    "/profile",
    "/dashboard/profile",
    "/dashboard/cv",
    "/dashboard/hiring-journey",
    "/profile/hiring-journey",
    "/recruiter",
    "/recruiter/candidates/demo-candidate-001",
    "/recruiter/candidates/demo-candidate-001/trust",
    "/recruiter/candidates/demo-candidate-001/collaboration",
    "/recruiter/jobs/demo-role-001/pipeline",
    "/recruiter/jobs/demo-role-001/tasks",
    "/recruiter/integrations/ats/import-readiness",
    "/recruiter/hiring-journey",
    "/company/dashboard",
    "/company/candidates/demo-candidate-001",
    "/company/roles/demo-role-001/pipeline",
    "/company/integrations/ats/import-readiness",
    "/company/hiring-journey",
    "/board/hiring-journey",
  ];
  for (const path of required) {
    assert.ok(P0_CRITICAL_ALL_ROUTES.includes(path as (typeof P0_CRITICAL_ALL_ROUTES)[number]), path);
  }
  const unique = new Set(P0_CRITICAL_ALL_ROUTES);
  assert.equal(unique.size, P0_CRITICAL_ALL_ROUTES.length, "no duplicate routes");
});

test("2 headless utility distinguishes auth card from chrome-only shell", () => {
  const authPass = evaluateFinalState({
    pathname: "/dashboard",
    visibleTextLength: 120,
    mainContentLength: 80,
    shellReady: true,
    shellSkeleton: false,
    hasAuthCard: true,
    hasAuthNextLink: true,
    hasPlannedMarker: false,
    hasDemoMarker: false,
    hasGuidedNotFound: false,
    hasMeaningfulError: false,
    isChromeOnly: false,
  });
  assert.equal(authPass.pass, true);
  assert.match(authPass.reason, /auth/);

  const chromeFail = evaluateFinalState({
    pathname: "/dashboard",
    visibleTextLength: 200,
    mainContentLength: 4,
    shellReady: true,
    shellSkeleton: false,
    hasAuthCard: false,
    hasAuthNextLink: false,
    hasPlannedMarker: false,
    hasDemoMarker: false,
    hasGuidedNotFound: false,
    hasMeaningfulError: false,
    isChromeOnly: true,
  });
  assert.equal(chromeFail.pass, false);
  assert.equal(chromeFail.reason, "chrome-only-shell");
});

test("3 utility accepts guided not-found and demo markers as valid final states", () => {
  const notFound = evaluateFinalState({
    pathname: "/recruiter/candidates/x",
    visibleTextLength: 60,
    mainContentLength: 10,
    shellReady: true,
    shellSkeleton: false,
    hasAuthCard: false,
    hasAuthNextLink: false,
    hasPlannedMarker: false,
    hasDemoMarker: false,
    hasGuidedNotFound: true,
    hasMeaningfulError: false,
    isChromeOnly: false,
  });
  assert.equal(notFound.pass, true);

  const demo = evaluateFinalState({
    pathname: "/demo",
    visibleTextLength: 500,
    mainContentLength: 400,
    shellReady: true,
    shellSkeleton: false,
    hasAuthCard: false,
    hasAuthNextLink: false,
    hasPlannedMarker: false,
    hasDemoMarker: true,
    hasGuidedNotFound: false,
    hasMeaningfulError: false,
    isChromeOnly: false,
  });
  assert.equal(demo.pass, true);
});

test("4 package.json registers p0 no-headless scripts — phase3b blocked", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:p0-no-headless-final-state/);
  assert.match(pkg, /test:p0-no-headless-final-state-browser/);
  assert.match(pkg, /p0-no-headless-final-state-browser\.spec\.ts/);
  assert.match(pkg, /--workers=1/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  if (/test:phase3b-controlled-multitab-browser/.test(pkg)) {
    assert.match(pkg, /PLAYWRIGHT_ALLOW_PROD_SMOKE/);
  }
});

test("5 browser spec uses withFreshContext and sequential single-page pattern", () => {
  const spec = read("e2e/p0-no-headless-final-state-browser.spec.ts");
  assert.match(spec, /withFreshContext/);
  assert.match(spec, /P0_CRITICAL_ALL_ROUTES/);
  assert.match(spec, /evaluateFinalState/);
  assert.match(spec, /snapshotFinalStateDom/);
  assert.doesNotMatch(spec, /Promise\.all\([\s\S]*newPage/);
});

test("6 thresholds and marker selectors exported for browser evaluator", () => {
  assert.ok(P0_MIN_VISIBLE_TEXT_CHARS >= 32);
  assert.ok(P0_MIN_MAIN_CONTENT_CHARS >= 16);
  assert.ok(P0_PAGE_MARKER_SELECTORS.length >= 8);
  const helper = read("e2e/helpers/p0-no-headless-final-state.ts");
  assert.match(helper, /isChromeOnly/);
  assert.match(helper, /hasAuthNextLink/);
  assert.match(helper, /lightweight-route-shell-skeleton/);
});

test("7 stuck skeleton without main content fails final-state guard", () => {
  const stuck = evaluateFinalState({
    pathname: "/recruiter",
    visibleTextLength: 20,
    mainContentLength: 0,
    shellReady: false,
    shellSkeleton: true,
    hasAuthCard: false,
    hasAuthNextLink: false,
    hasPlannedMarker: false,
    hasDemoMarker: false,
    hasGuidedNotFound: false,
    hasMeaningfulError: false,
    isChromeOnly: false,
  });
  assert.equal(stuck.pass, false);
  assert.equal(stuck.reason, "stuck-skeleton");
});

test("8 root cause components documented — shell/gate/layout implicated in phase3b block", () => {
  const doc = readFileSync(join(root, "..", "docs", "P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md"), "utf8");
  assert.match(doc, /LightweightRouteShell/);
  assert.match(doc, /PersonaWorkspaceGate/);
  assert.match(doc, /Phase 3B.*BLOCKED/i);
  assert.match(doc, /chrome-headless-shell/i);
});

test("9 hiring journey routes in p0 inventory — static gated, P0 OPEN, phase3b blocked", () => {
  const hiringJourneyRoutes = [
    "/dashboard/hiring-journey",
    "/profile/hiring-journey",
    "/recruiter/hiring-journey",
    "/company/hiring-journey",
    "/board/hiring-journey",
  ] as const;
  for (const path of hiringJourneyRoutes) {
    assert.ok(P0_CRITICAL_ALL_ROUTES.includes(path), path);
  }
  const helper = read("e2e/helpers/p0-no-headless-final-state.ts");
  assert.match(helper, /data-hiring-journey-page/);
  assert.match(helper, /P0_CRITICAL_BOARD_ROUTES/);
  const pkg = read("package.json");
  assert.match(pkg, /test:p0-no-headless-final-state-browser/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  const inv = readRepo("docs/P0_PERFORMANCE_INVENTORY_2026-06-27.md");
  assert.match(inv, /P0 performance remains OPEN/i);
  assert.match(inv, /Phase 3B.*HARD BLOCKED/i);
  assert.match(inv, /p0-no-headless-final-state.*36 routes/i);
});

test("10 founder review stance — Gate B YES merged, Phase 3B blocked, browser gated, P0 OPEN", () => {
  const founderReview = readRepo("docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md");
  assert.match(founderReview, /Phase 3B.*HARD BLOCKED/i);
  assert.match(founderReview, /P0 performance.*OPEN/i);
  assert.match(founderReview, /Public launch.*NO-GO/i);
  assert.match(founderReview, /Gate B.*YES/i);
  assert.match(founderReview, /Gate C.*PENDING/i);
  assert.match(founderReview, /36 routes/i);

  const p0Doc = readRepo("docs/P0_NO_HEADLESS_FINAL_STATE_2026-06-17.md");
  assert.match(p0Doc, /Phase 3B.*BLOCKED/i);
  assert.match(p0Doc, /founder review/i);
  assert.match(p0Doc, /36 routes/i);

  const phase3bDoc = readRepo("docs/PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md");
  assert.match(phase3bDoc, /STATUS: BLOCKED/i);
  assert.match(phase3bDoc, /DO NOT RUN/i);

  const pkg = read("package.json");
  assert.match(pkg, /test:p0-no-headless-final-state-browser/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  assert.match(pkg, /test:phase3b-controlled-multitab-browser/);
  assert.match(pkg, /test:e2e.*DISABLED/i);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);

  const launchStance = read("src/lib/investor-metrics-reality.ts");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);
});
