/** Investor metrics reality dashboard — doc-backed status only, no fake traction. */

export const INVESTOR_METRICS_REALITY_ROUTE = "/investor/metrics";

export const INVESTOR_METRICS_VISUAL_MARKERS = {
  page: "investor-metrics-reality-page",
  launchStance: "investor-launch-stance-no-go",
  externalInvites: "investor-external-invites-count",
  liveSection: "investor-modules-live",
  demoSection: "investor-modules-demo",
  notLiveSection: "investor-modules-not-live",
  technicalHealth: "investor-technical-health",
  controlledReview: "investor-controlled-review",
  roadmap: "investor-roadmap-milestones",
  transparencyBanner: "investor-metrics-transparency-banner",
} as const;

export const LAUNCH_STANCE = "noGo" as const;
export const CONTROLLED_REVIEW_STATUS = "h5cHold" as const;
export const DEFAULT_EXTERNAL_INVITES_SENT = 0;

export const INVESTOR_MODULE_LIVE_KEYS = [
  "modLiveCandidateAuth",
  "modLiveJobMatching",
  "modLiveGoogleCalendar",
  "modLiveRecruiterInbox",
  "modLiveStripeWaitlist",
  "modLiveCompliance",
  "modLiveInvestorWorkspace",
] as const;

export const INVESTOR_MODULE_DEMO_KEYS = [
  "modDemoInteractiveDemo",
  "modDemoIcsWebcal",
  "modDemoPlacementVerification",
  "modDemoInvestorSeed",
] as const;

export const INVESTOR_MODULE_NOT_LIVE_KEYS = [
  "modNotLivePublicLaunch",
  "modNotLiveAutoApply",
  "modNotLiveDelegatedApply",
  "modNotLiveRecruiterCalendar",
  "modNotLiveExternalInvites",
  "modNotLiveRecruiterIntegrations",
] as const;

export const INVESTOR_ROADMAP_MILESTONE_KEYS = [
  "roadmapMilestone1",
  "roadmapMilestone2",
  "roadmapMilestone3",
  "roadmapMilestone4",
] as const;

export type InvestorModuleKey =
  | (typeof INVESTOR_MODULE_LIVE_KEYS)[number]
  | (typeof INVESTOR_MODULE_DEMO_KEYS)[number]
  | (typeof INVESTOR_MODULE_NOT_LIVE_KEYS)[number];

export const INVESTOR_FORBIDDEN_TRACTION_PATTERNS: RegExp[] = [
  /\bMAU proxy\b/i,
  /\bpaid subscribers\b/i,
  /\bconversion rate\b/i,
  /\bpilot count\b/i,
  /\b\d{2,}\+?\s*users\b/i,
  /\bthousands of users\b/i,
  /\bestimated placement revenue\b/i,
  /\brecruitment pipeline\b/i,
  /subscription_mrr/i,
  /registered_users/,
  /mvp-stats/,
];

export type PublicHealthSnapshot = {
  status?: string;
  db_ok?: boolean;
  git_commit?: string;
  scrape_worker_ready?: boolean;
  celery?: { worker_active?: boolean; nightly_auto_apply_beat_enabled?: boolean };
};

export function resolveExternalInvitesSent(fromDatabase: number | null | undefined) {
  if (typeof fromDatabase === "number" && Number.isFinite(fromDatabase) && fromDatabase >= 0) {
    return { count: fromDatabase, source: "database" as const };
  }
  return { count: DEFAULT_EXTERNAL_INVITES_SENT, source: "defaultZero" as const };
}

export function formatGitCommitShort(sha: string | undefined): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}
