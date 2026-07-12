/**
 * Seven-day D3 recruiter slice — public-ready core nav + analytics preview;
 * integrations roadmap; talent modules pilot-only; calendar hidden.
 * Frontend/UI only — builds on Product Polish P0–P4.
 */

export { SHOW_RECRUITER_HUB_PRIMARY_PROMOS } from "@/lib/product-polish-p0";

/** Wave 1 — roadmap promo cards hidden from recruiter hub (deep links preserved). */
export const SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED = false;

/** Wave 2B slice 2 — pipeline read-only stage board confirmed GREEN_WORKING (was visible in Wave 1; M7 smoke-close). */
export const RECRUITER_PIPELINE_SHIP_STATUS = "live" as const;

/** Wave 2A — analytics read-only workspace aggregates ship as Live (GREEN_WORKING). */
export const RECRUITER_ANALYTICS_SHIP_STATUS = "live" as const;

/** Wave 2A — analytics restored to workspace hub/nav (was hidden in Wave 1). */
export const HIDE_RECRUITER_ANALYTICS_FROM_HUB = false;

/** Integrations stay roadmap — no live ATS sync impression. */
export const RECRUITER_INTEGRATIONS_ROADMAP_STATUS = "coming_soon" as const;

/** Wave 1 reversed — integrations visible on workspace hub with COMING SOON badge. */
export const HIDE_RECRUITER_INTEGRATIONS_FROM_HUB = false;

/** Integrations stay in workspace; roadmap anchor is additional context only. */
export const RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE = false;

/** Integrations restored to extended workspace nav. */
export const HIDE_RECRUITER_INTEGRATIONS_FROM_NAV = false;

export { RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";

/** Recruiter calendar hidden from primary nav and hub. */
export const HIDE_RECRUITER_CALENDAR_FROM_NAV = true;

/** Extended recruiter nav collapsed by default — core ≤5 on hub home. */
export const RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT = true;

/** Primary recruiter surfaces (≤5 green) — inbox, pipeline, jobs, search, analytics. */
export const RECRUITER_PRIMARY_NAV_HREFS = [
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/jobs",
  "/recruiter/search",
  "/recruiter/analytics",
] as const;

/** Demo journeys collapsed — human decision required, not primary core. */
export const COLLAPSE_RECRUITER_DEMO_JOURNEYS = true;

/** Talent Radar limited pilot — internal data only, no external sourcing claims. */
export const TALENT_RADAR_LIMITED_PILOT = true;

/** Talent Pool limited pilot — no marketplace or auto outreach. */
export const TALENT_POOL_LIMITED_PILOT = true;

/** Integrations page honest boundary — no live ATS/marketplace sync. */
export const INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC = true;
