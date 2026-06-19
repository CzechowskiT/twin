/** Recruiter operational work queue — read-only demo aggregation of daily work items. */

import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getRecruiterOperationalWorkQueueDemo,
  RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID,
  RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_ROLE_ID,
  type RecruiterOperationalWorkQueueRecord,
} from "@/lib/recruiter-operational-work-queue-demo-data";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { recruiterTrustReviewQueueHref } from "@/lib/recruiter-trust-review-queue";

export {
  RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID,
  RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_ROLE_ID,
};
export { LAUNCH_STANCE };

export const RECRUITER_OPERATIONAL_WORK_QUEUE_ROUTE = "/recruiter/operational-work-queue";

export const RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER = "recruiter-operational-work-queue-page";

export const RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS = {
  page: RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER,
  header: "recruiter-operational-work-queue-header",
  summary: "recruiter-operational-work-queue-summary",
  activeWorklist: "recruiter-operational-work-queue-active-worklist",
  trustReview: "recruiter-operational-work-queue-trust-review",
  missingFeedback: "recruiter-operational-work-queue-missing-feedback",
  staleApplications: "recruiter-operational-work-queue-stale-applications",
  nextBestActions: "recruiter-operational-work-queue-next-best-actions",
  ownerDueMap: "recruiter-operational-work-queue-owner-due-map",
  boundary: "recruiter-operational-work-queue-boundary",
  disabledActions: "recruiter-operational-work-queue-disabled-actions",
  pilotBadge: "recruiter-operational-work-queue-pilot-badge",
  navLink: "recruiter-operational-work-queue-nav-link",
} as const;

export const RECRUITER_OPERATIONAL_WORK_QUEUE_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
];

export const RECRUITER_OPERATIONAL_WORK_QUEUE_DISABLED_ACTIONS = [
  { key: "assign", labelKey: "recruiterOperationalWorkQueue.actionAssign" as TranslationKey },
  { key: "mark_done", labelKey: "recruiterOperationalWorkQueue.actionMarkDone" as TranslationKey },
  { key: "email", labelKey: "recruiterOperationalWorkQueue.actionEmail" as TranslationKey },
  { key: "schedule", labelKey: "recruiterOperationalWorkQueue.actionSchedule" as TranslationKey },
  { key: "ats_push", labelKey: "recruiterOperationalWorkQueue.actionAtsPush" as TranslationKey },
] as const;

export const RECRUITER_OPERATIONAL_WORK_QUEUE_MODULE_LINKS = [
  { id: "daily_cockpit", href: recruiterDailyCockpitHref(), labelKey: "recruiterOperationalWorkQueue.linkDailyCockpit" as TranslationKey },
  { id: "trust_queue", href: recruiterTrustReviewQueueHref(), labelKey: "recruiterOperationalWorkQueue.linkTrustQueue" as TranslationKey },
  {
    id: "profile360",
    href: candidateProfile360Href(RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterOperationalWorkQueue.linkProfile360" as TranslationKey,
  },
  {
    id: "pipeline",
    href: jobPipelineHref(RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_ROLE_ID, "recruiter"),
    labelKey: "recruiterOperationalWorkQueue.linkPipeline" as TranslationKey,
  },
  {
    id: "decision_memory",
    href: decisionMemoryHref(RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterOperationalWorkQueue.linkDecisionMemory" as TranslationKey,
  },
] as const;

export function recruiterOperationalWorkQueueHref(): string {
  return RECRUITER_OPERATIONAL_WORK_QUEUE_ROUTE;
}

export function resolveRecruiterOperationalWorkQueue(): RecruiterOperationalWorkQueueRecord {
  return getRecruiterOperationalWorkQueueDemo();
}
