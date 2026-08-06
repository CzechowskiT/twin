/**
 * Epic 2.9 — Candidate IA consolidation.
 * One primary journey; progressive disclosure for advanced modules.
 * No epic/architecture jargon in primary labels.
 */

export const CANDIDATE_PRIMARY_IA = [
  {
    id: "home",
    href: "/dashboard",
    labelKey: "pilotConsolidation.navHome" as const,
  },
  {
    id: "direction",
    href: "/dashboard/career",
    labelKey: "pilotConsolidation.navDirection" as const,
  },
  {
    id: "opportunities",
    href: "/dashboard/matches",
    labelKey: "pilotConsolidation.navOpportunities" as const,
  },
  {
    id: "evidence",
    href: "/dashboard/portfolio",
    labelKey: "pilotConsolidation.navEvidence" as const,
  },
  {
    id: "plan",
    href: "/dashboard/execution-calendar",
    labelKey: "pilotConsolidation.navPlan" as const,
  },
  {
    id: "decisions",
    href: "/dashboard/approvals",
    labelKey: "pilotConsolidation.navDecisions" as const,
  },
  {
    id: "settings",
    href: "/dashboard/privacy-center",
    labelKey: "pilotConsolidation.navSettings" as const,
  },
] as const;

/** Secondary / advanced — reachable but not primary nav. */
export const CANDIDATE_SECONDARY_IA = [
  { href: "/dashboard/help", labelKey: "pilotOps.navHelp" as const, disposition: "keep_secondary" },
  { href: "/dashboard/help/report-problem", labelKey: "pilotOps.navReport" as const, disposition: "keep_secondary" },
  { href: "/dashboard/help/feedback", labelKey: "pilotOps.navFeedback" as const, disposition: "keep_secondary" },
  { href: "/profile", labelKey: "nav.profile" as const, disposition: "keep_secondary" },
  { href: "/dashboard/jobs", labelKey: "nav.jobs" as const, disposition: "keep_secondary" },
  { href: "/dashboard/strategy", labelKey: "pilotConsolidation.moreStrategy" as const, disposition: "keep_secondary" },
  { href: "/dashboard/search-strategy", labelKey: "pilotConsolidation.moreSearch" as const, disposition: "keep_secondary" },
  { href: "/dashboard/search-outcomes", labelKey: "pilotConsolidation.moreOutcomes" as const, disposition: "keep_secondary" },
  { href: "/dashboard/application-studio", labelKey: "pilotConsolidation.moreApplications" as const, disposition: "keep_secondary" },
  { href: "/dashboard/interview-decision", labelKey: "pilotConsolidation.moreInterview" as const, disposition: "keep_secondary" },
  { href: "/dashboard/career-transition", labelKey: "pilotConsolidation.moreTransition" as const, disposition: "keep_secondary" },
  { href: "/dashboard/review-center", labelKey: "pilotConsolidation.moreReview" as const, disposition: "keep_secondary" },
  { href: "/dashboard/decision-journal", labelKey: "pilotConsolidation.moreJournal" as const, disposition: "keep_secondary" },
  { href: "/dashboard/execution-intelligence", labelKey: "pilotConsolidation.moreExecIntel" as const, disposition: "keep_secondary" },
  { href: "/dashboard/evidence-investment", labelKey: "pilotConsolidation.moreInvestment" as const, disposition: "keep_secondary" },
  { href: "/dashboard/calendar", labelKey: "dashboard.calendarLink" as const, disposition: "keep_secondary" },
  { href: "/dashboard/calendar-sync", labelKey: "pilotConsolidation.moreCalendarSync" as const, disposition: "keep_secondary" },
  { href: "/dashboard/consent-center", labelKey: "pilotConsolidation.moreConsent" as const, disposition: "keep_secondary" },
  { href: "/dashboard/history", labelKey: "careerLifecycle.history" as const, disposition: "keep_secondary" },
  { href: "/dashboard/identity", labelKey: "dashboard.identityLink" as const, disposition: "keep_secondary" },
  { href: "/privacy", labelKey: "profile.privacyPolicyLink" as const, disposition: "keep_secondary" },
] as const;

/** Route disposition for Epic 2.9 — pages remain; primary nav is reduced. */
export const CANDIDATE_ROUTE_DISPOSITION: Record<string, "primary" | "secondary" | "redirect_home" | "hidden_chrome"> = {
  "/dashboard": "primary",
  "/dashboard/career": "primary",
  "/dashboard/matches": "primary",
  "/dashboard/portfolio": "primary",
  "/dashboard/execution-calendar": "primary",
  "/dashboard/approvals": "primary",
  "/dashboard/privacy-center": "primary",
  "/dashboard/help": "secondary",
  "/dashboard/help/report-problem": "secondary",
  "/dashboard/help/feedback": "secondary",
  "/profile": "secondary",
  "/dashboard/jobs": "secondary",
  "/dashboard/strategy": "secondary",
  "/dashboard/search-strategy": "secondary",
  "/dashboard/search-outcomes": "secondary",
  "/dashboard/application-studio": "secondary",
  "/dashboard/interview-decision": "secondary",
  "/dashboard/career-transition": "secondary",
  "/dashboard/review-center": "secondary",
  "/dashboard/decision-journal": "secondary",
  "/dashboard/execution-intelligence": "secondary",
  "/dashboard/evidence-investment": "secondary",
  "/dashboard/calendar": "secondary",
  "/dashboard/calendar-sync": "secondary",
  "/dashboard/consent-center": "secondary",
  "/dashboard/history": "secondary",
  "/dashboard/identity": "secondary",
  "/dashboard/evidence": "secondary",
  "/dashboard/applications": "secondary",
  "/dashboard/lifecycle": "secondary",
  "/dashboard/trust": "hidden_chrome",
};

export const PRIMARY_JOURNEY_STEPS = [
  "private_access",
  "sign_in",
  "consent_privacy",
  "minimal_setup",
  "first_evidence_or_goal",
  "first_useful_insight",
  "approval_when_required",
  "daily_os_continuation",
] as const;

/** First-value contract — testable; not mere sign-in or empty dashboard. */
export const FIRST_VALUE_CONTRACT = {
  id: "pilot_first_value_v1",
  definition:
    "After sign-in and optional short onboarding, candidate reaches Home/Today with Daily OS (or calm empty next-action) and can open one useful surface (direction, opportunities, or evidence) without Founder help.",
  proven_by: "fresh_account_synthetic_e2e",
  not_sufficient: ["sign_in_alone", "dashboard_open_alone", "module_tour"],
} as const;

export const PILOT_ACCESS_STATUS = "OPERATIONALLY_READY_INACTIVE" as const;
export const INVITE_SEND_ENABLED = false;
export const REAL_INVITES_SENT_EPIC_29 = 0;
export const REAL_PILOT_USERS_ADDED_EPIC_29 = 0;
