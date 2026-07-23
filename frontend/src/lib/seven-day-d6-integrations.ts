/**
 * Seven-day D6 integrations / billing / calendar slice — honest tiers across personas.
 * Frontend/UI only — builds on Product Polish P2 and D2–D5 slices.
 */

export {
  CALENDAR_PROVIDER_TIERS,
  FORCE_MICROSOFT_CALENDAR_COMING_SOON,
  BILLING_PREMIUM_PREVIEW_ONLY,
} from "@/lib/product-polish-p2";

export { SHOW_DASHBOARD_AUTO_APPLY_STRIP, HIDE_CANDIDATE_BILLING_FROM_HUB } from "@/lib/seven-day-d2-candidate";
export {
  HIDE_RECRUITER_CALENDAR_FROM_NAV,
  INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC as RECRUITER_INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC,
  RECRUITER_INTEGRATIONS_ROADMAP_STATUS,
} from "@/lib/seven-day-d3-recruiter";
export {
  HIDE_COMPANY_BILLING_FROM_NAV,
  INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC as COMPANY_INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC,
  COMPANY_INTEGRATIONS_ROADMAP_STATUS,
} from "@/lib/seven-day-d4-company";

/** Candidate calendar — Google live, Microsoft coming soon, ICS preview (P2 tiers). */
export const CANDIDATE_CALENDAR_HONEST_TIERS = true;

/** Recruiter calendar — live holds + interview list (provider write still gated). */
export const RECRUITER_CALENDAR_ROADMAP_ONLY = false;

/** Company scheduling — draft-first holds LIVE; MS provider write gated by backend flag. */
export const COMPANY_SCHEDULING_ROADMAP_ONLY = false;

/** Integration rows map not_live → coming_soon in user-facing badges. */
export const NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON = true;

/** ATS write/sync still gated — OAuth + vacancy import preview are live-capable. */
export const ATS_COMING_SOON_NO_LIVE_SYNC = true;

/** Full public Stripe launch remains controlled — sandbox checkout allowed separately. */
export const STRIPE_NOT_PUBLIC_LAUNCH = true;

/** Sandbox Stripe checkout claim (test mode only) — Founder RELEASE_WITH_CONTROLS. */
export const STRIPE_SANDBOX_CHECKOUT_ENABLED = true;

/** Auto-apply: strip may show; default REVIEW_BEFORE_SUBMIT (not paused-hidden). */
export const AUTO_APPLY_PAUSED_HIDDEN = false;

/** User-facing copy must not imply public Stripe launch or fake connected sync. */
export const NO_FAKE_CHECKOUT_OR_CONNECTED_SYNC_UI = true;

/** Canonical D6 surface IDs for guard matrices. */
export const D6_CALENDAR_SURFACE_IDS = [
  "candidate_google_calendar",
  "candidate_microsoft_calendar",
  "candidate_ics_webcal",
  "recruiter_calendar",
  "company_employer_calendar",
] as const;

export const D6_BILLING_SURFACE_IDS = ["candidate_billing", "company_billing"] as const;

export const D6_INTEGRATION_SURFACE_IDS = [
  "recruiter_integrations",
  "company_integrations",
  "recruiter_ats_import_readiness",
  "company_ats_import_readiness",
] as const;
