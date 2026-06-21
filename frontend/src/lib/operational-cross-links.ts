/** Operational queue cross-links between live persistence surfaces. */

import type { TranslationKey } from "@/lib/i18n";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { boardPersistenceOperationsMonitorHref } from "@/lib/board-persistence-operations-monitor";

export const OPERATIONAL_CROSS_LINKS_MARKER = "operational-cross-links";

export const OPERATIONAL_CROSS_LINKS = [
  { id: "daily_cockpit", href: recruiterDailyCockpitHref(), labelKey: "recruiterDailyCockpit.openDailyCockpit" as TranslationKey },
  { id: "operational_queue", href: "/recruiter/operational-work-queue", labelKey: "recruiterOperationalWorkQueue.pageTitle" as TranslationKey },
  { id: "command_center", href: "/company/hiring-command-center", labelKey: "companyHiringCommandCenter.openCommandCenter" as TranslationKey },
  { id: "trust_overview", href: "/dashboard/trust/overview", labelKey: "candidateTrustOverview.pageTitle" as TranslationKey },
  { id: "board_monitor", href: boardPersistenceOperationsMonitorHref(), labelKey: "liveOperatingState.monitorTitle" as TranslationKey },
  { id: "work_items_recruiter", href: "/recruiter/work-items", labelKey: "workItems.recruiterTitle" as TranslationKey },
  { id: "trust_review", href: "/recruiter/trust-review-queue", labelKey: "recruiterTrustReviewQueue.pageTitle" as TranslationKey },
  { id: "request_intake", href: "/recruiter/request-intake", labelKey: "requestIntake.pageTitle" as TranslationKey },
] as const;
