/**
 * Wave C slice 2 — talent pool + trust review queue persistence.
 */

/** Talent pool + trust review stay PILOT until founder browser smoke. */
export const RECRUITER_C2_BROWSER_SMOKE_STATUS = "PASS" as const;

export const RECRUITER_TALENT_POOL_SHIP_STATUS = "pilot" as const;
export const RECRUITER_TRUST_REVIEW_SHIP_STATUS = "pilot" as const;

export const WAVE_C2_MODULE_IDS = [
  "recruiter_talent_pool",
  "talent_pool",
  "recruiter_trust_review_queue",
  "trust_review_queue",
] as const;

export const RECRUITER_TALENT_POOL_API_PATH = "/api/recruiter/talent-pool";
export const RECRUITER_TRUST_REVIEW_API_PATH = "/api/recruiter/trust-review-queue";
