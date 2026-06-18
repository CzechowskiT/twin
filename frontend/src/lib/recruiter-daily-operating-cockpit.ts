/** Recruiter daily operating cockpit — deterministic demo queues and module links. */

import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getRecruiterDailyCockpitDemo,
  RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
  type RecruiterDailyCockpitRecord,
} from "@/lib/recruiter-daily-operating-cockpit-demo-data";
import { candidateCommunicationHref } from "@/lib/safe-communication";
import { candidateTeamHref } from "@/lib/team-collaboration";

export {
  RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
  RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
};
export { LAUNCH_STANCE };

export const RECRUITER_DAILY_COCKPIT_ROUTE = "/recruiter/daily-cockpit";

export const RECRUITER_DAILY_COCKPIT_PAGE_MARKER = "recruiter-daily-cockpit-page";

export const RECRUITER_DAILY_COCKPIT_MARKERS = {
  page: RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  header: "recruiter-daily-cockpit-header",
  sampleContext: "recruiter-daily-cockpit-sample-context",
  priorityCandidates: "recruiter-daily-cockpit-priority-candidates",
  priorityWorklist: "recruiter-daily-cockpit-priority-worklist",
  openDecisions: "recruiter-daily-cockpit-open-decisions",
  decisionQueue: "recruiter-daily-cockpit-decision-queue",
  consentReview: "recruiter-daily-cockpit-consent-review",
  trustConsentQueue: "recruiter-daily-cockpit-trust-consent-queue",
  feedbackMissing: "recruiter-daily-cockpit-feedback-missing",
  scorecardsPending: "recruiter-daily-cockpit-scorecards-pending",
  feedbackScorecardQueue: "recruiter-daily-cockpit-feedback-scorecard-queue",
  commDraftsReview: "recruiter-daily-cockpit-comm-drafts-review",
  commDraftsQueue: "recruiter-daily-cockpit-comm-drafts-queue",
  pipelineStageChanges: "recruiter-daily-cockpit-pipeline-stage-changes",
  pipelineChanges: "recruiter-daily-cockpit-pipeline-changes",
  atsImportQueue: "recruiter-daily-cockpit-ats-import-queue",
  weeklyDigest: "recruiter-daily-cockpit-weekly-digest",
  humanChecklist: "recruiter-daily-cockpit-human-checklist",
  dailyChecklist: "recruiter-daily-cockpit-daily-checklist",
  humanBoundary: "recruiter-daily-cockpit-human-boundary",
  moduleLinks: "recruiter-daily-cockpit-module-links",
  boundaryBanner: "recruiter-daily-cockpit-boundary-banner",
  pilotBadge: "recruiter-daily-cockpit-pilot-badge",
  hubPromo: "recruiter-daily-cockpit-hub-promo",
  navLink: "recruiter-daily-cockpit-nav-link",
} as const;

export const RECRUITER_DAILY_COCKPIT_MODULE_LINKS = [
  {
    id: "sor_hub",
    href: "/recruiter",
    labelKey: "recruiterDailyCockpit.linkSorHub" as TranslationKey,
  },
  {
    id: "profile360",
    href: candidateProfile360Href(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkProfile360" as TranslationKey,
  },
  {
    id: "pipeline",
    href: jobPipelineHref(RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkPipeline" as TranslationKey,
  },
  {
    id: "notes",
    href: candidateCollaborationHref(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkNotes" as TranslationKey,
  },
  {
    id: "trust",
    href: candidateTrustHref(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkTrust" as TranslationKey,
  },
  {
    id: "team",
    href: candidateTeamHref(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkTeam" as TranslationKey,
  },
  {
    id: "communication",
    href: candidateCommunicationHref(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkCommunication" as TranslationKey,
  },
  {
    id: "ats",
    href: atsImportReadinessHref("recruiter"),
    labelKey: "recruiterDailyCockpit.linkAtsReadiness" as TranslationKey,
  },
  {
    id: "trust_review_queue",
    href: "/recruiter/trust-review-queue",
    labelKey: "recruiterTrustReviewQueue.demoJourneyTitle" as TranslationKey,
  },
  {
    id: "decision_memory",
    href: decisionMemoryHref(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterDailyCockpit.linkDecisionMemory" as TranslationKey,
  },
] as const;

export const RECRUITER_DAILY_COCKPIT_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /message sent/i,
  /automatic outreach/i,
  /automatic application/i,
  /AI decided/i,
  /GDPR compliant/i,
  /legally compliant/i,
  /ATS sync completed/i,
  /writeback completed/i,
  /calendar scheduled/i,
];

export function recruiterDailyCockpitHref(): string {
  return RECRUITER_DAILY_COCKPIT_ROUTE;
}

export function resolveRecruiterDailyCockpit(): RecruiterDailyCockpitRecord {
  return getRecruiterDailyCockpitDemo();
}

export function getRecruiterDailyCockpitRecord(): RecruiterDailyCockpitRecord {
  return getRecruiterDailyCockpitDemo();
}

export function candidateProfileHref(candidateId: string): string {
  return candidateProfile360Href(candidateId, "recruiter");
}

export function candidatePipelineHref(roleId: string): string {
  return jobPipelineHref(roleId, "recruiter");
}
