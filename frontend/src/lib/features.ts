/** Feature flags from env (build-time). */

/** Scrape panel on dashboard — on by default; set NEXT_PUBLIC_SHOW_SCRAPE=false to hide. */
export const SHOW_SCRAPE_UI = process.env.NEXT_PUBLIC_SHOW_SCRAPE !== "false";
