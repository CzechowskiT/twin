/**
 * Seven-day D4 company slice — public-ready core hub + integrations roadmap;
 * hiring cockpit/team/talent pilot-only; billing hidden; no delegated apply.
 * Frontend/UI only — builds on Product Polish P0–P4.
 */

/** Violet hub promo cards (hiring cockpit / command center) — roadmap collapsed only. */
export const SHOW_COMPANY_HUB_PRIMARY_PROMOS = false;

/** Cockpit and command center tucked into collapsed roadmap on dashboard. */
export const SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED = true;

/** Single honest next action on dashboard when primary promos are off. */
export const SHOW_COMPANY_HUB_NEXT_ACTION = true;

/** Recommended first step for company operators — roles before pipeline depth. */
export const COMPANY_HUB_NEXT_ACTION_HREF = "/company/roles" as const;

/** Integrations stay roadmap — no live ATS sync impression. */
export const COMPANY_INTEGRATIONS_ROADMAP_STATUS = "coming_soon" as const;

/** Integrations page honest boundary — no live ATS/marketplace sync. */
export const INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC = true;

/** Employer billing hidden from primary nav — premium preview route only. */
export const HIDE_COMPANY_BILLING_FROM_NAV = true;

/** Extended company nav collapsed by default — core ≤4 on hub home. */
export const COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT = true;

/** Primary company surfaces (≤4) — dashboard, roles, pipeline, talent pool. */
export const COMPANY_PRIMARY_NAV_HREFS = [
  "/company/dashboard",
  "/company/roles",
  "/company/pipeline",
  "/company/talent-pool",
] as const;

/** Demo journeys collapsed — human decision required, not primary core. */
export const COLLAPSE_COMPANY_DEMO_JOURNEYS = true;

/** Talent pool limited pilot — no ATS sync or automatic outreach. */
export const TALENT_POOL_LIMITED_PILOT = true;

/** Hiring cockpit / command center / team — limited pilot boundaries. */
export const HIRING_COCKPIT_LIMITED_PILOT = true;

/** Delegated apply must not appear as a live company workflow. */
export const DELEGATED_APPLY_NOT_LIVE_IN_COMPANY_UI = true;
