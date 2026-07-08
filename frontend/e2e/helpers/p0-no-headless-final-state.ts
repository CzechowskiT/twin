/**
 * P0 guardrail — detect headless / shell-only FINAL states vs valid auth, demo, or guided content.
 * Used by static guards and sequential browser smoke (workers=1, one page at a time).
 */

export const P0_MIN_VISIBLE_TEXT_CHARS = 40;
export const P0_MIN_MAIN_CONTENT_CHARS = 24;

export const P0_CRITICAL_PUBLIC_ROUTES = ["/", "/demo", "/for-companies"] as const;

export const P0_CRITICAL_CANDIDATE_ROUTES = [
  "/dashboard",
  "/dashboard/jobs",
  "/dashboard/matches",
  "/dashboard/trust",
  "/dashboard/trust/controls",
  "/profile",
  "/dashboard/profile",
  "/dashboard/cv",
  "/dashboard/hiring-journey",
  "/profile/hiring-journey",
] as const;

export const P0_CRITICAL_RECRUITER_ROUTES = [
  "/recruiter",
  "/recruiter/candidates/demo-candidate-001",
  "/recruiter/candidates/demo-candidate-001/trust",
  "/recruiter/candidates/demo-candidate-001/team",
  "/recruiter/candidates/demo-candidate-001/communication",
  "/recruiter/candidates/demo-candidate-001/collaboration",
  "/recruiter/jobs/demo-role-001/pipeline",
  "/recruiter/jobs/demo-role-001/team",
  "/recruiter/jobs/demo-role-001/tasks",
  "/recruiter/integrations/ats/import-readiness",
  "/recruiter/hiring-journey",
] as const;

export const P0_CRITICAL_COMPANY_ROUTES = [
  "/company/dashboard",
  "/company/candidates/demo-candidate-001",
  "/company/candidates/demo-candidate-001/trust",
  "/company/candidates/demo-candidate-001/team",
  "/company/candidates/demo-candidate-001/communication",
  "/company/candidates/demo-candidate-001/collaboration",
  "/company/roles/demo-role-001/pipeline",
  "/company/roles/demo-role-001/team",
  "/company/roles/demo-role-001/tasks",
  "/company/integrations/ats/import-readiness",
  "/company/hiring-journey",
] as const;

export const P0_CRITICAL_BOARD_ROUTES = ["/board/hiring-journey"] as const;

export const P0_CRITICAL_ALL_ROUTES = [
  ...P0_CRITICAL_PUBLIC_ROUTES,
  ...P0_CRITICAL_CANDIDATE_ROUTES,
  ...P0_CRITICAL_RECRUITER_ROUTES,
  ...P0_CRITICAL_COMPANY_ROUTES,
  ...P0_CRITICAL_BOARD_ROUTES,
] as const;

/** Selectors for pilot/demo/guided-not-found surfaces — valid final states. */
export const P0_PAGE_MARKER_SELECTORS = [
  "[data-candidate-profile-360-page]",
  "[data-candidate-trust-page]",
  "[data-candidate-trust-center-page]",
  "[data-candidate-collaboration-page]",
  "[data-safe-communication-page]",
  "[data-team-collaboration-page]",
  "[data-job-pipeline-page]",
  "[data-ats-import-readiness-page]",
  '[data-testid$="-not-found"]',
  '[data-testid="interactive-demo-page"]',
  '[data-testid="founder-demo-flow-page"]',
  "[data-workspace-status]",
  "[data-workspace-module-card]",
  '[data-hiring-journey-page="hiring-journey-page"]',
] as const;

export type P0DomFinalState = {
  pathname: string;
  visibleTextLength: number;
  mainContentLength: number;
  shellReady: boolean;
  shellSkeleton: boolean;
  hasAuthCard: boolean;
  hasAuthNextLink: boolean;
  hasPlannedMarker: boolean;
  hasDemoMarker: boolean;
  hasGuidedNotFound: boolean;
  hasMeaningfulError: boolean;
  isChromeOnly: boolean;
};

export type P0FinalStateVerdict = {
  pass: boolean;
  reason: string;
};

/** Pure evaluator — distinguishes valid auth cards from chrome-only shell frames. */
export function evaluateFinalState(dom: P0DomFinalState): P0FinalStateVerdict {
  if (dom.hasAuthCard) {
    return { pass: true, reason: dom.hasAuthNextLink ? "auth-card-with-next" : "auth-card" };
  }
  if (dom.hasGuidedNotFound) return { pass: true, reason: "guided-not-found" };
  if (dom.hasDemoMarker) return { pass: true, reason: "demo-or-pilot-marker" };
  if (dom.hasPlannedMarker) return { pass: true, reason: "planned-marker" };
  if (dom.hasMeaningfulError) return { pass: true, reason: "meaningful-error" };
  if (dom.mainContentLength >= P0_MIN_MAIN_CONTENT_CHARS) {
    return { pass: true, reason: "main-content" };
  }
  if (dom.shellSkeleton && !dom.shellReady && dom.mainContentLength < P0_MIN_MAIN_CONTENT_CHARS) {
    return { pass: false, reason: "stuck-skeleton" };
  }
  if (dom.isChromeOnly) return { pass: false, reason: "chrome-only-shell" };
  if (dom.visibleTextLength < P0_MIN_VISIBLE_TEXT_CHARS) {
    return { pass: false, reason: "blank-or-minimal-text" };
  }
  return { pass: false, reason: "headless-final-state" };
}

/** Browser-side DOM snapshot — keep in sync with evaluateFinalState inputs. */
export function snapshotFinalStateDom(): P0DomFinalState {
  const authCardRe =
    /sign in|zaloguj|auth required|wymagane logowanie|redirecting to sign in|przejdź do logowania|go to sign in|przekierowanie do logowania/i;
  const plannedRe = /not live|niedostępn|pilot|wstrzymany|paused|planowane|planned|demo snapshot|symulacj/i;
  const meaningfulErrorRe = /something went wrong|coś poszło nie tak|try again|spróbuj ponownie/i;

  const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
  const bodyText = normalize(document.body?.innerText ?? "");
  const bodyLower = bodyText.toLowerCase();

  const mainEl =
    document.querySelector("main") ??
    document.querySelector('[role="main"]') ??
    document.querySelector("article");
  const mainContentLength = normalize(mainEl?.textContent ?? "").length;

  const headerEl = document.querySelector("header");
  const headerTextLen = normalize(headerEl?.textContent ?? "").length;
  const marqueeNodes = document.querySelectorAll(
    ".company-logo-marquee, .performance-safe-logo-marquee",
  ).length;

  const markerSelectors = [
    "[data-candidate-profile-360-page]",
    "[data-candidate-trust-page]",
    "[data-candidate-trust-center-page]",
    "[data-candidate-control-center-page]",
    "[data-candidate-collaboration-page]",
    "[data-safe-communication-page]",
    "[data-team-collaboration-page]",
    "[data-job-pipeline-page]",
    "[data-ats-import-readiness-page]",
    '[data-testid$="-not-found"]',
    '[data-testid="interactive-demo-page"]',
    '[data-testid="founder-demo-flow-page"]',
    "[data-workspace-status]",
    "[data-workspace-module-card]",
    '[data-hiring-journey-page="hiring-journey-page"]',
  ];

  const hasDemoMarker = markerSelectors.some((sel) => document.querySelector(sel) !== null);
  const hasGuidedNotFound = Boolean(document.querySelector('[data-testid$="-not-found"]'));

  const authLinks = Array.from(document.querySelectorAll('a[href*="next="]'));
  const hasAuthNextLink = authLinks.some((a) => {
    const href = a.getAttribute("href") ?? "";
    return href.includes("next=") && authCardRe.test(a.textContent ?? bodyText);
  });

  const hasAuthCard = authCardRe.test(bodyText) || hasAuthNextLink;

  const isChromeOnly =
    mainContentLength < 24 &&
    !hasAuthCard &&
    !hasDemoMarker &&
    !hasGuidedNotFound &&
    (headerTextLen > 0 || marqueeNodes > 0) &&
    bodyText.length >= 40;

  return {
    pathname: window.location.pathname,
    visibleTextLength: bodyText.length,
    mainContentLength,
    shellReady: Boolean(document.querySelector("[data-testid='lightweight-route-shell-ready']")),
    shellSkeleton: Boolean(document.querySelector("[data-testid='lightweight-route-shell-skeleton']")),
    hasAuthCard,
    hasAuthNextLink,
    hasPlannedMarker: plannedRe.test(bodyLower),
    hasDemoMarker,
    hasGuidedNotFound,
    hasMeaningfulError: meaningfulErrorRe.test(bodyLower),
    isChromeOnly,
  };
}
