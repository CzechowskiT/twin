/** Feature flags from env (build-time). */

/** Manual scrape panel — ops only unless NEXT_PUBLIC_SHOW_SCRAPE=true (autonomous beat is default). */
export const SHOW_SCRAPE_UI = process.env.NEXT_PUBLIC_SHOW_SCRAPE === "true";

/** Microsoft Graph read-only busy-read — default off until product gate opens. */
export const MICROSOFT_BUSY_READ_ENABLED =
  process.env.NEXT_PUBLIC_MICROSOFT_BUSY_READ_ENABLED === "true";

/** Microsoft OAuth connect UI for busy-read — default off (no-op connect). */
export const MICROSOFT_OAUTH_CONNECT_GATE_ENABLED =
  process.env.NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED === "true";
