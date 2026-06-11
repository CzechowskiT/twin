/** Static roadmap structure — copy lives in i18n `investorRoadmap.*`. */

export type RoadmapPhase = "now" | "next" | "later";

export type RoadmapItemId =
  | "nowH5cSlot1"
  | "nowFounderQa"
  | "nowRecruiterPilot"
  | "nowI18nCoverage"
  | "nextGoSmallDecision"
  | "nextRecruiterCalendar"
  | "nextMoreBoards"
  | "nextBillingRollout"
  | "laterPublicLaunch"
  | "laterAutoApply"
  | "laterAtsWebhooks"
  | "laterAuditedFinancials";

export type ShippedItemId =
  | "shippedRecruiterInbox"
  | "shippedGlobalChromeI18n"
  | "shippedCandidateCalendar"
  | "shippedCspEnforce"
  | "shippedH5bPass"
  | "shippedPremiumPolish";

export type RiskItemId =
  | "riskPublicNoGo"
  | "riskAutoApplyPaused"
  | "riskRecruiterCalendar"
  | "riskPreRevenue"
  | "riskPilotCohort";

export type MilestoneItemId =
  | "milestoneH5cSlot1"
  | "milestoneH5dSelection"
  | "milestoneFounderSmoke"
  | "milestoneCspMonitoring";

export type FounderUpdateId = "update20260611" | "update20260607" | "update20260606" | "update20260605";

export const ROADMAP_PHASES: { phase: RoadmapPhase; items: RoadmapItemId[] }[] = [
  { phase: "now", items: ["nowH5cSlot1", "nowFounderQa", "nowRecruiterPilot", "nowI18nCoverage"] },
  { phase: "next", items: ["nextGoSmallDecision", "nextRecruiterCalendar", "nextMoreBoards", "nextBillingRollout"] },
  { phase: "later", items: ["laterPublicLaunch", "laterAutoApply", "laterAtsWebhooks", "laterAuditedFinancials"] },
];

export const SHIPPED_ITEMS: ShippedItemId[] = [
  "shippedRecruiterInbox",
  "shippedGlobalChromeI18n",
  "shippedCandidateCalendar",
  "shippedCspEnforce",
  "shippedH5bPass",
  "shippedPremiumPolish",
];

export const RISK_ITEMS: RiskItemId[] = [
  "riskPublicNoGo",
  "riskAutoApplyPaused",
  "riskRecruiterCalendar",
  "riskPreRevenue",
  "riskPilotCohort",
];

export const MILESTONE_ITEMS: MilestoneItemId[] = [
  "milestoneH5cSlot1",
  "milestoneH5dSelection",
  "milestoneFounderSmoke",
  "milestoneCspMonitoring",
];

export const FOUNDER_UPDATES: FounderUpdateId[] = [
  "update20260611",
  "update20260607",
  "update20260606",
  "update20260605",
];
