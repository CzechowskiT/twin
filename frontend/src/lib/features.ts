/** Feature flags from env (build-time). */

/** Manual scrape panel — ops only unless NEXT_PUBLIC_SHOW_SCRAPE=true (autonomous beat is default). */
export const SHOW_SCRAPE_UI = process.env.NEXT_PUBLIC_SHOW_SCRAPE === "true";
