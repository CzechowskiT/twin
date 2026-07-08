/**
 * Seven-day D7 final QA readiness — locks stance, launch surfaces, audit outcomes.
 * Frontend/UI/docs only. Ready for Gate F review — NOT public launch.
 */

import { CONTROLLED_PILOT_PRIMARY_LIMITS } from "@/lib/product-surface-visibility";

/** D7 QA slice complete — D1–D6 guards + build required before merge. */
export const D7_QA_READINESS_LOCK = true;

/** Final recommendation — Gate F diligence, not Launch GO. */
export const READY_FOR_GATE_F_REVIEW = true;
export const NOT_READY_FOR_LAUNCH = true;

/** Grep audit: primary hubs clean; residual clutter in deep pilot / investor matrix only. */
export const PILOT_CLUTTER_AUDIT = "MINOR" as const;

/** Badge vocabulary + hub limits consistent on primary surfaces. */
export const UX_CONSISTENCY_AUDIT = "PASS" as const;

/** Public launch surface A — candidate 8, recruiter 5, company 4, marketing public. */
export const LAUNCH_SURFACE_A = {
  candidate: CONTROLLED_PILOT_PRIMARY_LIMITS.candidate,
  recruiter: CONTROLLED_PILOT_PRIMARY_LIMITS.recruiter,
  company: CONTROLLED_PILOT_PRIMARY_LIMITS.company,
  marketing: "public" as const,
} as const;

/** Canonical stance — unchanged through D7. */
export const CANONICAL_STANCE = "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO" as const;

/** Primary UI files audited for banned literal leaks (grep guard). */
export const D7_PRIMARY_UI_PATHS = [
  "src/components/site-header-bar.tsx",
  "src/components/site-footer.tsx",
  "src/components/site-top-marquee.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/recruiter/page.tsx",
  "src/app/company/dashboard/company-dashboard-client.tsx",
  "src/components/investor/investor-room-page.tsx",
] as const;

/** User-facing copy literals that must not appear in primary UI source (TS status keys OK). */
export const D7_BANNED_USER_COPY_PATTERNS = [
  /["'`]needs_setup["'`]/,
  /["'`]Not live["'`]/,
  /["'`]Nie live["'`]/,
  /\bstub\b/i,
  /\bmock links\b/i,
  /\bfake checkout\b/i,
  /coming later/i,
  /\bTODO\b/,
] as const;
