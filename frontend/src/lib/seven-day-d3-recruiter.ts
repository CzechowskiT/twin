/**
 * Seven-day D3 recruiter slice — public-ready core nav + analytics preview;
 * integrations roadmap; talent modules pilot-only; calendar hidden.
 * Frontend/UI only — builds on Product Polish P0–P4.
 */

export { SHOW_RECRUITER_HUB_PRIMARY_PROMOS } from "@/lib/product-polish-p0";

/** Wave 1 — roadmap promo cards hidden from recruiter hub (deep links preserved). */
export const SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED = false;

/** Analytics ships as read-only workspace aggregates — hidden from hub until MAKE_GREEN (Wave 2). */
export const RECRUITER_ANALYTICS_SHIP_STATUS = "preview" as const;

/** Wave 1 — analytics preview hidden from workspace hub/nav (route preserved). */
export const HIDE_RECRUITER_ANALYTICS_FROM_HUB = true;

/** Integrations stay roadmap — no live ATS sync impression. */
export const RECRUITER_INTEGRATIONS_ROADMAP_STATUS = "coming_soon" as const;

/** Wave 1 — integrations hidden from workspace hub (route preserved). */
export const HIDE_RECRUITER_INTEGRATIONS_FROM_HUB = true;

/** Recruiter calendar hidden from primary nav and hub. */
export const HIDE_RECRUITER_CALENDAR_FROM_NAV = true;

/** Extended recruiter nav collapsed by default — core ≤5 on hub home. */
export const RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT = true;

/** Primary recruiter surfaces (≤4 green) — inbox, pipeline, jobs, search. */
export const RECRUITER_PRIMARY_NAV_HREFS = [
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/jobs",
  "/recruiter/search",
] as const;

/** Demo journeys collapsed — human decision required, not primary core. */
export const COLLAPSE_RECRUITER_DEMO_JOURNEYS = true;

/** Talent Radar limited pilot — internal data only, no external sourcing claims. */
export const TALENT_RADAR_LIMITED_PILOT = true;

/** Talent Pool limited pilot — no marketplace or auto outreach. */
export const TALENT_POOL_LIMITED_PILOT = true;

/** Integrations page honest boundary — no live ATS/marketplace sync. */
export const INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC = true;
