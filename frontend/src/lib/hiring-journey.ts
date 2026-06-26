/** Hiring journey timeline — read-only cross-surface workflow layer. */

import {
  getHiringJourneyDemoBase,
  getHiringJourneyStepTemplates,
  HIRING_JOURNEY_PERSONAS,
  type HiringJourney,
  type HiringJourneyPersona,
  type HiringJourneyStepId,
  type HiringJourneyStepStatus,
  type HiringJourneyOverallStatus,
} from "@/lib/hiring-journey-demo-data";
import type { TranslationKey } from "@/lib/i18n";

export const HIRING_JOURNEY_DOC = "docs/HIRING_JOURNEY_TIMELINE_2026-06-25.md";

export const HIRING_JOURNEY_PAGE_MARKER = "hiring-journey-page";

export const HIRING_JOURNEY_MARKERS = {
  page: HIRING_JOURNEY_PAGE_MARKER,
  header: "hiring-journey-header",
  readOnlyBadge: "hiring-journey-read-only-badge",
  overallStatus: "hiring-journey-overall-status",
  timeline: "hiring-journey-timeline",
  blockedActions: "hiring-journey-blocked-actions",
  auditSummary: "hiring-journey-audit-summary",
  crossLinks: "hiring-journey-cross-links",
  sourceBadge: "hiring-journey-source-badge",
} as const;

export const HIRING_JOURNEY_ROUTES: Record<HiringJourneyPersona | "profile", string> = {
  candidate: "/dashboard/hiring-journey",
  profile: "/profile/hiring-journey",
  recruiter: "/recruiter/hiring-journey",
  company: "/company/hiring-journey",
  board: "/board/hiring-journey",
};

const STEP_STATUS_KEYS: Record<HiringJourneyStepStatus, TranslationKey> = {
  complete: "hiringJourney.statusComplete",
  ready: "hiringJourney.statusReady",
  in_review: "hiringJourney.statusInReview",
  blocked: "hiringJourney.statusBlocked",
  preview_only: "hiringJourney.statusPreviewOnly",
  not_started: "hiringJourney.statusNotStarted",
};

const OVERALL_STATUS_KEYS: Record<HiringJourneyOverallStatus, TranslationKey> = {
  preview: "hiringJourney.overallPreview",
  in_review: "hiringJourney.overallInReview",
  blocked: "hiringJourney.overallBlocked",
  ready_for_human_review: "hiringJourney.overallReadyForHumanReview",
};

const OWNER_KEYS: Record<HiringJourney["steps"][number]["owner"], TranslationKey> = {
  candidate: "hiringJourney.ownerCandidate",
  recruiter: "hiringJourney.ownerRecruiter",
  company: "hiringJourney.ownerCompany",
  board: "hiringJourney.ownerBoard",
  system: "hiringJourney.ownerSystem",
};

const SOURCE_KEYS: Record<HiringJourney["source"], TranslationKey> = {
  demo: "safePersistence.demoFallback",
  readiness_preview: "hiringJourney.sourceReadinessPreview",
};

const STEP_HREFS: Record<HiringJourneyStepId, Record<HiringJourneyPersona, string>> = {
  discovery: {
    candidate: "/dashboard/jobs",
    recruiter: "/recruiter/daily-cockpit",
    company: "/company/hiring-cockpit",
    board: "/board",
  },
  matching: {
    candidate: "/dashboard/matches",
    recruiter: "/recruiter/talent-radar",
    company: "/company/hiring-cockpit",
    board: "/board",
  },
  trust_review: {
    candidate: "/dashboard/trust/overview",
    recruiter: "/recruiter/daily-cockpit",
    company: "/company/candidate-trust",
    board: "/board",
  },
  candidate_readiness: {
    candidate: "/profile",
    recruiter: "/recruiter/candidates/demo-candidate-001",
    company: "/company/candidates/demo-candidate-001",
    board: "/board",
  },
  offer_readiness: {
    candidate: "/dashboard/offer-readiness",
    recruiter: "/recruiter/offer-readiness",
    company: "/company/offer-readiness",
    board: "/board/offer-readiness",
  },
  scheduling_proposal: {
    candidate: "/dashboard/scheduling-proposal",
    recruiter: "/recruiter/scheduling-proposal",
    company: "/company/scheduling-proposal",
    board: "/board/scheduling-proposal",
  },
  interview_preparation: {
    candidate: "/dashboard/calendar/readiness",
    recruiter: "/recruiter/daily-cockpit",
    company: "/company/hiring-cockpit",
    board: "/board/calendar-readiness",
  },
  decision_review: {
    candidate: "/dashboard/offer-readiness",
    recruiter: "/recruiter/offer-readiness",
    company: "/company/offer-readiness",
    board: "/board/offer-readiness",
  },
  offer_decision: {
    candidate: "/dashboard/offer-readiness",
    recruiter: "/recruiter/offer-readiness",
    company: "/company/offer-readiness",
    board: "/board/offer-readiness",
  },
  placement_verification: {
    candidate: "/dashboard/placement-verification",
    recruiter: "/recruiter/placement-verification",
    company: "/company/placement-verification",
    board: "/board/placement-verification",
  },
  onboarding_preview: {
    candidate: "/profile",
    recruiter: "/recruiter/candidates/demo-candidate-001",
    company: "/company/hiring-cockpit",
    board: "/board",
  },
};

export function hiringJourneyStepStatusKey(status: HiringJourneyStepStatus): TranslationKey {
  return STEP_STATUS_KEYS[status];
}

export function hiringJourneyOverallStatusKey(status: HiringJourneyOverallStatus): TranslationKey {
  return OVERALL_STATUS_KEYS[status];
}

export function hiringJourneyOwnerKey(owner: HiringJourney["steps"][number]["owner"]): TranslationKey {
  return OWNER_KEYS[owner];
}

export function hiringJourneySourceKey(source: HiringJourney["source"]): TranslationKey {
  return SOURCE_KEYS[source];
}

export function hiringJourneyPersonaRoute(persona: HiringJourneyPersona): string {
  return HIRING_JOURNEY_ROUTES[persona];
}

export function hiringJourneyCrossLinks(
  persona: HiringJourneyPersona,
): readonly { id: string; href: string; labelKey: TranslationKey }[] {
  const profileRoute =
    persona === "candidate" ? "/profile" : `/recruiter/candidates/demo-candidate-001`;
  const trustRoute =
    persona === "candidate"
      ? "/dashboard/trust/overview"
      : persona === "company"
        ? "/company/candidate-trust"
        : "/recruiter/daily-cockpit";
  const offerRoute = STEP_HREFS.offer_readiness[persona];
  const schedulingRoute = STEP_HREFS.scheduling_proposal[persona];
  const calendarRoute = STEP_HREFS.interview_preparation[persona];
  const placementRoute = STEP_HREFS.placement_verification[persona];
  const boardRoute = "/board/hiring-journey";

  return [
    { id: "profile", href: profileRoute, labelKey: "hiringJourney.crossLinkProfile" },
    { id: "trust", href: trustRoute, labelKey: "hiringJourney.crossLinkTrust" },
    { id: "offer_readiness", href: offerRoute, labelKey: "hiringJourney.crossLinkOfferReadiness" },
    { id: "scheduling_proposal", href: schedulingRoute, labelKey: "hiringJourney.crossLinkSchedulingProposal" },
    { id: "calendar_readiness", href: calendarRoute, labelKey: "hiringJourney.crossLinkCalendarReadiness" },
    { id: "placement_verification", href: placementRoute, labelKey: "hiringJourney.crossLinkPlacementVerification" },
    { id: "board", href: boardRoute, labelKey: "hiringJourney.crossLinkBoard" },
  ];
}

export function resolveHiringJourney(persona: HiringJourneyPersona): HiringJourney {
  const base = getHiringJourneyDemoBase(persona);
  const steps = getHiringJourneyStepTemplates().map((template) => ({
    ...template,
    href: STEP_HREFS[template.id][persona],
  }));
  return { ...base, steps };
}

export { HIRING_JOURNEY_PERSONAS, HIRING_JOURNEY_STEP_IDS } from "@/lib/hiring-journey-demo-data";
