/** Deterministic scheduling decision context — demo/readiness bundles only. */

import type { OperatingEvidenceSource } from "@/lib/operating-evidence";
import type { TranslationKey } from "@/lib/i18n";

export type SchedulingDecisionSurface =
  | "offer_readiness"
  | "placement_verification"
  | "calendar_readiness";

export type SchedulingRelationRow = {
  id: string;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  status: "ready" | "preview" | "blocked" | "staging_required";
};

export type SchedulingDecisionContextRecord = {
  surface: SchedulingDecisionSurface;
  source: OperatingEvidenceSource;
  offer_relations: readonly SchedulingRelationRow[];
  placement_relations: readonly SchedulingRelationRow[];
  calendar_relations: readonly SchedulingRelationRow[];
  boundary_keys: readonly TranslationKey[];
};

const OFFER_RELATIONS: SchedulingRelationRow[] = [
  {
    id: "candidate_questions",
    labelKey: "schedulingDecisionContext.relOfferQuestions",
    detailKey: "schedulingDecisionContext.relOfferQuestionsDetail",
    status: "preview",
  },
  {
    id: "checklist_readiness",
    labelKey: "schedulingDecisionContext.relOfferChecklist",
    detailKey: "schedulingDecisionContext.relOfferChecklistDetail",
    status: "preview",
  },
  {
    id: "human_decision",
    labelKey: "schedulingDecisionContext.relOfferHumanDecision",
    detailKey: "schedulingDecisionContext.relOfferHumanDecisionDetail",
    status: "blocked",
  },
];

const PLACEMENT_RELATIONS: SchedulingRelationRow[] = [
  {
    id: "internal_evidence",
    labelKey: "schedulingDecisionContext.relPlacementInternal",
    detailKey: "schedulingDecisionContext.relPlacementInternalDetail",
    status: "preview",
  },
  {
    id: "no_employer_confirm",
    labelKey: "schedulingDecisionContext.relPlacementNoEmployer",
    detailKey: "schedulingDecisionContext.relPlacementNoEmployerDetail",
    status: "blocked",
  },
  {
    id: "no_revenue",
    labelKey: "schedulingDecisionContext.relPlacementNoRevenue",
    detailKey: "schedulingDecisionContext.relPlacementNoRevenueDetail",
    status: "blocked",
  },
];

const CALENDAR_RELATIONS: SchedulingRelationRow[] = [
  {
    id: "microsoft_readiness",
    labelKey: "schedulingDecisionContext.relCalendarMicrosoft",
    detailKey: "schedulingDecisionContext.relCalendarMicrosoftDetail",
    status: "preview",
  },
  {
    id: "busy_read_preview",
    labelKey: "schedulingDecisionContext.relCalendarBusyRead",
    detailKey: "schedulingDecisionContext.relCalendarBusyReadDetail",
    status: "preview",
  },
  {
    id: "staging_smoke",
    labelKey: "schedulingDecisionContext.relCalendarStagingSmoke",
    detailKey: "schedulingDecisionContext.relCalendarStagingSmokeDetail",
    status: "staging_required",
  },
  {
    id: "no_live_sync",
    labelKey: "schedulingDecisionContext.relCalendarNoSync",
    detailKey: "schedulingDecisionContext.relCalendarNoSyncDetail",
    status: "blocked",
  },
];

const BOUNDARY_KEYS = [
  "schedulingDecisionContext.boundaryNoEventWrite",
  "schedulingDecisionContext.boundaryNoInvite",
  "schedulingDecisionContext.boundaryNoEmail",
  "schedulingDecisionContext.boundaryNoNotification",
  "schedulingDecisionContext.boundaryHumanReview",
  "schedulingDecisionContext.boundaryProductGate",
] as const satisfies readonly TranslationKey[];

export function getSchedulingDecisionContextDemo(
  surface: SchedulingDecisionSurface,
): SchedulingDecisionContextRecord {
  return {
    surface,
    source: "partial",
    offer_relations: OFFER_RELATIONS,
    placement_relations: PLACEMENT_RELATIONS,
    calendar_relations: CALENDAR_RELATIONS,
    boundary_keys: BOUNDARY_KEYS,
  };
}
