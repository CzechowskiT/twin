/**
 * Product Polish 1.0 P0 — limited-launch surface controls (frontend-only).
 * Hide/simplify without deleting routes or backend wiring.
 */
import {
  collectFounderLedDemoHrefs,
  FOUNDER_LED_DEMO_EXTENDED_ROUTES,
} from "@/lib/founder-led-demo-routes";
import { RECRUITER_DAILY_COCKPIT_ROUTE } from "@/lib/recruiter-daily-operating-cockpit";
import { RECRUITER_TRUST_REVIEW_QUEUE_ROUTE } from "@/lib/recruiter-trust-review-queue";

/** Auto-apply strip may show for REVIEW_BEFORE_SUBMIT readiness; not autonomous submit. */
export const SHOW_DASHBOARD_AUTO_APPLY_STRIP = true;

/** Secondary dashboard islands collapsed on home — subroutes stay live. */
export const SHOW_DASHBOARD_EXTENDED_HOME_MODULES = false;

/** Recruiter hub promo cards (Daily Cockpit, Trust Review) — roadmap only. */
export const SHOW_RECRUITER_HUB_PRIMARY_PROMOS = false;

const PILOT_PREVIEW_ALLOWLIST = new Set([
  "/demo",
  "/dashboard",
  "/dashboard/jobs",
  "/dashboard/matches",
  "/dashboard/applications",
  "/dashboard/calendar",
  "/profile",
  "/recruiter",
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/jobs",
  "/recruiter/search",
  "/recruiter/analytics",
  "/company/dashboard",
  "/company/roles",
  "/company/pipeline",
  "/for-companies",
  "/for-candidates",
  "/for-recruiters",
  "/for-investors",
  "/investor",
]);

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

function buildPilotPreviewDeepLinkPaths(): readonly string[] {
  const paths = new Set<string>([
    ...collectFounderLedDemoHrefs(),
    ...FOUNDER_LED_DEMO_EXTENDED_ROUTES,
    RECRUITER_DAILY_COCKPIT_ROUTE,
    RECRUITER_TRUST_REVIEW_QUEUE_ROUTE,
  ]);
  return [...paths].filter(
    (p) =>
      p !== "/" &&
      !p.startsWith("/for-") &&
      !PILOT_PREVIEW_ALLOWLIST.has(p),
  );
}

const PILOT_PREVIEW_DEEP_LINK_PATHS = buildPilotPreviewDeepLinkPaths();

/** Public auth/landing — never show the global pilot preview bar in site chrome. */
const PILOT_PREVIEW_CHROME_EXCLUDED_PREFIXES = [
  "/login",
  "/register",
  "/waitlist",
  "/first-1000",
  "/demo",
  "/how-it-works",
] as const;

function isPilotPreviewChromeExcludedPath(pathname: string): boolean {
  const base = normalizePath(pathname);
  return PILOT_PREVIEW_CHROME_EXCLUDED_PREFIXES.some(
    (p) => base === p || base.startsWith(`${p}/`),
  );
}

/** True for founder-led demo deep links outside core limited-launch surfaces. */
export function isPilotPreviewDeepLinkPath(pathname: string): boolean {
  const base = normalizePath(pathname);
  if (PILOT_PREVIEW_ALLOWLIST.has(base)) return false;
  return PILOT_PREVIEW_DEEP_LINK_PATHS.some(
    (p) => base === p || base.startsWith(`${p}/`),
  );
}

/** True when site chrome should mount the pilot preview boundary banner. */
export function isPilotPreviewChromePath(pathname: string): boolean {
  if (isPilotPreviewChromeExcludedPath(pathname)) return false;
  return isPilotPreviewDeepLinkPath(pathname);
}

export const PILOT_PREVIEW_BOUNDARY_MARKER = "pilot-preview-boundary";
