/**
 * Public-only production probe route inventory — no auth, no mutations.
 * Used by prod-public-probe-suite.ts for 100+ safe GET probes.
 */

/** Marketing + legal + status surfaces (unauthenticated). */
export const PROD_PUBLIC_FE_ROUTES = [
  "/",
  "/demo",
  "/faq",
  "/how-it-works",
  "/status",
  "/privacy",
  "/terms",
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
  "/for-investors",
  "/investor",
  "/investor/product-proof",
  "/login/candidate",
  "/login/recruiter",
  "/login/company",
  "/login/investor",
  "/dashboard/trust",
] as const;

/** Read-only API probes (no auth). */
export const PROD_PUBLIC_API_ROUTES = [
  "/api/public-health",
  "/api/public-health?mode=liveness",
] as const;

/** Railway direct API (read-only health). */
export const PROD_RAILWAY_API_ROUTES = [
  "/api/v1/health",
  "/api/v1/health?db=true",
] as const;

export const RAILWAY_API_BASE = "https://twin-production-bcd9.up.railway.app";
export const VERCEL_FE_BASE = "https://twin-sooty.vercel.app";
