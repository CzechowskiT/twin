/** Scheduling proposal pack — read-only cross-surface readiness layer. */

import {
  getSchedulingProposalDemo,
  SCHEDULING_PROPOSAL_PERSONAS,
  type SchedulingProposal,
  type SchedulingProposalPersona,
  type SchedulingProposalStatus,
} from "@/lib/scheduling-proposal-demo-data";
import type { TranslationKey } from "@/lib/i18n";
import { HIRING_JOURNEY_ROUTES } from "@/lib/hiring-journey";

export const SCHEDULING_PROPOSAL_DOC = "docs/SCHEDULING_PROPOSAL_PACK_2026-06-25.md";

export const SCHEDULING_PROPOSAL_PAGE_MARKER = "scheduling-proposal-page";

export const SCHEDULING_PROPOSAL_MARKERS = {
  page: SCHEDULING_PROPOSAL_PAGE_MARKER,
  header: "scheduling-proposal-header",
  readOnlyBadge: "scheduling-proposal-read-only-badge",
  summary: "scheduling-proposal-summary",
  readinessSignals: "scheduling-proposal-readiness-signals",
  humanReview: "scheduling-proposal-human-review",
  blockedActions: "scheduling-proposal-blocked-actions",
  auditTrail: "scheduling-proposal-audit-trail",
  crossLinks: "scheduling-proposal-cross-links",
  sourceBadge: "scheduling-proposal-source-badge",
} as const;

export const SCHEDULING_PROPOSAL_ROUTES: Record<SchedulingProposalPersona | "profile", string> = {
  candidate: "/dashboard/scheduling-proposal",
  profile: "/profile/scheduling-proposal",
  recruiter: "/recruiter/scheduling-proposal",
  company: "/company/scheduling-proposal",
  board: "/board/scheduling-proposal",
};

const STATUS_KEYS: Record<SchedulingProposalStatus, TranslationKey> = {
  draft_preview: "schedulingProposal.statusDraftPreview",
  ready_for_human_review: "schedulingProposal.statusReadyForHumanReview",
  blocked_by_calendar_gate: "schedulingProposal.statusBlockedByCalendarGate",
  blocked_by_missing_consent: "schedulingProposal.statusBlockedByMissingConsent",
  blocked_by_missing_staging_smoke: "schedulingProposal.statusBlockedByMissingStagingSmoke",
};

const SIGNAL_STATUS_KEYS: Record<
  SchedulingProposal["readinessSignals"][number]["status"],
  TranslationKey
> = {
  ready: "schedulingProposal.signalStatusReady",
  partial: "schedulingProposal.signalStatusPartial",
  blocked: "schedulingProposal.signalStatusBlocked",
};

const CHECKLIST_STATUS_KEYS: Record<
  SchedulingProposal["humanReviewChecklist"][number]["status"],
  TranslationKey
> = {
  done: "schedulingProposal.checklistStatusDone",
  needed: "schedulingProposal.checklistStatusNeeded",
  blocked: "schedulingProposal.checklistStatusBlocked",
};

const SOURCE_KEYS: Record<SchedulingProposal["source"], TranslationKey> = {
  demo: "safePersistence.demoFallback",
  readiness_preview: "schedulingProposal.sourceReadinessPreview",
};

export function schedulingProposalStatusKey(status: SchedulingProposalStatus): TranslationKey {
  return STATUS_KEYS[status];
}

export function schedulingProposalSignalStatusKey(
  status: SchedulingProposal["readinessSignals"][number]["status"],
): TranslationKey {
  return SIGNAL_STATUS_KEYS[status];
}

export function schedulingProposalChecklistStatusKey(
  status: SchedulingProposal["humanReviewChecklist"][number]["status"],
): TranslationKey {
  return CHECKLIST_STATUS_KEYS[status];
}

export function schedulingProposalSourceKey(source: SchedulingProposal["source"]): TranslationKey {
  return SOURCE_KEYS[source];
}

export function schedulingProposalPersonaRoute(persona: SchedulingProposalPersona): string {
  return SCHEDULING_PROPOSAL_ROUTES[persona];
}

export function schedulingProposalCrossLinks(
  persona: SchedulingProposalPersona,
): readonly { id: string; href: string; labelKey: TranslationKey }[] {
  const offerRoute =
    persona === "candidate"
      ? "/dashboard/offer-readiness"
      : persona === "recruiter"
        ? "/recruiter/offer-readiness"
        : persona === "company"
          ? "/company/offer-readiness"
          : "/board/offer-readiness";

  const placementRoute =
    persona === "board"
      ? "/board/placement-verification"
      : persona === "company"
        ? "/company/placement-verification"
        : persona === "recruiter"
          ? "/recruiter/placement-verification"
          : "/dashboard/placement-verification";

  const calendarRoute =
    persona === "board" ? "/board/calendar-readiness" : "/dashboard/calendar/readiness";

  const trustRoute =
    persona === "candidate" ? "/dashboard/trust/overview" : "/recruiter/daily-cockpit";

  const boardRoute = "/board/scheduling-proposal";

  return [
    { id: "offer_readiness", href: offerRoute, labelKey: "schedulingProposal.crossLinkOfferReadiness" },
    {
      id: "placement_verification",
      href: placementRoute,
      labelKey: "schedulingProposal.crossLinkPlacementVerification",
    },
    { id: "calendar_readiness", href: calendarRoute, labelKey: "schedulingProposal.crossLinkCalendarReadiness" },
    { id: "trust", href: trustRoute, labelKey: "schedulingProposal.crossLinkTrust" },
    { id: "board", href: boardRoute, labelKey: "schedulingProposal.crossLinkBoard" },
    {
      id: "hiring_journey",
      href: HIRING_JOURNEY_ROUTES[persona],
      labelKey: "hiringJourney.crossLinkHiringJourney",
    },
  ];
}

export function resolveSchedulingProposal(persona: SchedulingProposalPersona): SchedulingProposal {
  return getSchedulingProposalDemo(persona);
}

export { SCHEDULING_PROPOSAL_PERSONAS, getSchedulingProposalDemo };
