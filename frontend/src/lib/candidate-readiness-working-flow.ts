/**
 * Candidate readiness working flow — profile/consent/evidence completion paths
 * without enabling delegated apply or auto-apply.
 * Frontend/UI only — uses existing verified-readiness API when authenticated.
 */

/** Canonical launch stance — do not overclaim in this slice. */
export const CANDIDATE_READINESS_CANONICAL_STANCE =
  "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO" as const;

/** Delegated apply remains disabled — profile can still reach review-ready. */
export const CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED = false as const;

/** Delegated / autonomous auto-apply remains disabled in readiness flow (strip visibility is separate). */
export const CANDIDATE_READINESS_AUTO_APPLY_ENABLED = false as const;

/** Dashboard anchor for the verified readiness checklist card. */
export const CANDIDATE_READINESS_HUB_ANCHOR = "dashboard-readiness" as const;

export const CANDIDATE_READINESS_HUB_HREF =
  `/dashboard#${CANDIDATE_READINESS_HUB_ANCHOR}` as const;

/** Real pages where candidates complete missing checklist items. */
export const CANDIDATE_READINESS_COMPLETION_ROUTES = {
  profile: "/profile",
  cv: "/profile",
  career_brief: "/dashboard/career",
  skill_evidence: "/dashboard/evidence",
  consent_general: "/consent/gdpr",
  consent_storage: "/consent/gdpr",
} as const;

export type CandidateReadinessMissingItem = keyof typeof CANDIDATE_READINESS_COMPLETION_ROUTES;

/** Pages that participate in the working flow (guard + doc inventory). */
export const CANDIDATE_READINESS_WORKING_PAGES = [
  "/dashboard",
  "/dashboard/career",
  "/dashboard/evidence",
  "/consent/gdpr",
  "/profile",
] as const;
