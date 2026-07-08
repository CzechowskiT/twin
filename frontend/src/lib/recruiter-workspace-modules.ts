import { RECRUITER_DAILY_COCKPIT_ROUTE } from "@/lib/recruiter-daily-operating-cockpit";
import { RECRUITER_TRUST_REVIEW_QUEUE_ROUTE } from "@/lib/recruiter-trust-review-queue";
import { RECRUITER_INTEGRATIONS_ROUTE } from "@/lib/recruiter-integrations-readiness";
import {
  RECRUITER_ANALYTICS_SHIP_STATUS,
  RECRUITER_INTEGRATIONS_ROADMAP_STATUS,
} from "@/lib/seven-day-d3-recruiter";
import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

/** Recruiter hub module cards — calendar sync explicitly NOT LIVE. */
export const RECRUITER_WORKSPACE_MODULES: readonly WorkspaceModuleDef[] = [
  {
    id: "trust_review_queue",
    href: RECRUITER_TRUST_REVIEW_QUEUE_ROUTE,
    titleKey: "recruiterTrustReviewQueue.demoJourneyTitle",
    valuePropKey: "recruiterTrustReviewQueue.demoJourneyDesc",
    ctaKey: "recruiterTrustReviewQueue.openTrustReviewQueue",
    status: "pilot",
  },
  {
    id: "daily_cockpit",
    href: RECRUITER_DAILY_COCKPIT_ROUTE,
    titleKey: "recruiterDailyCockpit.demoJourneyTitle",
    valuePropKey: "recruiterDailyCockpit.demoJourneyDesc",
    ctaKey: "recruiterDailyCockpit.openDailyCockpit",
    status: "pilot",
  },
  {
    id: "inbox",
    href: "/recruiter/inbox",
    titleKey: "workspaceModules.recruiterInboxTitle",
    valuePropKey: "workspaceModules.recruiterInboxValue",
    ctaKey: "workspaceModules.recruiterInboxCta",
    status: "live",
  },
  {
    id: "pipeline",
    href: "/recruiter/pipeline",
    titleKey: "workspaceModules.recruiterPipelineTitle",
    valuePropKey: "workspaceModules.recruiterPipelineValue",
    ctaKey: "workspaceModules.recruiterPipelineCta",
    status: "live",
  },
  {
    id: "talent_pool",
    href: "/recruiter/talent-pool",
    titleKey: "workspaceModules.recruiterTalentPoolTitle",
    valuePropKey: "workspaceModules.recruiterTalentPoolValue",
    hintKey: "workspaceModules.recruiterTalentPoolHint",
    ctaKey: "workspaceModules.recruiterTalentPoolCta",
    status: "pilot",
  },
  {
    id: "search",
    href: "/recruiter/search",
    titleKey: "workspaceModules.recruiterSearchTitle",
    valuePropKey: "workspaceModules.recruiterSearchValue",
    ctaKey: "workspaceModules.recruiterSearchCta",
    status: "live",
  },
  {
    id: "talent_radar_digest",
    href: "/recruiter/talent-radar/digest",
    titleKey: "workspaceModules.recruiterTalentRadarDigestTitle",
    valuePropKey: "workspaceModules.recruiterTalentRadarDigestValue",
    ctaKey: "workspaceModules.recruiterTalentRadarDigestCta",
    status: "pilot",
  },
  {
    id: "talent_radar",
    href: "/recruiter/talent-radar",
    titleKey: "workspaceModules.recruiterTalentRadarTitle",
    valuePropKey: "workspaceModules.recruiterTalentRadarValue",
    hintKey: "workspaceModules.recruiterTalentRadarHint",
    ctaKey: "workspaceModules.recruiterTalentRadarCta",
    status: "pilot",
  },
  {
    id: "analytics",
    href: "/recruiter/analytics",
    titleKey: "workspaceModules.recruiterAnalyticsTitle",
    valuePropKey: "workspaceModules.recruiterAnalyticsValue",
    ctaKey: "workspaceModules.recruiterAnalyticsCta",
    status: RECRUITER_ANALYTICS_SHIP_STATUS,
  },
  {
    id: "integrations",
    href: RECRUITER_INTEGRATIONS_ROUTE,
    titleKey: "workspaceModules.recruiterIntegrationsTitle",
    valuePropKey: "workspaceModules.recruiterIntegrationsValue",
    hintKey: "workspaceModules.recruiterIntegrationsHint",
    ctaKey: "workspaceModules.recruiterIntegrationsCta",
    status: RECRUITER_INTEGRATIONS_ROADMAP_STATUS,
  },
  {
    id: "calendar",
    href: "/recruiter/calendar",
    titleKey: "workspaceModules.recruiterCalendarTitle",
    valuePropKey: "workspaceModules.recruiterCalendarValue",
    hintKey: "workspaceModules.recruiterCalendarHint",
    ctaKey: "workspaceModules.recruiterCalendarCta",
    status: "not_live",
  },
  {
    id: "jobs",
    href: "/recruiter/jobs",
    titleKey: "workspaceModules.recruiterJobsTitle",
    valuePropKey: "workspaceModules.recruiterJobsValue",
    ctaKey: "workspaceModules.recruiterJobsCta",
    status: "live",
  },
];

export const RECRUITER_HUB_ROUTE = "/recruiter";
