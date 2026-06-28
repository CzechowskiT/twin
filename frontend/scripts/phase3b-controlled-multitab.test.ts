/**
 * Phase 3B controlled multitab — static guards (Slice 16 refresh).
 * Phase 3B browser execution is HARD BLOCKED; inventory + gates only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { P0_CRITICAL_ALL_ROUTES } from "../e2e/helpers/p0-no-headless-final-state";
import {
  PHASE3B_ALL_ROUTES,
  PHASE3B_CANDIDATE_ROUTES,
  PHASE3B_COMPANY_ROUTES,
  PHASE3B_PUBLIC_ROUTES,
  PHASE3B_RECRUITER_ROUTES,
  PHASE3B_ROUTE_BATCHES,
  PHASE3B_ROUTE_COUNT,
} from "../e2e/helpers/phase3b-controlled-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("1 phase3b route inventory — 20 routes in 3 batches (7+7+6)", () => {
  assert.equal(PHASE3B_PUBLIC_ROUTES.length, 3);
  assert.equal(PHASE3B_CANDIDATE_ROUTES.length, 4);
  assert.equal(PHASE3B_RECRUITER_ROUTES.length, 7);
  assert.equal(PHASE3B_COMPANY_ROUTES.length, 6);
  assert.equal(PHASE3B_ROUTE_COUNT, 20);
  assert.equal(PHASE3B_ALL_ROUTES.length, 20);
  assert.equal(PHASE3B_ROUTE_BATCHES.length, 3);
  assert.equal(PHASE3B_ROUTE_BATCHES[0]!.routes.length, 7);
  assert.equal(PHASE3B_ROUTE_BATCHES[1]!.routes.length, 7);
  assert.equal(PHASE3B_ROUTE_BATCHES[2]!.routes.length, 6);
  const unique = new Set(PHASE3B_ALL_ROUTES);
  assert.equal(unique.size, PHASE3B_ALL_ROUTES.length, "no duplicate phase3b routes");
  for (const path of PHASE3B_ALL_ROUTES) {
    assert.ok(P0_CRITICAL_ALL_ROUTES.includes(path as (typeof P0_CRITICAL_ALL_ROUTES)[number]), path);
  }
});

test("2 phase3b route helper and e2e spec exist", () => {
  const helper = read("e2e/helpers/phase3b-controlled-routes.ts");
  assert.match(helper, /PHASE3B_ROUTE_BATCHES/);
  assert.match(helper, /PHASE3B_ALL_ROUTES/);
  assert.match(helper, /PHASE3B_ROUTE_COUNT/);
  assert.match(read("e2e/phase3b-controlled-multitab.spec.ts"), /withFreshContext/);
  assert.match(read("e2e/phase3b-controlled-multitab.spec.ts"), /fda75677c306aec76dbb83f65c483f8ba7cbe885/);
  assert.match(read("e2e/phase3b-controlled-multitab.spec.ts"), /PHASE3B_ROUTE_BATCHES/);
});

test("3 phase3b npm scripts registered workers=1 and browser gated", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-controlled-multitab-prod/);
  assert.match(pkg, /test:phase3b-controlled-multitab-browser/);
  assert.match(pkg, /test:phase3b-controlled-multitab/);
  assert.match(pkg, /--workers=1/);
  assert.match(pkg, /PLAYWRIGHT_ENABLE_BROWSER_TESTS/);
  assert.match(pkg, /PLAYWRIGHT_ALLOW_PROD_SMOKE/);
  assert.match(pkg, /test:e2e.*DISABLED/i);
});

test("4 p0-no-headless inventory unchanged at 36 routes", () => {
  assert.equal(P0_CRITICAL_ALL_ROUTES.length, 36);
  const helper = read("e2e/helpers/p0-no-headless-final-state.ts");
  assert.match(helper, /P0_CRITICAL_ALL_ROUTES/);
  const p0Test = read("scripts/p0-no-headless-final-state.test.ts");
  assert.match(p0Test, /P0_CRITICAL_ALL_ROUTES\.length, 36/);
});

test("5 phase3b doc blocked — STATUS BLOCKED, DO NOT RUN, 20 routes", () => {
  const doc = readRepo("docs/PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md");
  assert.match(doc, /STATUS: BLOCKED/i);
  assert.match(doc, /DO NOT RUN/i);
  assert.match(doc, /fda7567/);
  assert.match(doc, /20 routes/i);
});

test("6 smoke.yml excludes playwright and phase3b browser smokes", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
});

test("7 founder review — Gate B YES (minimal shell merged), Gate C YES (local browser PASS), Phase 3B HARD BLOCKED", () => {
  const founderReview = readRepo("docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md");
  assert.match(founderReview, /Phase 3B.*HARD BLOCKED/i);
  assert.match(founderReview, /P0 performance.*OPEN/i);
  assert.match(founderReview, /Public launch.*NO-GO/i);
  assert.match(founderReview, /Gate B.*YES/i);
  assert.match(founderReview, /Gate C.*YES/i);
  assert.match(founderReview, /20 routes/i);

  const launchStance = read("src/lib/investor-metrics-reality.ts");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);
});

test("8 p0 performance inventory — Phase 3B blocked, 36 p0 routes, 20 phase3b routes", () => {
  const inv = readRepo("docs/P0_PERFORMANCE_INVENTORY_2026-06-27.md");
  assert.match(inv, /P0 performance remains OPEN/i);
  assert.match(inv, /Phase 3B.*HARD BLOCKED/i);
  assert.match(inv, /p0-no-headless-final-state.*36 routes/i);
  assert.match(inv, /Phase 3B.*20 routes/i);
  assert.match(inv, /test:e2e.*DISABLED/i);
});

test("9 slice12 founder signoff checklist — Gate B YES, Gate C YES (local), Gate E PENDING, stance blocked", () => {
  const checklist = readRepo("docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md");
  assert.match(checklist, /Slice 12 Founder Sign-Off Checklist/i);
  assert.match(checklist, /Gate B.*YES/i);
  assert.match(checklist, /Gate C.*YES/i);
  assert.match(checklist, /Gate E.*PENDING/i);
  assert.match(checklist, /36 routes/i);
  assert.match(checklist, /20 routes/i);
  assert.match(checklist, /7 \+ 7 \+ 6/);
  assert.match(checklist, /Phase 3B.*HARD BLOCKED/i);
  assert.match(checklist, /P0 performance.*OPEN/i);
  assert.match(checklist, /Public launch.*NO-GO/i);
  assert.match(checklist, /gate-c-browser-validation-result-2026-06-28/i);

  const launchStance = read("src/lib/investor-metrics-reality.ts");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});
