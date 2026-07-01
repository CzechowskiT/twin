/**
 * Phase 3B multitab harness diagnostics — static guards (Slice 35).
 * No browser; validates harness helper, spec wiring, and doc alignment.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PHASE3B_DIAGNOSTIC_CLASSIFICATIONS,
  buildPhase3bPreflightSnapshot,
  classifyPhase3bRouteAuth,
  classifyPhase3bRouteFailure,
  parsePhase3bPublicHealth,
} from "../e2e/helpers/phase3b-harness-diagnostics";
import { PHASE3B_ALL_ROUTES, PHASE3B_PUBLIC_ROUTES } from "../e2e/helpers/phase3b-controlled-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const baseDom = {
  visibleTextLength: 0,
  mainVisible: false,
  shellReady: false,
  shellSkeleton: false,
  hasAuthCard: false,
  hasNotFound: false,
  pathname: "",
  documentTitle: "",
  rootPresent: false,
  marketingLogoNodes: 0,
  safeMarqueeLogoNodes: 0,
};

const baseCdp = { jsHeapUsedMb: null, domNodes: null, layoutCount: null, cdpStatus: "unavailable" as const };

const baseEvalInput = {
  route: "/dashboard",
  authTier: "token-required" as const,
  hasAccessToken: false,
  httpStatus: 200,
  dom: baseDom,
  cdp: baseCdp,
  redirectCount: 0,
  consoleErrorCount: 0,
  pageErrorCount: 0,
  publicHealthRequestCount: 0,
  authGateNavCount: 0,
  marqueeRemountCount: 0,
  maxRedirects: 2,
  maxConsoleErrors: 12,
  maxPublicHealthRequests: 4,
  maxAuthGateNavigations: 3,
  minVisibleText: 40,
  heapFailMb: 180,
  heapWarnMb: 120,
  domFail: 15000,
  domWarn: 10000,
  safeMarqueeMaxNodes: 30,
  fullMarqueeFailNodes: 89,
};

test("1 no stale EXPECTED_PROD_COMMIT fda7567 in phase3b spec", () => {
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  assert.doesNotMatch(spec, /EXPECTED_PROD_COMMIT/);
  assert.doesNotMatch(spec, /fda75677c306aec76dbb83f65c483f8ba7cbe885/);
  assert.doesNotMatch(spec, /fda7567/);
});

test("2 spec derives frontend_commit from public-health; api_commit separate", () => {
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  const helper = read("e2e/helpers/phase3b-harness-diagnostics.ts");
  assert.match(spec, /parsePhase3bPublicHealth/);
  assert.match(spec, /buildPhase3bPreflightSnapshot/);
  assert.match(spec, /frontendCommitActual/);
  assert.match(spec, /apiCommitActual/);
  assert.match(helper, /frontend_commit/);
  assert.match(helper, /api_commit/);
  assert.match(helper, /git_commit/);
});

test("3 auth route classification — public, auth-gated, token-required", () => {
  assert.equal(classifyPhase3bRouteAuth("/"), "public");
  assert.equal(classifyPhase3bRouteAuth("/demo"), "public");
  assert.equal(classifyPhase3bRouteAuth("/for-companies"), "public");
  assert.equal(classifyPhase3bRouteAuth("/dashboard"), "token-required");
  assert.equal(classifyPhase3bRouteAuth("/recruiter"), "token-required");
  assert.equal(classifyPhase3bRouteAuth("/company/dashboard"), "token-required");
  for (const route of PHASE3B_PUBLIC_ROUTES) {
    assert.equal(classifyPhase3bRouteAuth(route), "public", route);
  }
  for (const route of PHASE3B_ALL_ROUTES) {
    const tier = classifyPhase3bRouteAuth(route);
    assert.ok(["public", "auth-gated", "token-required"].includes(tier), route);
  }
});

test("4 AUTH_TOKEN_REQUIRED when TWIN_ACCESS_TOKEN missing on token-required routes", () => {
  const verdict = classifyPhase3bRouteFailure({
    ...baseEvalInput,
    route: "/dashboard",
    authTier: "token-required",
    hasAccessToken: false,
    dom: { ...baseDom, hasAuthCard: true, pathname: "/login" },
  });
  assert.equal(verdict.classification, "AUTH_TOKEN_REQUIRED");
  assert.equal(verdict.status, "PARTIAL");
  assert.ok(verdict.failReasons.some((r) => r.includes("auth-token-required")));
});

test("5 diagnostic classification enum includes required values", () => {
  const required = [
    "COMMIT_MISMATCH",
    "AUTH_TOKEN_REQUIRED",
    "HARNESS_INSTRUMENTATION_FAILURE",
    "BLANK_OR_NO_CONTENT",
    "STUCK_SKELETON",
    "HTTP_404",
    "PASS",
    "PARTIAL",
    "WARN",
  ];
  for (const value of required) {
    assert.ok(PHASE3B_DIAGNOSTIC_CLASSIFICATIONS.includes(value as (typeof PHASE3B_DIAGNOSTIC_CLASSIFICATIONS)[number]), value);
  }
});

test("6 richer diagnostics fields in spec RouteReport", () => {
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  for (const field of [
    "documentTitle",
    "rootPresent",
    "pageErrorCount",
    "pageErrors",
    "consoleErrors",
    "classification",
    "authTier",
    "cdpStatus",
  ]) {
    assert.match(spec, new RegExp(field));
  }
});

test("7 commit mismatch fails preflight not post-route gate", () => {
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  assert.match(spec, /prod preflight/);
  assert.match(spec, /COMMIT_MISMATCH/);
  assert.match(spec, /preflight failed/);
  assert.doesNotMatch(spec, /post-route gate/i);
  assert.doesNotMatch(spec, /prod frontend commit matches fda7567/i);

  const snapshot = buildPhase3bPreflightSnapshot(
    parsePhase3bPublicHealth({
      status: "ok",
      db_ok: true,
      frontend_commit: "aaaa111111111111111111111111111111111111",
      api_commit: "bbbb222222222222222222222222222222222222",
    }),
    "cccc333333333333333333333333333333333333",
  );
  assert.equal(snapshot.classification, "COMMIT_MISMATCH");
  assert.equal(snapshot.ok, false);
  assert.equal(snapshot.frontendCommitMismatch, true);
  assert.equal(snapshot.apiCommitActual, "bbbb222222222222222222222222222222222222");
});

test("8 HARNESS_INSTRUMENTATION_FAILURE when dom probe empty on HTTP 200", () => {
  const verdict = classifyPhase3bRouteFailure({
    ...baseEvalInput,
    route: "/",
    authTier: "public",
    hasAccessToken: false,
    dom: { ...baseDom, pathname: "", rootPresent: false },
    httpStatus: 200,
  });
  assert.equal(verdict.classification, "HARNESS_INSTRUMENTATION_FAILURE");
});

test("9 npm script test:phase3b-harness-diagnostics registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:phase3b-harness-diagnostics/);
  assert.match(pkg, /phase3b-harness-diagnostics\.test\.ts/);
});

test("10 diagnostic plan doc exists; Phase 3B FAIL stance preserved", () => {
  const plan = readRepo("docs/PHASE3B_MULTITAB_HARNESS_DIAGNOSTIC_PLAN_2026-06-29.md");
  assert.match(plan, /Phase 3B Multitab Harness Diagnostic Plan/i);
  assert.match(plan, /frontend_commit/);
  assert.match(plan, /api_commit/);
  assert.match(plan, /AUTH_TOKEN_REQUIRED/);
  assert.match(plan, /COMMIT_MISMATCH/);
  assert.match(plan, /Phase 3B.*FAIL/i);
  assert.match(plan, /Gate E.*FAIL/i);
  assert.match(plan, /NO-GO/i);
  assert.match(plan, /P0.*OPEN/i);
  assert.doesNotMatch(plan, /Phase 3B.*\*\*PASS\*\*/i);
  assert.doesNotMatch(plan, /Launch stance:\s*\*\*GO\*\*/i);

  const gateE = readRepo("docs/gate-e-phase3b-result-2026-06-28.md");
  assert.match(gateE, /0\/20/i);
  assert.match(gateE, /verdict:\s+FAIL/i);
});

test("12 post-harness retry result — PARTIAL AUTH_TOKEN_REQUIRED, prior FAIL preserved", () => {
  const retryResult = readRepo("docs/gate-e-phase3b-retry-after-harness-fix-result-2026-06-29.md");
  assert.match(retryResult, /AUTH_TOKEN_REQUIRED/);
  assert.match(retryResult, /verdict:\s+PARTIAL/i);
  assert.match(retryResult, /token present in env:\s+false/i);
  assert.match(retryResult, /browser NOT RUN|NOT RUN/i);
  assert.match(retryResult, /Attempt 2 — Execution Record/);
  assert.match(retryResult, /post-harness retry #2/i);
  assert.match(retryResult, /Phase 3B.*FAIL/i);
  assert.match(retryResult, /0\/20/i);
  assert.doesNotMatch(retryResult, /Phase 3B:\s*\*\*PASS\*\*/i);
  const pkg = read("package.json");
  assert.match(pkg, /test:gate-e-retry-after-harness-fix-result/);
});
