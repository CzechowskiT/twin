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

test("2 phase3b route helper and e2e spec exist with harness diagnostics", () => {
  const helper = read("e2e/helpers/phase3b-controlled-routes.ts");
  assert.match(helper, /PHASE3B_ROUTE_BATCHES/);
  assert.match(helper, /PHASE3B_ALL_ROUTES/);
  assert.match(helper, /PHASE3B_ROUTE_COUNT/);
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /withFreshContext/);
  assert.match(spec, /phase3b-harness-diagnostics/);
  assert.match(spec, /buildPhase3bPreflightSnapshot/);
  assert.match(spec, /PHASE3B_ROUTE_BATCHES/);
  assert.doesNotMatch(spec, /fda7567/);
  assert.doesNotMatch(spec, /EXPECTED_PROD_COMMIT/);

  const diagHelper = read("e2e/helpers/phase3b-harness-diagnostics.ts");
  assert.match(diagHelper, /classifyPhase3bRouteAuth/);
  assert.match(diagHelper, /AUTH_TOKEN_REQUIRED/);
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
  assert.match(doc, /20 routes/i);

  const plan = readRepo("docs/PHASE3B_MULTITAB_HARNESS_DIAGNOSTIC_PLAN_2026-06-29.md");
  assert.match(plan, /harness diagnostic/i);
});

test("6 smoke.yml excludes playwright and phase3b browser smokes", () => {
  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
});

test("7 founder review — Gate B YES, Gate C YES, Gate E FAIL, Phase 3B prod 0/20", () => {
  const founderReview = readRepo("docs/P0_SHELL_FOUNDER_REVIEW_2026-06-28.md");
  assert.match(founderReview, /Phase 3B.*FAIL/i);
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

test("9 slice12 founder signoff checklist — Gate B YES, Gate C YES, Gate D YES, Gate E FAIL", () => {
  const checklist = readRepo("docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md");
  assert.match(checklist, /Slice 12 Founder Sign-Off Checklist/i);
  assert.match(checklist, /Gate B.*YES/i);
  assert.match(checklist, /Gate C.*YES/i);
  assert.match(checklist, /Gate D.*YES/i);
  assert.match(checklist, /Gate E.*YES/i);
  assert.match(checklist, /36 routes/i);
  assert.match(checklist, /20 routes/i);
  assert.match(checklist, /7 \+ 7 \+ 6/);
  assert.match(checklist, /Phase 3B.*FAIL/i);
  assert.match(checklist, /P0 performance.*OPEN/i);
  assert.match(checklist, /Public launch.*NO-GO/i);
  assert.match(checklist, /gate-c-browser-validation-result-2026-06-28/i);
  assert.match(checklist, /gate-d-prod-browser-smoke-result-2026-06-28/i);
  assert.match(checklist, /gate-e-phase3b-result-2026-06-28/i);

  const launchStance = read("src/lib/investor-metrics-reality.ts");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});

test("10 gate d decision package — Gate D PENDING, prod env flags documented, no overclaims", () => {
  const gateD = readRepo("docs/gate-d-prod-browser-smoke-decision-2026-06-28.md");
  assert.match(gateD, /Gate D.*PENDING/i);
  assert.match(gateD, /Gate B.*YES/i);
  assert.match(gateD, /Gate C.*YES/i);
  assert.match(gateD, /Gate E.*PENDING/i);
  assert.match(gateD, /PLAYWRIGHT_ALLOW_PROD_SMOKE=1/);
  assert.match(gateD, /PLAYWRIGHT_SKIP_WEBSERVER=1/);
  assert.match(gateD, /Phase 3B.*HARD BLOCKED/i);
  assert.match(gateD, /P0.*OPEN/i);
  assert.match(gateD, /NO-GO/i);
  assert.doesNotMatch(gateD, /\| \*\*P0:\*\* \| \*\*CLOSED\*\*/);
  assert.doesNotMatch(gateD, /Launch stance:\s*\*\*GO\*\*/i);

  const spec = read("e2e/p0-no-headless-final-state-browser.spec.ts");
  assert.match(spec, /PLAYWRIGHT_ALLOW_PROD_SMOKE=1/);
  assert.match(spec, /PLAYWRIGHT_SKIP_WEBSERVER=1/);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /p0-no-headless-final-state-browser/);
});

test("11 gate e prerequisites — doc exists, PENDING, Gate D PASS prerequisite, no overclaims", () => {
  const gateE = readRepo("docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md");
  assert.match(gateE, /Gate E.*PENDING/i);
  assert.match(gateE, /Gate D.*YES|Gate D.*PASS/i);
  assert.match(gateE, /Gate B.*YES/i);
  assert.match(gateE, /Gate C.*YES/i);
  assert.match(gateE, /Phase 3B.*HARD BLOCKED/i);
  assert.match(gateE, /20 routes/i);
  assert.match(gateE, /7 \+ 7 \+ 6/);
  assert.match(gateE, /P0.*OPEN/i);
  assert.match(gateE, /NO-GO/i);
  assert.match(gateE, /does NOT approve Gate E/i);
  assert.doesNotMatch(gateE, /Launch stance:\s*\*\*GO\*\*/i);

  const checklist = readRepo("docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md");
  assert.match(checklist, /gate-e-phase3b-prerequisites-decision-2026-06-28/i);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab-browser/);

  const launchStance = read("src/lib/investor-metrics-reality.ts");
  assert.match(launchStance, /LAUNCH_STANCE\s*=\s*"noGo"/);
});

test("12 npm script test:phase3b-harness-diagnostics registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-harness-diagnostics/);
  assert.match(pkg, /phase3b-harness-diagnostics\.test\.ts/);
});

test("13 slice25 evidence index — exists, Phase 3B FAIL, harness diagnostics", () => {
  const evidenceIndex = readRepo("docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md");
  assert.match(evidenceIndex, /Launch Readiness Evidence Index/);
  assert.match(evidenceIndex, /Phase 3B.*FAIL/i);
  assert.match(evidenceIndex, /Gate E.*YES/i);
  assert.match(evidenceIndex, /0\/20/i);
  assert.match(evidenceIndex, /test:phase3b-harness-diagnostics/);
  assert.doesNotMatch(evidenceIndex, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(evidenceIndex, /Launch stance:\s*\*\*GO\*\*/i);

  const founderChecklist = readRepo("docs/FOUNDER_DEMO_CHECKLIST_2026-06-28.md");
  assert.match(founderChecklist, /Founder Demo Checklist/);
});

test("14 gate d preflight — no Phase 3B; Gate E cannot run by default; no CI browser", () => {
  const preflight = readRepo("docs/gate-d-prod-browser-smoke-preflight-2026-06-28.md");
  assert.match(preflight, /Gate D.*PENDING/i);
  assert.match(preflight, /Phase 3B.*HARD BLOCKED/i);
  assert.match(preflight, /no Phase 3B|does not.*Phase 3B/i);

  const gateE = readRepo("docs/gate-e-phase3b-prerequisites-decision-2026-06-28.md");
  assert.match(gateE, /Gate E.*PENDING/i);
  assert.match(gateE, /does NOT approve Gate E/i);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /playwright test/i);
});

test("15 readiness consistency lock — decision docs aligned; Gate D PASS allowed in post-pass docs", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:readiness-consistency-lock/);

  const postPassDocs = [
    "docs/LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md",
    "docs/SLICE12_FOUNDER_SIGNOFF_CHECKLIST_2026-06-28.md",
  ];
  for (const doc of postPassDocs) {
    const content = readRepo(doc);
    assert.match(content, /NO-GO/i, doc);
    assert.match(content, /P0.*OPEN/i, doc);
    assert.match(content, /Gate D.*YES/i, doc);
    assert.match(content, /Gate E.*YES/i, doc);
    assert.match(content, /Phase 3B.*FAIL/i, doc);
  }

  const historicalGateE = readRepo("docs/GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md");
  assert.match(historicalGateE, /Gate E.*PENDING/i);
  assert.match(historicalGateE, /Phase 3B.*(NOT RUN|HARD BLOCKED)/i);

  const historicalGateD = readRepo("docs/gate-d-prod-browser-smoke-decision-2026-06-28.md");
  assert.match(historicalGateD, /Gate D.*PENDING/i);
});

test("16 gate e founder decision package — PENDING, references Gate D PASS, command not default CI", () => {
  const gateEPackage = readRepo("docs/GATE_E_FOUNDER_DECISION_PACKAGE_2026-06-28.md");
  assert.match(gateEPackage, /Gate E.*PENDING/i);
  assert.match(gateEPackage, /gate-d-prod-browser-smoke-result-2026-06-28\.md/);
  assert.match(gateEPackage, /36\/36 PASS/i);
  assert.match(gateEPackage, /Phase 3B.*(NOT RUN|HARD BLOCKED)/i);
  assert.match(gateEPackage, /test:phase3b-controlled-multitab-prod/);
  assert.match(gateEPackage, /PLAYWRIGHT_ALLOW_PROD_SMOKE=1/);

  const pkg = read("package.json");
  assert.match(pkg, /test:gate-e-founder-decision-package/);
  assert.match(pkg, /test:e2e.*DISABLED/i);
  assert.doesNotMatch(pkg, /"test":\s*"playwright test"/);

  const smokeWorkflow = readRepo(".github/workflows/smoke.yml");
  assert.doesNotMatch(smokeWorkflow, /phase3b-controlled-multitab/);
});
