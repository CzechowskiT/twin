export type RoadmapPhase = "now" | "next" | "later";
export const ROADMAP_PHASES = [
  { phase: "now" as const, items: ["nowH5cSlot1", "nowFounderQa", "nowRecruiterPilot", "nowI18nCoverage"] as const },
  {
    phase: "next" as const,
    items: [
      "nextCandidateTrustCenter",
      "nextRecruiterIntegrations",
      "nextCompanyIntegrations",
      "nextGoSmallDecision",
      "nextRecruiterCalendar",
      "nextMoreBoards",
      "nextBillingRollout",
    ] as const,
  },
  { phase: "later" as const, items: ["laterPublicLaunch", "laterAutoApply", "laterAtsWebhooks", "laterAuditedFinancials"] as const },
];
export const SHIPPED_ITEMS = ["shippedRecruiterInbox","shippedGlobalChromeI18n","shippedCandidateCalendar","shippedCspEnforce","shippedH5bPass","shippedPremiumPolish"] as const;
export const RISK_ITEMS = ["riskPublicNoGo","riskAutoApplyPaused","riskRecruiterCalendar","riskPreRevenue","riskPilotCohort"] as const;
export const MILESTONE_ITEMS = ["milestoneH5cSlot1","milestoneH5dSelection","milestoneFounderSmoke","milestoneCspMonitoring"] as const;
export const FOUNDER_UPDATES = ["update20260611","update20260607","update20260606","update20260605"] as const;
