/**
 * Seven-day D4 company slice — public-ready core hub + integrations roadmap;
 * hiring cockpit/team/talent pilot-only; billing hidden; no delegated apply.
 * Frontend/UI only — builds on Product Polish P0–P4.
 */

/** Violet hub promo cards (hiring cockpit / command center) — roadmap collapsed only. */
export const SHOW_COMPANY_HUB_PRIMARY_PROMOS = false;

/** Cockpit and command center tucked into collapsed roadmap on dashboard. */
export const SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED = false;

/** Single honest next action on dashboard when primary promos are off. */
export const SHOW_COMPANY_HUB_NEXT_ACTION = true;

/** Recommended first step for company operators — roles before pipeline depth. */
export const COMPANY_HUB_NEXT_ACTION_HREF = "/company/roles" as const;

/** Integrations stay roadmap — no live ATS sync impression. */
export const COMPANY_INTEGRATIONS_ROADMAP_STATUS = "coming_soon" as const;

/** Wave 1 — integrations hidden from workspace hub (route preserved). */
export const HIDE_COMPANY_INTEGRATIONS_FROM_HUB = true;

/** Wave 3 slice 2 — integrations on product roadmap outside workspace; deep link route preserved. */
export const COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE = true;

/** Wave 3 — integrations removed from extended workspace nav. */
export const HIDE_COMPANY_INTEGRATIONS_FROM_NAV = true;

export { COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";

/** Integrations page honest boundary — no live ATS/marketplace sync. */
export const INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC = true;

/** Employer billing hidden from primary nav — premium preview route only. */
export const HIDE_COMPANY_BILLING_FROM_NAV = true;

/** Extended company nav collapsed by default — core ≤4 on hub home. */
export const COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT = true;

/** Wave 2B slice 3 — company dashboard executive snapshot confirmed GREEN_WORKING (was visible in Wave 1; M8 smoke-close). */
export const COMPANY_DASHBOARD_SHIP_STATUS = "live" as const;

/** Wave 2B slice 3 — company roles list confirmed GREEN_WORKING. */
export const COMPANY_ROLES_SHIP_STATUS = "live" as const;

/** Wave 2B slice 3 — company pipeline quality overview confirmed GREEN_WORKING. */
export const COMPANY_PIPELINE_SHIP_STATUS = "live" as const;

/** Primary company surfaces (≤3 green) — dashboard, roles, pipeline. */
export const COMPANY_PRIMARY_NAV_HREFS = [
  "/company/dashboard",
  "/company/roles",
  "/company/pipeline",
] as const;

/** Demo journeys collapsed — human decision required, not primary core. */
export const COLLAPSE_COMPANY_DEMO_JOURNEYS = true;

/** Talent pool limited pilot — no ATS sync or automatic outreach. */
export const TALENT_POOL_LIMITED_PILOT = true;

/** Hiring cockpit / command center / team — limited pilot boundaries. */
export const HIRING_COCKPIT_LIMITED_PILOT = true;

/** Delegated apply must not appear as a live company workflow. */
export const DELEGATED_APPLY_NOT_LIVE_IN_COMPANY_UI = true;
