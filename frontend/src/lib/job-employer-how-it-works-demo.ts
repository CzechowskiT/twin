/** Fictional global hiring journey data for the employer “How it works” tab (demo). */

export const HIRING_JOURNEY_STEP_IDS = [
  "discover",
  "apply",
  "screen",
  "interview",
  "offer",
  "onboard",
] as const;

export type HiringJourneyStepId = (typeof HIRING_JOURNEY_STEP_IDS)[number];

export const AFTER_APPLY_STEP_IDS = ["ack", "taReview", "hmReview"] as const;

export type AfterApplyStepId = (typeof AFTER_APPLY_STEP_IDS)[number];

export const ROLE_FAMILY_IDS = ["ic", "manager", "executive"] as const;

export type RoleFamilyId = (typeof ROLE_FAMILY_IDS)[number];

export const ROLE_FAMILY_STAGE_IDS: Record<RoleFamilyId, readonly string[]> = {
  ic: ["recruiter", "technical", "systemDesign", "teamFit", "offer"],
  manager: ["recruiter", "hmDeep", "panel", "caseStudy", "references", "offer"],
  executive: ["confidential", "boardPrep", "chemistry", "compCommittee", "offer"],
};

export const HIRING_TOOL_IDS = ["twin", "greenhouse", "workday", "googleCal", "microsoftCal"] as const;

export type HiringToolId = (typeof HIRING_TOOL_IDS)[number];

export const GLOBAL_REGION_IDS = ["emea", "americas", "apac"] as const;

export type GlobalRegionId = (typeof GLOBAL_REGION_IDS)[number];

export const RESPONSE_SLA_IDS = ["applicationAck", "recruiterReply", "interviewSchedule", "offerLetter"] as const;

export type ResponseSlaId = (typeof RESPONSE_SLA_IDS)[number];

export const PREP_ITEM_IDS = ["cv", "portfolio", "caseStudy"] as const;

export type PrepItemId = (typeof PREP_ITEM_IDS)[number];

export const A11Y_ACCOMMODATION_IDS = ["interviewFormat", "materials", "assessment", "onsite", "contact"] as const;

export const DAY_IN_LIFE_VIDEO_IDS = ["productEngineer", "talentPartner", "campusGrad"] as const;

export type DayInLifeVideoId = (typeof DAY_IN_LIFE_VIDEO_IDS)[number];

export const HOW_IT_WORKS_HERO_STATS = [
  { id: "regions", value: "3", labelKey: "howStatRegions" },
  { id: "avgProcess", value: "21d", labelKey: "howStatAvgProcess" },
  { id: "offerRate", value: "18%", labelKey: "howStatOfferRate" },
  { id: "nps", value: "72", labelKey: "howStatNps" },
] as const;
