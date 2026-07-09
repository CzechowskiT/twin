/**
 * Seven-day D2 candidate slice — public-ready career, interview prep, evidence;
 * trust roadmap; referrals pilot-only; auto-apply hidden; calendar honesty.
 * Frontend/UI only — builds on Product Polish P0–P2.
 */

export {
  SHOW_DASHBOARD_AUTO_APPLY_STRIP,
  SHOW_DASHBOARD_EXTENDED_HOME_MODULES,
} from "@/lib/product-polish-p0";
export { TRUST_CENTER_OVERVIEW_MODE } from "@/lib/product-polish-p1";
export {
  CALENDAR_PROVIDER_TIERS,
  FORCE_MICROSOFT_CALENDAR_COMING_SOON,
} from "@/lib/product-polish-p2";

/** Career compass ships as live static + profile-backed path — no vague pilot chrome. */
export const CAREER_COMPASS_SHIP_STATUS = "live" as const;

/** Interview prep ships as static pack + optional application context — not live AI coaching. */
export const INTERVIEW_PREP_SHIP_STATUS = "live" as const;

/** Evidence vault ships as manual proof links — no auto-upload promises. */
export const EVIDENCE_VAULT_SHIP_STATUS = "live" as const;

/** Trust hub stays roadmap — overview only; advanced lanes collapsed. */
export const TRUST_CENTER_ROADMAP_STATUS = "pilot" as const;

/** Referrals limited to founder-led cohort — boundary banner on page. */
export const REFERRALS_LIMITED_PILOT = true;

/** Wave 1 — referrals hidden from workspace hub/nav (route preserved). */
export const HIDE_CANDIDATE_REFERRALS_FROM_HUB = true;

/** Wave 1 — trust center card hidden from workspace hub (route preserved). */
export const HIDE_CANDIDATE_TRUST_CENTER_FROM_HUB = true;

/** Billing/plan hidden from candidate hub primary surface. */
export const HIDE_CANDIDATE_BILLING_FROM_HUB = true;

/** Candidate module nav collapsed by default — core links on dashboard home. */
export const CANDIDATE_MODULE_NAV_COLLAPSED_DEFAULT = true;
