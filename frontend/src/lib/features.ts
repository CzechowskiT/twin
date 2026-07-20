/** Feature flags from env (build-time). */

/** Manual scrape panel — ops only unless NEXT_PUBLIC_SHOW_SCRAPE=true (autonomous beat is default). */
export const SHOW_SCRAPE_UI = process.env.NEXT_PUBLIC_SHOW_SCRAPE === "true";

/** Microsoft Graph read-only busy-read — default off until product gate opens. */
export const MICROSOFT_BUSY_READ_ENABLED =
  process.env.NEXT_PUBLIC_MICROSOFT_BUSY_READ_ENABLED === "true";

/** Microsoft OAuth connect UI for busy-read — default off (no-op connect). */
export const MICROSOFT_OAUTH_CONNECT_GATE_ENABLED =
  process.env.NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED === "true";

/**
 * Activation experiment: after onboarding, send candidates to matches (TTV)
 * instead of the generic dashboard. Default ON; set NEXT_PUBLIC_TTV_MATCHES_REDIRECT=false to roll back.
 */
export const TTV_MATCHES_REDIRECT_ENABLED =
  process.env.NEXT_PUBLIC_TTV_MATCHES_REDIRECT !== "false";

/**
 * Post-onboarding matching status banner on /dashboard/matches?activated=1.
 * Default ON; set NEXT_PUBLIC_ACTIVATION_MATCHING_STATUS_ENABLED=false to hide.
 */
export const ACTIVATION_MATCHING_STATUS_ENABLED =
  process.env.NEXT_PUBLIC_ACTIVATION_MATCHING_STATUS_ENABLED !== "false";

/** Optional client dual-write of funnel events via analytics.ts (consent-gated). */
export const PRODUCT_FUNNEL_CLIENT_ENABLED =
  process.env.NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT !== "false";
