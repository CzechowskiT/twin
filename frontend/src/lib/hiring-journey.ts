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

export type HiringJourneyRouteSurface =
  | "candidate_dashboard"
  | "candidate_profile"
  | "recruiter"
  | "company"
  | "board";

export const HIRING_JOURNEY_DOC = "docs/HIRING_JOURNEY_TIMELINE_2026-06-25.md";

export const HIRING_JOURNEY_PAGE_MARKER = "hiring-journey-page";

export const HIRING_JOURNEY_MARKERS = {
  page: HIRING_JOURNEY_PAGE_MARKER,
  header: "hiring-journey-header",
  readOnlyBadge: "hiring-journey-read-only-badge",
  readOnlyNote: "hiring-journey-read-only-note",
  noLiveAction: "hiring-journey-no-live-action",
  boardBlocked: "hiring-journey-board-blocked",
  overallStatus: "hiring-journey-overall-status",
  timeline: "hiring-journey-timeline",
  blockedActions: "hiring-journey-blocked-actions",
  auditSummary: "hiring-journey-audit-summary",
  crossLinks: "hiring-journey-cross-links",
  sourceBadge: "hiring-journey-source-badge",
  personaLabel: "hiring-journey-persona-label",
  aliasNav: "hiring-journey-alias-nav",
  overviewLink: "hiring-journey-overview-link",
  boardStepNavBlocked: "hiring-journey-board-step-nav-blocked",
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

const PERSONA_LABEL_KEYS: Record<HiringJourneyRouteSurface, TranslationKey> = {
  candidate_dashboard: "hiringJourney.personaLabelCandidateDashboard",
  candidate_profile: "hiringJourney.personaLabelCandidateProfile",
  recruiter: "hiringJourney.personaLabelRecruiter",
  company: "hiringJourney.personaLabelCompany",
  board: "hiringJourney.personaLabelBoard",
};

const OVERVIEW_LINKS: Record<HiringJourneyRouteSurface, { href: string; labelKey: TranslationKey }> = {
  candidate_dashboard: { href: "/dashboard", labelKey: "hiringJourney.overviewLinkDashboard" },
  candidate_profile: { href: "/profile", labelKey: "hiringJourney.overviewLinkProfile" },
  recruiter: { href: "/recruiter/daily-cockpit", labelKey: "hiringJourney.overviewLinkRecruiter" },
  company: { href: "/company/hiring-cockpit", labelKey: "hiringJourney.overviewLinkCompany" },
  board: { href: "/board", labelKey: "hiringJourney.overviewLinkBoard" },
};

export function hiringJourneySurfacePersona(surface: HiringJourneyRouteSurface): HiringJourneyPersona {
  if (surface === "candidate_dashboard" || surface === "candidate_profile") return "candidate";
  return surface;
}

export function hiringJourneyPersonaLabelKey(surface: HiringJourneyRouteSurface): TranslationKey {
  return PERSONA_LABEL_KEYS[surface];
}

export function hiringJourneyOverviewLink(
  surface: HiringJourneyRouteSurface,
): { href: string; labelKey: TranslationKey } {
  return OVERVIEW_LINKS[surface];
}

export function hiringJourneyCandidateAliasNav(
  surface: HiringJourneyRouteSurface,
): { href: string; labelKey: TranslationKey } | null {
  if (surface === "candidate_dashboard") {
    return { href: HIRING_JOURNEY_ROUTES.profile, labelKey: "hiringJourney.aliasLinkProfile" };
  }
  if (surface === "candidate_profile") {
    return { href: HIRING_JOURNEY_ROUTES.candidate, labelKey: "hiringJourney.aliasLinkDashboard" };
  }
  return null;
}

export function hiringJourneyBoardStepNavBlocked(persona: HiringJourneyPersona): boolean {
  return persona === "board";
}

export function hiringJourneyCrossLinks(
  persona: HiringJourneyPersona,
): readonly { id: string; href: string; labelKey: TranslationKey }[] {
  const profileRoute =
    persona === "candidate"
      ? "/profile"
      : persona === "company"
        ? "/company/candidates/demo-candidate-001"
        : persona === "board"
          ? "/board"
          : `/recruiter/candidates/demo-candidate-001`;
  const trustRoute =
    persona === "candidate"
      ? "/dashboard/trust/overview"
      : persona === "company"
        ? "/company/candidate-trust"
        : persona === "board"
          ? "/board"
          : "/recruiter/daily-cockpit";
  const offerRoute = STEP_HREFS.offer_readiness[persona];
  const schedulingRoute = STEP_HREFS.scheduling_proposal[persona];
  const calendarRoute = STEP_HREFS.interview_preparation[persona];
  const placementRoute = STEP_HREFS.placement_verification[persona];
  const boardRoute = "/board/hiring-journey";

  const links = [
    { id: "profile", href: profileRoute, labelKey: "hiringJourney.crossLinkProfile" as TranslationKey },
    { id: "trust", href: trustRoute, labelKey: "hiringJourney.crossLinkTrust" as TranslationKey },
    { id: "offer_readiness", href: offerRoute, labelKey: "hiringJourney.crossLinkOfferReadiness" as TranslationKey },
    {
      id: "scheduling_proposal",
      href: schedulingRoute,
      labelKey: "hiringJourney.crossLinkSchedulingProposal" as TranslationKey,
    },
    {
      id: "calendar_readiness",
      href: calendarRoute,
      labelKey: "hiringJourney.crossLinkCalendarReadiness" as TranslationKey,
    },
    {
      id: "placement_verification",
      href: placementRoute,
      labelKey: "hiringJourney.crossLinkPlacementVerification" as TranslationKey,
    },
    { id: "board", href: boardRoute, labelKey: "hiringJourney.crossLinkBoard" as TranslationKey },
  ];

  return persona === "board" ? links.filter((link) => link.id !== "board") : links;
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
