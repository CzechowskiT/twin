/**
 * Seven-day D3 recruiter slice — public-ready core nav + analytics preview;
 * integrations roadmap; talent modules pilot-only; calendar hidden.
 * Frontend/UI only — builds on Product Polish P0–P4.
 */

export { SHOW_RECRUITER_HUB_PRIMARY_PROMOS } from "@/lib/product-polish-p0";
export { SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED } from "@/lib/product-polish-p4";

/** Analytics ships as read-only workspace aggregates — Preview badge, not vague pilot. */
export const RECRUITER_ANALYTICS_SHIP_STATUS = "preview" as const;

/** Integrations stay roadmap — no live ATS sync impression. */
export const RECRUITER_INTEGRATIONS_ROADMAP_STATUS = "coming_soon" as const;

/** Recruiter calendar hidden from primary nav and hub. */
export const HIDE_RECRUITER_CALENDAR_FROM_NAV = true;

/** Extended recruiter nav collapsed by default — core ≤5 on hub home. */
export const RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT = true;

/** Primary recruiter surfaces (≤5) — inbox, pipeline, jobs, search, analytics. */
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
