/** Operational queue cross-links between live persistence surfaces. */

import type { TranslationKey } from "@/lib/i18n";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { boardPersistenceOperationsMonitorHref } from "@/lib/board-persistence-operations-monitor";
import { productionPersistenceStatusHref } from "@/lib/production-persistence-status";
import { placementVerificationIntegrationHref } from "@/lib/placement-verification-integration";
import { boardCalendarReadinessMonitorHref } from "@/lib/board-calendar-readiness-monitor";

export const OPERATIONAL_CROSS_LINKS_MARKER = "operational-cross-links";

export const OPERATIONAL_CROSS_LINKS = [
  { id: "daily_cockpit", href: recruiterDailyCockpitHref(), labelKey: "recruiterDailyCockpit.openDailyCockpit" as TranslationKey },
  { id: "operational_queue", href: "/recruiter/operational-work-queue", labelKey: "recruiterOperationalWorkQueue.pageTitle" as TranslationKey },
  { id: "request_intake", href: "/recruiter/request-intake", labelKey: "requestIntake.pageTitle" as TranslationKey },
  { id: "trust_review", href: "/recruiter/trust-review-queue", labelKey: "recruiterTrustReviewQueue.pageTitle" as TranslationKey },
  { id: "command_center", href: "/company/hiring-command-center", labelKey: "companyHiringCommandCenter.openCommandCenter" as TranslationKey },
  { id: "company_feedback", href: "/company/feedback", labelKey: "companyFeedback.pageTitle" as TranslationKey },
  { id: "work_items_company", href: "/company/work-items", labelKey: "workItems.companyTitle" as TranslationKey },
  { id: "trust_overview", href: "/dashboard/trust/overview", labelKey: "candidateTrustOverview.pageTitle" as TranslationKey },
  { id: "placement_evidence", href: placementVerificationIntegrationHref("board_monitor"), labelKey: "boardPlacementEvidence.pageTitle" as TranslationKey },
  { id: "calendar_readiness", href: boardCalendarReadinessMonitorHref(), labelKey: "boardCalendarReadiness.pageTitle" as TranslationKey },
  { id: "board_monitor", href: boardPersistenceOperationsMonitorHref(), labelKey: "liveOperatingState.monitorTitle" as TranslationKey },
  { id: "prod_status", href: productionPersistenceStatusHref(), labelKey: "productionPersistenceStatus.pageEyebrow" as TranslationKey },
  { id: "work_items_recruiter", href: "/recruiter/work-items", labelKey: "workItems.recruiterTitle" as TranslationKey },
] as const;
