/** Scheduling decision context — read-only cross-surface readiness layer. */

import {
  getSchedulingDecisionContextDemo,
  type SchedulingDecisionContextRecord,
  type SchedulingDecisionSurface,
} from "@/lib/scheduling-decision-context-demo-data";
import {
  operatingEvidenceLastCheckedDemo,
  operatingEvidenceSourceKey,
  type OperatingEvidenceSnapshot,
} from "@/lib/operating-evidence";
import type { TranslationKey } from "@/lib/i18n";

export const SCHEDULING_DECISION_CONTEXT_DOC =
  "docs/SCHEDULING_DECISION_CONTEXT_2026-06-24.md";

export const SCHEDULING_DECISION_CONTEXT_MARKERS = {
  panel: "scheduling-decision-context-panel",
  sourceBadge: "scheduling-decision-context-source-badge",
  offerSection: "scheduling-decision-context-offer",
  placementSection: "scheduling-decision-context-placement",
  calendarSection: "scheduling-decision-context-calendar",
  boundarySection: "scheduling-decision-context-boundary",
  crossLinks: "scheduling-decision-context-cross-links",
} as const;

export const SCHEDULING_DECISION_CONTEXT_CROSS_LINKS = [
  {
    id: "offer_readiness",
    href: "/dashboard/offer-readiness",
    labelKey: "candidateOfferReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "placement_verification",
    href: "/dashboard/placement-verification",
    labelKey: "candidatePlacementVerification.pageTitle" as TranslationKey,
  },
  {
    id: "calendar_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "candidateCalendarReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "board_calendar",
    href: "/board/calendar-readiness",
    labelKey: "boardCalendarReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "board_placement",
    href: "/board/placement-verification",
    labelKey: "boardPlacementEvidence.pageTitle" as TranslationKey,
  },
  {
    id: "scheduling_proposal",
    href: "/dashboard/scheduling-proposal",
    labelKey: "schedulingProposal.pageTitle" as TranslationKey,
  },
  {
    id: "hiring_journey",
    href: "/dashboard/hiring-journey",
    labelKey: "hiringJourney.crossLinkHiringJourney" as TranslationKey,
  },
] as const;

export type SchedulingDecisionContextBundle = {
  record: SchedulingDecisionContextRecord;
  snapshot: OperatingEvidenceSnapshot;
};

const STATUS_KEYS: Record<
  SchedulingDecisionContextRecord["offer_relations"][number]["status"],
  TranslationKey
> = {
  ready: "schedulingDecisionContext.statusReady",
  preview: "schedulingDecisionContext.statusPreview",
  blocked: "schedulingDecisionContext.statusBlocked",
  staging_required: "schedulingDecisionContext.statusStagingRequired",
};

export function schedulingDecisionStatusKey(
  status: SchedulingDecisionContextRecord["offer_relations"][number]["status"],
): TranslationKey {
  return STATUS_KEYS[status];
}

export function resolveSchedulingDecisionContext(
  surface: SchedulingDecisionSurface,
): SchedulingDecisionContextBundle {
  const record = getSchedulingDecisionContextDemo(surface);
  return {
    record,
    snapshot: {
      source: record.source,
      last_checked_at: operatingEvidenceLastCheckedDemo(),
      status_summary_key: "schedulingDecisionContext.statusSummary",
      status_detail_key: "schedulingDecisionContext.statusDetail",
    },
  };
}

export { operatingEvidenceSourceKey };
