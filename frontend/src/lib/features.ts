/** Feature flags from env (build-time). */

/** Job-board scrape buttons on dashboard — off by default (less noise). */
export const SHOW_SCRAPE_UI = process.env.NEXT_PUBLIC_SHOW_SCRAPE === "true";
