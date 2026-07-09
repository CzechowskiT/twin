/**
 * Wave 1+2A — workspace hubs show GREEN_WORKING modules only.
 * Routes and SoR entries stay intact; visibility layer only.
 */
import type { MarketingPersona } from "@/lib/marketing-persona";

/** When true, workspace hubs/nav show only allowed green module IDs — no roadmap tier. */
export const WORKSPACE_GREEN_ONLY_MODE = true;

/** Module / SoR IDs visible in workspace hub, primary nav, and module cards. */
export const GREEN_WORKSPACE_ALLOWED_IDS: Readonly<Record<MarketingPersona, readonly string[]>> = {
  candidate: [
    "profile",
    "candidate_profile",
    "candidate_cv",
    "jobs",
    "candidate_jobs",
    "matches",
    "candidate_matches",
    "applications",
    "candidate_applications",
    "calendar",
    "candidate_calendar",
    "identity",
    "candidate_identity",
    "career_compass",
    "candidate_career_compass",
    "interview_prep",
    "candidate_interview_prep",
    "evidence",
    "candidate_evidence",
  ],
  recruiter: [
    "inbox",
    "recruiter_inbox",
    "pipeline",
    "recruiter_pipeline",
    "jobs",
    "recruiter_jobs",
    "search",
    "recruiter_search",
    "analytics",
    "recruiter_analytics",
  ],
  company: [
    "company_dashboard",
    "roles",
    "company_roles",
    "pipeline",
    "company_pipeline",
  ],
  investor: [
    "metrics",
    "investor_metrics",
    "roadmap",
    "investor_roadmap",
    "calculator",
    "investor_calculator",
    "contact",
    "investor_contact",
  ],
};

/** Workspace card IDs hidden in Wave 1 (hub/nav visibility only). */
export const WAVE1_HIDDEN_WORKSPACE_CARD_IDS: Readonly<Record<MarketingPersona, readonly string[]>> = {
  candidate: ["referrals", "trust_center", "plan_payments", "auto_apply"],
  recruiter: [
    "trust_review_queue",
    "daily_cockpit",
    "talent_pool",
    "talent_radar",
    "talent_radar_digest",
    "analytics",
    "integrations",
    "calendar",
  ],
  company: [
    "hiring_cockpit",
    "hiring_command_center",
    "team",
    "talent_pool",
    "integrations",
    "billing",
  ],
  investor: ["data_room", "placement"],
};

const ALLOWED_BY_PERSONA = Object.fromEntries(
  (Object.keys(GREEN_WORKSPACE_ALLOWED_IDS) as MarketingPersona[]).map((persona) => [
    persona,
    new Set(GREEN_WORKSPACE_ALLOWED_IDS[persona]),
  ]),
) as Record<MarketingPersona, Set<string>>;

/** Post–Wave 1 primary card limits (green-only visible modules). */
export const WORKSPACE_GREEN_PRIMARY_LIMITS: Readonly<Record<MarketingPersona, number>> = {
  candidate: 10,
  recruiter: 5,
  company: 3,
  investor: 4,
};

/** Wave 2A — first MAKE_GREEN module restored to workspace hub/nav. */
export const WAVE2A_MAKE_GREEN_MODULE_ID = "analytics" as const;

export const WAVE2A_MAKE_GREEN_SOR_IDS = ["analytics", "recruiter_analytics"] as const;

/** Wave 1 hidden cards restored in Wave 2A (still listed in WAVE1_HIDDEN for audit trail). */
export const WAVE2A_RESTORED_WORKSPACE_CARD_IDS: Readonly<Record<MarketingPersona, readonly string[]>> = {
  candidate: [],
  recruiter: [WAVE2A_MAKE_GREEN_MODULE_ID],
  company: [],
  investor: [],
};

/** Wave 2B slice 1 — candidate evidence confirmed GREEN_WORKING (was visible in Wave 1; M5 smoke-close). */
export const WAVE2B_MAKE_GREEN_MODULE_ID = "evidence" as const;

export const WAVE2B_MAKE_GREEN_SOR_IDS = ["evidence", "candidate_evidence"] as const;

/** Evidence stayed in hub since Wave 1 — Wave 2B formalizes GREEN_WORKING, not a restore. */
export const WAVE2B_EVIDENCE_ALWAYS_IN_HUB = true as const;

/** Total workspace cards removed from hub/nav in Wave 1 (per green plan inventory). */
export const WAVE1_HIDDEN_WORKSPACE_CARD_COUNT = (
  Object.values(WAVE1_HIDDEN_WORKSPACE_CARD_IDS)
).reduce((sum, ids) => sum + ids.length, 0);

/** Wave 1 hidden count minus Wave 2A restored cards (Wave 2B evidence unchanged). */
export const WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT =
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT -
  Object.values(WAVE2A_RESTORED_WORKSPACE_CARD_IDS).reduce((sum, ids) => sum + ids.length, 0);

/** Same as Wave 2A effective hidden — evidence was never in WAVE1_HIDDEN list. */
export const WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT = WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT;

/** Wave 2B slice 2 — recruiter pipeline confirmed GREEN_WORKING (was visible in Wave 1; M7 smoke-close). */
export const WAVE2B_SLICE2_MAKE_GREEN_MODULE_ID = "pipeline" as const;

export const WAVE2B_SLICE2_MAKE_GREEN_SOR_IDS = ["pipeline", "recruiter_pipeline"] as const;

/** Pipeline stayed in hub since Wave 1 — Wave 2B slice 2 formalizes GREEN_WORKING, not a restore. */
export const WAVE2B_PIPELINE_ALWAYS_IN_HUB = true as const;

/** Wave 2B slice 3 — company core (dashboard, roles, pipeline) confirmed GREEN_WORKING (visible in Wave 1; M8 smoke-close). */
export const WAVE2B_SLICE3_MAKE_GREEN_MODULE_ID = "company_dashboard" as const;

export const WAVE2B_SLICE3_MAKE_GREEN_SOR_IDS = [
  "company_dashboard",
  "roles",
  "company_roles",
  "pipeline",
  "company_pipeline",
] as const;

/** Company core trio stayed in hub since Wave 1 — Wave 2B slice 3 formalizes GREEN_WORKING, not a restore. */
export const WAVE2B_COMPANY_CORE_ALWAYS_IN_HUB = true as const;

/** Wave 2B slice 4 — investor core quartet confirmed GREEN_WORKING (visible in Wave 1; M9 smoke-close). */
export const WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID = "metrics" as const;

export const WAVE2B_SLICE4_MAKE_GREEN_SOR_IDS = [
  "metrics",
  "investor_metrics",
  "roadmap",
  "investor_roadmap",
  "calculator",
  "investor_calculator",
  "contact",
  "investor_contact",
] as const;

/** Investor core quartet stayed in hub since Wave 1 — Wave 2B slice 4 formalizes GREEN_WORKING, not a restore. */
export const WAVE2B_INVESTOR_CORE_ALWAYS_IN_HUB = true as const;

/** Same as Wave 2B slice 3 effective hidden — investor core was never in WAVE1_HIDDEN list. */
export const WAVE2B_SLICE4_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT = WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT;

export function isWorkspaceGreenVisible(persona: MarketingPersona, moduleId: string): boolean {
  if (!WORKSPACE_GREEN_ONLY_MODE) return true;
  return ALLOWED_BY_PERSONA[persona].has(moduleId);
}
