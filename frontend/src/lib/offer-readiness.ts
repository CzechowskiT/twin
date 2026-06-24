/** Offer readiness domain — read-only resolver, demo bundle, source badge. */

import type { TranslationKey } from "@/lib/i18n";
import type { OperatingEvidenceSource } from "@/lib/operating-evidence";

export const OFFER_READINESS_DEMO_CANDIDATE_ID = "demo-candidate-001";
export const OFFER_READINESS_DEMO_ROLE_ID = "demo-role-001";

export type OfferReadinessStatus =
  | "not_started"
  | "gathering"
  | "preview_ready"
  | "human_review"
  | "blocked";

export type OfferReadinessChecklistStatus = "done" | "pending" | "blocked" | "not_applicable";

export type OfferReadinessChecklistItem = {
  id: string;
  section_key: TranslationKey;
  detail_key: TranslationKey;
  status: OfferReadinessChecklistStatus;
};

export type OfferComparisonRow = {
  id: string;
  label_key: TranslationKey;
  current_value: string;
  estimated_value: string;
  note_key: TranslationKey;
};

export type OfferQuestionItem = {
  id: string;
  question_key: TranslationKey;
  context_key: TranslationKey;
  status: "open" | "answered_preview" | "blocked";
};

export type OfferReadinessRecord = {
  candidate_id: string;
  role_id: string;
  source: OperatingEvidenceSource;
  headline: string;
  role_title: string;
  company_label: string;
  readiness_status: OfferReadinessStatus;
  checklist: readonly OfferReadinessChecklistItem[];
  comparison_rows: readonly OfferComparisonRow[];
  questions: readonly OfferQuestionItem[];
  blocked_capabilities: readonly { id: string; label_key: TranslationKey; reason_key: TranslationKey }[];
};

export const OFFER_READINESS_SOURCE_KEYS: Record<OperatingEvidenceSource, TranslationKey> = {
  demo: "safePersistence.demoFallback",
  live: "safePersistence.liveApi",
  partial: "liveOperatingState.partialFallback",
  unavailable: "operatingEvidence.sourceUnavailable",
};

export function offerReadinessSourceKey(source: OperatingEvidenceSource): TranslationKey {
  return OFFER_READINESS_SOURCE_KEYS[source];
}

const DEMO_CHECKLIST: OfferReadinessChecklistItem[] = [
  {
    id: "role_fit",
    section_key: "candidateOfferReadiness.checkRoleFit",
    detail_key: "candidateOfferReadiness.checkRoleFitDetail",
    status: "done",
  },
  {
    id: "compensation_range",
    section_key: "candidateOfferReadiness.checkCompensation",
    detail_key: "candidateOfferReadiness.checkCompensationDetail",
    status: "pending",
  },
  {
    id: "benefits",
    section_key: "candidateOfferReadiness.checkBenefits",
    detail_key: "candidateOfferReadiness.checkBenefitsDetail",
    status: "pending",
  },
  {
    id: "start_date",
    section_key: "candidateOfferReadiness.checkStartDate",
    detail_key: "candidateOfferReadiness.checkStartDateDetail",
    status: "done",
  },
  {
    id: "work_arrangement",
    section_key: "candidateOfferReadiness.checkWorkArrangement",
    detail_key: "candidateOfferReadiness.checkWorkArrangementDetail",
    status: "done",
  },
  {
    id: "interview_feedback",
    section_key: "candidateOfferReadiness.checkInterviewFeedback",
    detail_key: "candidateOfferReadiness.checkInterviewFeedbackDetail",
    status: "done",
  },
  {
    id: "references",
    section_key: "candidateOfferReadiness.checkReferences",
    detail_key: "candidateOfferReadiness.checkReferencesDetail",
    status: "blocked",
  },
  {
    id: "background_check",
    section_key: "candidateOfferReadiness.checkBackground",
    detail_key: "candidateOfferReadiness.checkBackgroundDetail",
    status: "not_applicable",
  },
  {
    id: "decision_timeline",
    section_key: "candidateOfferReadiness.checkDecisionTimeline",
    detail_key: "candidateOfferReadiness.checkDecisionTimelineDetail",
    status: "pending",
  },
];

const DEMO_COMPARISON: OfferComparisonRow[] = [
  {
    id: "base_salary",
    label_key: "candidateOfferReadiness.compBaseSalary",
    current_value: "PLN 18,000/mo (self-reported)",
    estimated_value: "PLN 19,500–21,000/mo (demo range)",
    note_key: "candidateOfferReadiness.compBaseSalaryNote",
  },
  {
    id: "bonus",
    label_key: "candidateOfferReadiness.compBonus",
    current_value: "Not disclosed",
    estimated_value: "10% target (market demo)",
    note_key: "candidateOfferReadiness.compBonusNote",
  },
  {
    id: "equity",
    label_key: "candidateOfferReadiness.compEquity",
    current_value: "None expected",
    estimated_value: "None in demo role",
    note_key: "candidateOfferReadiness.compEquityNote",
  },
  {
    id: "pto",
    label_key: "candidateOfferReadiness.compPto",
    current_value: "26 days (current employer)",
    estimated_value: "24–26 days (demo estimate)",
    note_key: "candidateOfferReadiness.compPtoNote",
  },
];

const DEMO_QUESTIONS: OfferQuestionItem[] = [
  {
    id: "q1",
    question_key: "candidateOfferReadiness.questionRemoteDays",
    context_key: "candidateOfferReadiness.questionRemoteDaysContext",
    status: "open",
  },
  {
    id: "q2",
    question_key: "candidateOfferReadiness.questionProbation",
    context_key: "candidateOfferReadiness.questionProbationContext",
    status: "open",
  },
  {
    id: "q3",
    question_key: "candidateOfferReadiness.questionTeamSize",
    context_key: "candidateOfferReadiness.questionTeamSizeContext",
    status: "answered_preview",
  },
];

function getOfferReadinessDemo(): OfferReadinessRecord {
  return {
    candidate_id: OFFER_READINESS_DEMO_CANDIDATE_ID,
    role_id: OFFER_READINESS_DEMO_ROLE_ID,
    source: "demo",
    headline: "Offer readiness preview — demo role bundle, not a formal offer.",
    role_title: "Senior Backend Engineer",
    company_label: "Demo Corp (pilot)",
    readiness_status: "preview_ready",
    checklist: DEMO_CHECKLIST,
    comparison_rows: DEMO_COMPARISON,
    questions: DEMO_QUESTIONS,
    blocked_capabilities: [
      {
        id: "offer_send",
        label_key: "candidateOfferReadiness.blockedOfferSend",
        reason_key: "candidateOfferReadiness.blockedOfferSendReason",
      },
      {
        id: "contract_sign",
        label_key: "candidateOfferReadiness.blockedContractSign",
        reason_key: "candidateOfferReadiness.blockedContractSignReason",
      },
      {
        id: "salary_guarantee",
        label_key: "candidateOfferReadiness.blockedSalaryGuarantee",
        reason_key: "candidateOfferReadiness.blockedSalaryGuaranteeReason",
      },
    ],
  };
}

export function resolveCandidateOfferReadiness(
  candidateId?: string,
  roleId?: string,
): OfferReadinessRecord | null {
  const cid = (candidateId ?? OFFER_READINESS_DEMO_CANDIDATE_ID).trim();
  const rid = (roleId ?? OFFER_READINESS_DEMO_ROLE_ID).trim();
  if (!cid || !rid) return null;
  if (cid === OFFER_READINESS_DEMO_CANDIDATE_ID && rid === OFFER_READINESS_DEMO_ROLE_ID) {
    return getOfferReadinessDemo();
  }
  return null;
}

/** Adapt raw record for persona-specific views — read-only, no writes. */
export function adaptCandidateOfferReadiness(
  record: OfferReadinessRecord,
): OfferReadinessRecord {
  return {
    ...record,
    headline: record.headline,
    checklist: record.checklist.map((item) => ({ ...item })),
    comparison_rows: record.comparison_rows.map((row) => ({ ...row })),
    questions: record.questions.map((q) => ({ ...q })),
    blocked_capabilities: record.blocked_capabilities.map((cap) => ({ ...cap })),
  };
}
