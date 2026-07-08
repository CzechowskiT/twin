/**
 * Gate E Phase 3B route-level sharding — static guard (no browser, no
 * workflow trigger, no prod request).
 *
 * Attempt 14 (2026-07-06, run 28771385932, split-batch shape) showed all 3
 * batch-level isolated-runner jobs (6-7 routes each) killed by
 * `RUNNER_SHUTDOWN_SIGNAL`/exit 143 — a third, distinct GitHub Actions
 * infrastructure non-completion signature — with 0/20 routes confirmed, and
 * no correlation between batch size/duration and the failure (the smallest
 * batch, `company` at 6 routes, survived ~8-10x longer than the other two
 * before the identical signal). This suite proves the route-level slug/
 * selector helper, the generic per-route npm script, the
 * `.github/workflows/gate-e-phase3b-manual.yml` 20-entry route matrix +
 * aggregation job wiring, and the route-sharding plan doc — without ever
 * running Playwright or dispatching the workflow. See
 * docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  isPhase3bRoute,
  PHASE3B_ALL_ROUTES,
  PHASE3B_ROUTE_COUNT,
  PHASE3B_ROUTE_ENTRIES,
  PHASE3B_ROUTE_SLUGS,
  selectPhase3bRoute,
  slugifyPhase3bRoute,
} from "../e2e/helpers/phase3b-controlled-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WORKFLOW = ".github/workflows/gate-e-phase3b-manual.yml";
const PLAN_DOC = "docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md";
const ISOLATED_RUNNER_PLAN = "docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md";
const EVIDENCE_INDEX = "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md";
const ATTEMPT14_RESULT = "docs/gate-e-phase3b-attempt14-result-2026-07-03.md";

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

// --- Helper module -----------------------------------------------------

test("1 PHASE3B_ROUTE_ENTRIES has exactly 20 entries, one per PHASE3B_ALL_ROUTES, same order", () => {
  assert.equal(PHASE3B_ROUTE_ENTRIES.length, PHASE3B_ROUTE_COUNT);
  assert.equal(PHASE3B_ROUTE_ENTRIES.length, 20);
  for (const [index, entry] of PHASE3B_ROUTE_ENTRIES.entries()) {
    assert.equal(entry.route, PHASE3B_ALL_ROUTES[index]);
  }
});

test("2 PHASE3B_ROUTE_SLUGS are all unique and URL/artifact-safe (no slashes, no leading/trailing dash)", () => {
  assert.equal(PHASE3B_ROUTE_SLUGS.length, 20);
  const unique = new Set(PHASE3B_ROUTE_SLUGS);
  assert.equal(unique.size, 20, "expected no slug collisions across the 20 routes");
  for (const slug of PHASE3B_ROUTE_SLUGS) {
    assert.doesNotMatch(slug, /\//, `slug must not contain "/": ${slug}`);
    assert.doesNotMatch(slug, /^-|-$/, `slug must not start/end with "-": ${slug}`);
    assert.ok(slug.length > 0, "slug must be non-empty");
  }
});

test("3 slugifyPhase3bRoute — known mappings (root special-case, nested paths)", () => {
  assert.equal(slugifyPhase3bRoute("/"), "root");
  assert.equal(slugifyPhase3bRoute("/demo"), "demo");
  assert.equal(slugifyPhase3bRoute("/dashboard/jobs"), "dashboard-jobs");
  assert.equal(
    slugifyPhase3bRoute("/recruiter/candidates/demo-candidate-001/trust"),
    "recruiter-candidates-demo-candidate-001-trust",
  );
  assert.equal(
    slugifyPhase3bRoute("/company/roles/demo-role-001/pipeline"),
    "company-roles-demo-role-001-pipeline",
  );
});

test("4 isPhase3bRoute accepts all 20 known routes and rejects anything else", () => {
  for (const route of PHASE3B_ALL_ROUTES) {
    assert.equal(isPhase3bRoute(route), true, route);
  }
  assert.equal(isPhase3bRoute("/not-a-real-route"), false);
  assert.equal(isPhase3bRoute(""), false);
  assert.equal(isPhase3bRoute("/Dashboard"), false);
});

test("5 selectPhase3bRoute returns null when PHASE3B_ROUTE is unset or blank", () => {
  assert.equal(selectPhase3bRoute({} as NodeJS.ProcessEnv), null);
  assert.equal(selectPhase3bRoute({ PHASE3B_ROUTE: "  " } as unknown as NodeJS.ProcessEnv), null);
});

test("6 selectPhase3bRoute validates and returns exactly one of the 20 routes when set", () => {
  for (const route of PHASE3B_ALL_ROUTES) {
    assert.equal(selectPhase3bRoute({ PHASE3B_ROUTE: route } as unknown as NodeJS.ProcessEnv), route);
  }
});

test("7 selectPhase3bRoute throws loudly on an unknown PHASE3B_ROUTE value (never silently runs the wrong route)", () => {
  assert.throws(
    () => selectPhase3bRoute({ PHASE3B_ROUTE: "/not-a-real-route" } as unknown as NodeJS.ProcessEnv),
    /Unknown PHASE3B_ROUTE/,
  );
});

test("8 selectPhase3bRoute throws when both PHASE3B_ROUTE and PHASE3B_BATCH are set (mutually exclusive)", () => {
  assert.throws(
    () =>
      selectPhase3bRoute({
        PHASE3B_ROUTE: "/demo",
        PHASE3B_BATCH: "public-candidate",
      } as unknown as NodeJS.ProcessEnv),
    /mutually exclusive/,
  );
});

// --- Spec wiring ---------------------------------------------------------

test("9 spec imports selectPhase3bRoute/slugifyPhase3bRoute and resolves a single-route pseudo-batch", () => {
  const spec = readFrontend("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /selectPhase3bRoute/);
  assert.match(spec, /slugifyPhase3bRoute/);
  assert.match(spec, /const PHASE3B_ROUTE_ENV = selectPhase3bRoute\(process\.env\)/);
  assert.match(spec, /label:\s*slugifyPhase3bRoute\(PHASE3B_ROUTE_ENV\)/);
  assert.match(spec, /routes:\s*\[PHASE3B_ROUTE_ENV\]/);
});

test("10 spec still uses the unmodified batch loop shape (for (const batch of PHASE3B_ROUTE_BATCHES)) for both batch and route mode", () => {
  const spec = readFrontend("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /for \(const batch of PHASE3B_ROUTE_BATCHES\)/);
});

// --- npm scripts -----------------------------------------------------------

test("11 npm script test:phase3b-controlled-multitab-prod:route exists and is a plain delegate (route comes from PHASE3B_ROUTE env, not baked in)", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:phase3b-controlled-multitab-prod:route":\s*"npm run test:phase3b-controlled-multitab-prod"/);
});

test("12 the underlying -prod script still runs the local hard-block guard first, unaffected by route sharding", () => {
  const pkg = readFrontend("package.json");
  assert.match(
    pkg,
    /"test:phase3b-controlled-multitab-prod":\s*"npx --yes tsx scripts\/phase3b-prod-local-guard\.ts && /,
  );
});

test("13 npm script test:gate-e-phase3b-route-sharding (this file) is registered", () => {
  const pkg = readFrontend("package.json");
  assert.match(pkg, /"test:gate-e-phase3b-route-sharding":/);
  assert.match(pkg, /gate-e-phase3b-route-sharding\.test\.ts/);
});

// --- Workflow: route matrix -------------------------------------------------

test("14 workflow gate-e-phase3b-prod job is a 20-entry route matrix, strictly sequential, never cancels remaining routes on one failure", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /strategy:\s*\n\s*fail-fast:\s*false\s*\n\s*max-parallel:\s*1\s*\n\s*matrix:\s*\n\s*include:/);
  const matrixIdx = workflow.indexOf("matrix:\n        include:");
  const entries = workflow.slice(matrixIdx).match(/- \{ route: "[^"]+", slug: [\w-]+ \}/g) ?? [];
  assert.equal(entries.length, 20);
});

test("15 every matrix entry's slug equals slugifyPhase3bRoute(route) — no manual slug drift", () => {
  const workflow = readRepo(WORKFLOW);
  const matrixIdx = workflow.indexOf("matrix:\n        include:");
  const nextSectionIdx = workflow.indexOf("env:\n      PHASE3B_ROUTE", matrixIdx);
  const block = workflow.slice(matrixIdx, nextSectionIdx);
  const entryRe = /- \{ route: "([^"]+)", slug: ([\w-]+) \}/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = entryRe.exec(block)) !== null) {
    count += 1;
    const [, route, slug] = match;
    assert.equal(slug, slugifyPhase3bRoute(route!), `matrix entry for ${route} has mismatched slug ${slug}`);
    assert.ok(isPhase3bRoute(route!), `matrix route ${route} must be a known PHASE3B_ALL_ROUTES entry`);
  }
  assert.equal(count, 20);
});

test("16 matrix routes are exactly PHASE3B_ALL_ROUTES, no more, no fewer, no duplicates", () => {
  const workflow = readRepo(WORKFLOW);
  const matrixIdx = workflow.indexOf("matrix:\n        include:");
  const nextSectionIdx = workflow.indexOf("env:\n      PHASE3B_ROUTE", matrixIdx);
  const block = workflow.slice(matrixIdx, nextSectionIdx);
  const routes = [...block.matchAll(/- \{ route: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(routes.length, 20);
  assert.equal(new Set(routes).size, 20, "no duplicate routes in the matrix");
  assert.deepEqual([...routes].sort(), [...PHASE3B_ALL_ROUTES].sort());
});

test("17 job env sets PHASE3B_ROUTE from matrix.route", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /PHASE3B_ROUTE:\s*\$\{\{\s*matrix\.route\s*\}\}/);
});

test("18 canonical command step calls the generic per-route npm script", () => {
  const workflow = readRepo(WORKFLOW);
  assert.match(workflow, /npm run test:phase3b-controlled-multitab-prod:route/);
});

test("19 evidence artifact is named by matrix.slug, if: always()", () => {
  const workflow = readRepo(WORKFLOW);
  const uploadIdx = workflow.indexOf("gate-e-phase3b-evidence-${{ matrix.slug }}-${{ github.run_id }}");
  assert.ok(uploadIdx > -1);
  const precedingBlock = workflow.slice(Math.max(0, uploadIdx - 400), uploadIdx);
  assert.match(precedingBlock, /if:\s*always\(\)/);
  assert.match(precedingBlock, /upload-artifact@v4/);
});

test("20 job timeout is bounded (10-30 min) and strictly greater than the canonical step's own timeout", () => {
  const workflow = readRepo(WORKFLOW);
  const jobTimeoutMatch = workflow.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(jobTimeoutMatch);
  const jobTimeout = Number.parseInt(jobTimeoutMatch![1]!, 10);
  assert.ok(jobTimeout >= 10 && jobTimeout <= 30, `expected 10-30min, got ${jobTimeout}`);

  const canonicalIdx = workflow.indexOf("Gate E Phase 3B prod — controlled multitab (canonical command)");
  const nextStepIdx = workflow.indexOf("- name:", canonicalIdx + 1);
  const canonicalBlock = workflow.slice(canonicalIdx, nextStepIdx);
  const stepTimeoutMatch = canonicalBlock.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(stepTimeoutMatch);
  const stepTimeout = Number.parseInt(stepTimeoutMatch![1]!, 10);
  assert.ok(stepTimeout > 0 && stepTimeout < jobTimeout);
});

test("21 no monolithic single-batch/single-route job exists — the only gate-e-phase3b-prod job definition is the 20-route matrix", () => {
  const workflow = readRepo(WORKFLOW);
  const occurrences = workflow.match(/^\s{2}gate-e-phase3b-prod:$/gm) ?? [];
  assert.equal(occurrences.length, 1, "expected exactly one gate-e-phase3b-prod job definition");
});

test("22 static preflight guards step includes the route-sharding guard (this file)", () => {
  const workflow = readRepo(WORKFLOW);
  const preflightIdx = workflow.indexOf("Static preflight guards");
  const block = workflow.slice(preflightIdx, preflightIdx + 800);
  assert.match(block, /test:gate-e-phase3b-route-sharding/);
});

// --- Workflow: aggregation job ----------------------------------------------

test("23 aggregation job still needs gate-e-phase3b-prod, if: always(), and downloads all evidence with continue-on-error", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  assert.ok(aggregateIdx > -1);
  const block = workflow.slice(aggregateIdx);
  assert.match(block, /needs:\s*gate-e-phase3b-prod/);
  assert.match(block, /if:\s*always\(\)/);
  assert.match(block, /download-artifact@v4/);
  assert.match(block, /pattern:\s*gate-e-phase3b-evidence-\*-\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(block, /continue-on-error:\s*true/);
});

test("24 aggregation job's embedded Python ROUTES list has exactly 20 (slug, route) tuples, matching slugifyPhase3bRoute(PHASE3B_ALL_ROUTES) exactly (no drift)", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const routesIdx = workflow.indexOf("ROUTES = [", aggregateIdx);
  assert.ok(routesIdx > -1, "expected a ROUTES = [...] python list in the aggregation job");
  const closeIdx = workflow.indexOf("\n          ]", routesIdx);
  assert.ok(closeIdx > -1);
  const block = workflow.slice(routesIdx, closeIdx);
  const tuples = [...block.matchAll(/\("([\w-]+)",\s*"([^"]*)"\)/g)].map((m) => ({ slug: m[1]!, route: m[2]! }));
  assert.equal(tuples.length, 20);
  const expected = PHASE3B_ROUTE_ENTRIES.map((entry) => ({ slug: entry.slug, route: entry.route }));
  assert.deepEqual(tuples, expected);
});

test("25 os.walk (not glob) used in the route aggregation merge, so hidden .diagnostics files are found", () => {
  const workflow = readRepo(WORKFLOW);
  const mergeIdx = workflow.indexOf("Merge per-route diagnostics");
  assert.ok(mergeIdx > -1);
  const block = workflow.slice(mergeIdx, mergeIdx + 6000);
  assert.match(block, /os\.walk\(root\)/);
  assert.doesNotMatch(block, /glob\.glob\(/);
});

test("26 aggregation job never claims a Phase 3B PASS and carries the standard non-claims footer", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.doesNotMatch(block, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.match(block, /draws no new pass\/fail (verdict|conclusion) of its own/i);
  assert.match(block, /remains OPEN/i);
  assert.match(block, /remains PENDING/i);
});

test("27 aggregation job uploads its own aggregate artifact including gate-e-phase3b-route-aggregate.json", () => {
  const workflow = readRepo(WORKFLOW);
  const aggregateIdx = workflow.indexOf("gate-e-phase3b-aggregate:");
  const block = workflow.slice(aggregateIdx);
  assert.match(block, /gate-e-phase3b-evidence-aggregate-\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(block, /gate-e-phase3b-route-aggregate\.json/);
});

// --- Docs --------------------------------------------------------------

test("28 route sharding plan doc exists — rationale, 20-route matrix, no monolithic job, result interpretation, no overclaims", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /[Rr]oute-[Ll]evel [Ss]harding/);
  assert.match(doc, /20 route/i);
  assert.match(doc, /fail-fast:\s*false/);
  assert.match(doc, /max-parallel:\s*1/);
  assert.match(doc, /gate-e-phase3b-aggregate/);
  assert.match(doc, /Result Interpretation/i);
  assert.match(doc, /no monolithic|not a monolithic|superseded/i);
  assert.doesNotMatch(doc, /Phase 3B:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
  assert.match(doc, /P0.*OPEN/i);
  assert.match(doc, /Gate F.*PENDING/i);
});

test("29 route sharding plan doc does not authorize or dispatch attempt 15", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /[Aa]ttempt 15.{0,80}(not authorized|NOT authorized|NOT AUTHORIZED)/);
  assert.match(doc, /NOT DISPATCHED|does not dispatch/i);
  assert.doesNotMatch(doc, /gh\s+workflow\s+run\s+gate-e-phase3b-manual\.yml.{0,10}$/m);
});

test("30 route sharding plan doc references attempt 14's RUNNER_SHUTDOWN_SIGNAL as the motivating evidence", () => {
  const doc = readRepo(PLAN_DOC);
  assert.match(doc, /RUNNER_SHUTDOWN_SIGNAL/);
  assert.match(doc, /attempt 14/i);
});

test("31 isolated runner plan cross-references the route-sharding plan (new §5d)", () => {
  const plan = readRepo(ISOLATED_RUNNER_PLAN);
  assert.match(plan, /GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03/);
  assert.match(plan, /5d\. Route-Level Sharding/);
  assert.doesNotMatch(plan, /Phase 3B:\s*\*\*PASS\*\*/i);
});

test("32 evidence index references the route-sharding plan with no overclaims", () => {
  const index = readRepo(EVIDENCE_INDEX);
  assert.match(index, /GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03/);
  assert.match(index, /route.{0,20}shard/i);
  assert.doesNotMatch(index, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(index, /Launch stance:\s*\*\*GO\*\*/i);
});

test("33 attempt14 result doc references the route-sharding follow-up without changing its own RUNNER_SHUTDOWN_SIGNAL classification", () => {
  const doc = readRepo(ATTEMPT14_RESULT);
  assert.match(doc, /RUNNER_SHUTDOWN_SIGNAL/);
  assert.match(doc, /route.{0,30}shard|GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03/i);
});

test("34 no test in this file or the workflow prints an actual token value", () => {
  const source = readFrontend("scripts/gate-e-phase3b-route-sharding.test.ts");
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)\([^)]*TWIN_ACCESS_TOKEN\s*[,)]/);
  const workflow = readRepo(WORKFLOW);
  assert.doesNotMatch(workflow, /echo\s+["']?\$TWIN_ACCESS_TOKEN["']?\s*$/m);
});

test("35 no gh workflow dispatch commands anywhere in this task's diff surface (helper, spec, or this test file)", () => {
  const helper = readFrontend("e2e/helpers/phase3b-controlled-routes.ts");
  const spec = readFrontend("e2e/phase3b-controlled-multitab.spec.ts");
  const source = readFrontend("scripts/gate-e-phase3b-route-sharding.test.ts");
  for (const file of [helper, spec, source]) {
    assert.doesNotMatch(file, /gh\s+workflow\s+run/);
    assert.doesNotMatch(file, /gh\s+api[^\n]*dispatches/);
  }
});
