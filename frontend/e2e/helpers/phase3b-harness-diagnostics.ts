/**
 * Phase 3B multitab harness diagnostics — route auth tiers, failure classification,
 * and prod preflight commit gate (frontend_commit vs api_commit separate).
 */
import { execSync } from "node:child_process";

import {
  PHASE3B_CANDIDATE_ROUTES,
  PHASE3B_COMPANY_ROUTES,
  PHASE3B_PUBLIC_ROUTES,
  PHASE3B_RECRUITER_ROUTES,
} from "./phase3b-controlled-routes";

export const PHASE3B_DIAGNOSTIC_CLASSIFICATIONS = [
  "PASS",
  "PARTIAL",
  "WARN",
  "COMMIT_MISMATCH",
  "AUTH_TOKEN_REQUIRED",
  "HARNESS_INSTRUMENTATION_FAILURE",
  "BLANK_OR_NO_CONTENT",
  "STUCK_SKELETON",
  "HTTP_404",
  "NOT_FOUND_PAGE",
  "REDIRECT_STORM",
  "CONSOLE_BURST",
  "PUBLIC_HEALTH_LOOP",
  "AUTH_GATE_LOOP",
  "MARQUEE_REMOUNT_LOOP",
  "HEAP_FAIL",
  "DOM_FAIL",
  "SAFE_MARQUEE_OVERFLOW",
  "FULL_MARQUEE_DOM",
] as const;

export type Phase3bDiagnosticClassification = (typeof PHASE3B_DIAGNOSTIC_CLASSIFICATIONS)[number];

export type Phase3bRouteAuthTier = "public" | "auth-gated" | "token-required";

export type Phase3bPublicHealthFields = {
  status: string;
  db_ok: boolean;
  frontend_commit: string | null;
  api_commit: string | null;
  git_commit: string | null;
  commit_interpretation: string | null;
};

export type Phase3bPreflightSnapshot = {
  ok: boolean;
  classification: "PREFLIGHT_OK" | "COMMIT_MISMATCH" | "PUBLIC_HEALTH_UNAVAILABLE";
  frontendCommitExpected: string | null;
  frontendCommitActual: string | null;
  apiCommitActual: string | null;
  frontendCommitMismatch: boolean;
  publicHealthStatus: string | null;
  publicHealthDbOk: boolean | null;
  commitInterpretation: string | null;
};

export type Phase3bDomProbe = {
  visibleTextLength: number;
  mainVisible: boolean;
  shellReady: boolean;
  shellSkeleton: boolean;
  hasAuthCard: boolean;
  hasNotFound: boolean;
  pathname: string;
  documentTitle: string;
  rootPresent: boolean;
  marketingLogoNodes: number;
  safeMarqueeLogoNodes: number;
};

export type Phase3bCdpProbe = {
  jsHeapUsedMb: number | null;
  domNodes: number | null;
  layoutCount: number | null;
  cdpStatus: "ok" | "unavailable" | "timeout";
};

export type Phase3bRouteEvaluationInput = {
  route: string;
  authTier: Phase3bRouteAuthTier;
  hasAccessToken: boolean;
  httpStatus: number | null;
  dom: Phase3bDomProbe;
  cdp: Phase3bCdpProbe;
  redirectCount: number;
  consoleErrorCount: number;
  pageErrorCount: number;
  publicHealthRequestCount: number;
  authGateNavCount: number;
  marqueeRemountCount: number;
  maxRedirects: number;
  maxConsoleErrors: number;
  maxPublicHealthRequests: number;
  maxAuthGateNavigations: number;
  minVisibleText: number;
  heapFailMb: number;
  heapWarnMb: number;
  domFail: number;
  domWarn: number;
  safeMarqueeMaxNodes: number;
  fullMarqueeFailNodes: number;
};

const TOKEN_REQUIRED_ROUTES = new Set<string>([
  ...PHASE3B_CANDIDATE_ROUTES,
  ...PHASE3B_RECRUITER_ROUTES,
  ...PHASE3B_COMPANY_ROUTES,
]);

const PUBLIC_ROUTES = new Set<string>([...PHASE3B_PUBLIC_ROUTES]);

function repoHead(): string | null {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function shasAligned(a: string, b: string): boolean {
  if (!a || !b) return false;
  const shortA = a.slice(0, 7);
  const shortB = b.slice(0, 7);
  return a.startsWith(shortB) || b.startsWith(shortA) || shortA === shortB;
}

/** Classify route auth expectation for Phase 3B diagnostics. */
export function classifyPhase3bRouteAuth(route: string): Phase3bRouteAuthTier {
  if (PUBLIC_ROUTES.has(route)) return "public";
  if (TOKEN_REQUIRED_ROUTES.has(route)) return "token-required";
  if (
    route.startsWith("/login") ||
    route.startsWith("/register") ||
    route.startsWith("/workspace")
  ) {
    return "auth-gated";
  }
  return "auth-gated";
}

export function parsePhase3bPublicHealth(json: Record<string, unknown>): Phase3bPublicHealthFields {
  return {
    status: String(json.status ?? "unknown"),
    db_ok: Boolean(json.db_ok),
    frontend_commit: json.frontend_commit ? String(json.frontend_commit) : null,
    api_commit: json.api_commit ? String(json.api_commit) : null,
    git_commit: json.git_commit ? String(json.git_commit) : null,
    commit_interpretation: json.commit_interpretation ? String(json.commit_interpretation) : null,
  };
}

/** Prod preflight — frontend_commit alignment; api_commit tracked separately. */
export function buildPhase3bPreflightSnapshot(
  health: Phase3bPublicHealthFields,
  expectedFrontendCommit: string | null = process.env.PLAYWRIGHT_EXPECTED_FRONTEND_COMMIT?.trim() || repoHead(),
): Phase3bPreflightSnapshot {
  const frontendActual = health.frontend_commit;
  const apiActual = health.api_commit ?? health.git_commit;
  const healthOk = health.status === "ok";
  if (!healthOk || !frontendActual) {
    return {
      ok: false,
      classification: "PUBLIC_HEALTH_UNAVAILABLE",
      frontendCommitExpected: expectedFrontendCommit,
      frontendCommitActual: frontendActual,
      apiCommitActual: apiActual,
      frontendCommitMismatch: false,
      publicHealthStatus: health.status,
      publicHealthDbOk: health.db_ok,
      commitInterpretation: health.commit_interpretation,
    };
  }
  const mismatch =
    Boolean(expectedFrontendCommit) && !shasAligned(frontendActual, expectedFrontendCommit!);
  return {
    ok: !mismatch,
    classification: mismatch ? "COMMIT_MISMATCH" : "PREFLIGHT_OK",
    frontendCommitExpected: expectedFrontendCommit,
    frontendCommitActual: frontendActual,
    apiCommitActual: apiActual,
    frontendCommitMismatch: mismatch,
    publicHealthStatus: health.status,
    publicHealthDbOk: health.db_ok,
    commitInterpretation: health.commit_interpretation,
  };
}

function isWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/company") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  );
}

/** Map route probe data to a primary diagnostic classification. */
export function classifyPhase3bRouteFailure(input: Phase3bRouteEvaluationInput): {
  classification: Phase3bDiagnosticClassification;
  failReasons: string[];
  warnReasons: string[];
  status: "PASS" | "PARTIAL" | "WARN" | "FAIL";
} {
  const failReasons: string[] = [];
  const warnReasons: string[] = [];
  const loginWithNext = input.dom.pathname.includes("/login") && !input.route.startsWith("/login");

  if (input.httpStatus === 404) failReasons.push("http-404");
  if (input.dom.hasNotFound && input.dom.visibleTextLength < input.minVisibleText) {
    failReasons.push("not-found-page");
  }

  const domEvalFailed =
    !input.dom.pathname &&
    input.httpStatus === 200 &&
    input.dom.visibleTextLength === 0 &&
    !input.dom.rootPresent;
  if (domEvalFailed) failReasons.push("harness-instrumentation-failure");

  const hasContent =
    input.dom.visibleTextLength >= input.minVisibleText ||
    input.dom.hasAuthCard ||
    input.dom.shellReady ||
    input.dom.mainVisible;

  if (
    input.authTier === "token-required" &&
    !input.hasAccessToken &&
    (loginWithNext || input.dom.hasAuthCard || (!hasContent && !loginWithNext))
  ) {
    failReasons.push("auth-token-required");
  } else if (!hasContent && !loginWithNext && !domEvalFailed) {
    failReasons.push("blank-or-no-content");
  }

  if (input.dom.shellSkeleton && !input.dom.shellReady && !input.dom.hasAuthCard &&
    input.dom.visibleTextLength < input.minVisibleText) {
    failReasons.push("stuck-skeleton");
  }
  if (input.redirectCount > input.maxRedirects) failReasons.push(`redirect-storm:${input.redirectCount}`);
  if (input.consoleErrorCount > input.maxConsoleErrors) {
    failReasons.push(`console-burst:${input.consoleErrorCount}`);
  }
  if (input.pageErrorCount > 0) failReasons.push(`page-error:${input.pageErrorCount}`);
  if (input.publicHealthRequestCount > input.maxPublicHealthRequests) {
    failReasons.push(`public-health-loop:${input.publicHealthRequestCount}`);
  }
  if (input.authGateNavCount > input.maxAuthGateNavigations) {
    failReasons.push(`auth-gate-loop:${input.authGateNavCount}`);
  }
  if (input.marqueeRemountCount > 2) {
    failReasons.push(`marquee-remount-loop:${input.marqueeRemountCount}`);
  }
  if (isWorkspacePath(input.dom.pathname)) {
    if (input.dom.marketingLogoNodes >= input.fullMarqueeFailNodes) {
      failReasons.push(`89-logo-dom:${input.dom.marketingLogoNodes}`);
    }
    if (input.dom.safeMarqueeLogoNodes > input.safeMarqueeMaxNodes) {
      failReasons.push(`safe-marquee-overflow:${input.dom.safeMarqueeLogoNodes}`);
    }
  }
  if (input.cdp.jsHeapUsedMb !== null) {
    if (input.cdp.jsHeapUsedMb > input.heapFailMb) failReasons.push(`heap-fail:${input.cdp.jsHeapUsedMb}MB`);
    else if (input.cdp.jsHeapUsedMb > input.heapWarnMb) warnReasons.push(`heap-warn:${input.cdp.jsHeapUsedMb}MB`);
  }
  if (input.cdp.domNodes !== null) {
    if (input.cdp.domNodes > input.domFail) failReasons.push(`dom-fail:${input.cdp.domNodes}`);
    else if (input.cdp.domNodes > input.domWarn) warnReasons.push(`dom-warn:${input.cdp.domNodes}`);
  }

  let classification: Phase3bDiagnosticClassification = "PASS";
  if (failReasons.some((r) => r.startsWith("auth-token-required"))) classification = "AUTH_TOKEN_REQUIRED";
  else if (failReasons.some((r) => r.startsWith("harness-instrumentation"))) {
    classification = "HARNESS_INSTRUMENTATION_FAILURE";
  } else if (failReasons.some((r) => r.startsWith("blank-or-no-content"))) classification = "BLANK_OR_NO_CONTENT";
  else if (failReasons.some((r) => r.startsWith("stuck-skeleton"))) classification = "STUCK_SKELETON";
  else if (failReasons.some((r) => r.startsWith("http-404"))) classification = "HTTP_404";
  else if (failReasons.some((r) => r.startsWith("not-found-page"))) classification = "NOT_FOUND_PAGE";
  else if (failReasons.some((r) => r.startsWith("redirect-storm"))) classification = "REDIRECT_STORM";
  else if (failReasons.some((r) => r.startsWith("console-burst"))) classification = "CONSOLE_BURST";
  else if (failReasons.some((r) => r.startsWith("public-health-loop"))) classification = "PUBLIC_HEALTH_LOOP";
  else if (failReasons.some((r) => r.startsWith("auth-gate-loop"))) classification = "AUTH_GATE_LOOP";
  else if (failReasons.some((r) => r.startsWith("marquee-remount-loop"))) classification = "MARQUEE_REMOUNT_LOOP";
  else if (failReasons.some((r) => r.startsWith("heap-fail"))) classification = "HEAP_FAIL";
  else if (failReasons.some((r) => r.startsWith("dom-fail"))) classification = "DOM_FAIL";
  else if (failReasons.some((r) => r.startsWith("safe-marquee-overflow"))) classification = "SAFE_MARQUEE_OVERFLOW";
  else if (failReasons.some((r) => r.startsWith("89-logo-dom"))) classification = "FULL_MARQUEE_DOM";
  else if (warnReasons.length > 0) classification = "WARN";

  let status: "PASS" | "PARTIAL" | "WARN" | "FAIL" = "PASS";
  if (failReasons.length > 0) {
    status = classification === "AUTH_TOKEN_REQUIRED" ? "PARTIAL" : "FAIL";
  } else if (loginWithNext && !input.hasAccessToken) {
    status = "PARTIAL";
    classification = "AUTH_TOKEN_REQUIRED";
  } else if (warnReasons.length > 0) {
    status = "WARN";
  }

  return { classification, failReasons, warnReasons, status };
}
