/** Deterministic hiring journey timeline — demo/readiness bundles only. */

import type { TranslationKey } from "@/lib/i18n";

export type HiringJourneyPersona = "candidate" | "recruiter" | "company" | "board";

export type HiringJourneyStepStatus =
  | "complete"
  | "ready"
  | "in_review"
  | "blocked"
  | "preview_only"
  | "not_started";

export type HiringJourneyOwner = "candidate" | "recruiter" | "company" | "board" | "system";

export type HiringJourneyOverallStatus =
  | "preview"
  | "in_review"
  | "blocked"
  | "ready_for_human_review";

export type HiringJourneyStepId =
  | "discovery"
  | "matching"
  | "trust_review"
  | "candidate_readiness"
  | "offer_readiness"
  | "scheduling_proposal"
  | "interview_preparation"
  | "decision_review"
  | "offer_decision"
  | "placement_verification"
  | "onboarding_preview";

export const HIRING_JOURNEY_STEP_IDS: readonly HiringJourneyStepId[] = [
  "discovery",
  "matching",
  "trust_review",
  "candidate_readiness",
  "offer_readiness",
  "scheduling_proposal",
  "interview_preparation",
  "decision_review",
  "offer_decision",
  "placement_verification",
  "onboarding_preview",
] as const;

export type HiringJourneySourceModuleId =
  | "trust_center"
  | "profile_360"
  | "offer_readiness"
  | "scheduling_proposal"
  | "calendar_readiness"
  | "scheduling_decision_context"
  | "placement_verification"
  | "job_discovery"
  | "matching"
  | "onboarding_preview";

export type HiringJourneyStepProvenance = {
  evidenceLabelKey: TranslationKey;
  humanReviewRequired: boolean;
};

export type HiringJourneyStepTemplate = {
  id: HiringJourneyStepId;
  order: number;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  status: HiringJourneyStepStatus;
  owner: HiringJourneyOwner;
  sourceModuleId: HiringJourneySourceModuleId;
  sourceModuleKey: TranslationKey;
  evidenceSummaryKey: TranslationKey;
  provenance: HiringJourneyStepProvenance;
  blockerKey?: TranslationKey;
  nextSafeActionKey: TranslationKey;
  safetyBoundaryKey: TranslationKey;
};

export type HiringJourneyStep = HiringJourneyStepTemplate & {
  href: string;
};

export type HiringJourneyBlockedAction = {
  id: string;
  labelKey: TranslationKey;
  reasonKey: TranslationKey;
};

export type HiringJourneyAuditEntry = {
  id: string;
  labelKey: TranslationKey;
  sourceKey: TranslationKey;
  timestampLabelKey: TranslationKey;
};

export type HiringJourney = {
  journeyId: string;
  persona: HiringJourneyPersona;
  source: "demo" | "readiness_preview";
  overallStatus: HiringJourneyOverallStatus;
  blockingPointKey: TranslationKey;
  humanReviewRequiredKey: TranslationKey;
  noAutomaticActionKey: TranslationKey;
  steps: readonly HiringJourneyStep[];
  blockedActions: readonly HiringJourneyBlockedAction[];
  auditSummary: readonly HiringJourneyAuditEntry[];
};

export const HIRING_JOURNEY_DEMO_ID = "demo-hiring-journey-001";
export const HIRING_JOURNEY_DEMO_CANDIDATE_ID = "demo-candidate-001";
export const HIRING_JOURNEY_DEMO_ROLE_ID = "demo-role-001";

const STEP_TEMPLATES: HiringJourneyStepTemplate[] = [
  {
    id: "discovery",
    order: 1,
    titleKey: "hiringJourney.stepDiscoveryTitle",
    descriptionKey: "hiringJourney.stepDiscoveryDescription",
    status: "complete",
    owner: "candidate",
    sourceModuleId: "job_discovery",
    sourceModuleKey: "hiringJourney.moduleJobDiscovery",
    evidenceSummaryKey: "hiringJourney.stepDiscoveryEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceDiscoveryEvidenceLabel",
      humanReviewRequired: false,
    },
    nextSafeActionKey: "hiringJourney.stepDiscoveryNextAction",
    safetyBoundaryKey: "hiringJourney.stepDiscoverySafety",
  },
  {
    id: "matching",
    order: 2,
    titleKey: "hiringJourney.stepMatchingTitle",
    descriptionKey: "hiringJourney.stepMatchingDescription",
    status: "ready",
    owner: "system",
    sourceModuleId: "matching",
    sourceModuleKey: "hiringJourney.moduleMatching",
    evidenceSummaryKey: "hiringJourney.stepMatchingEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceMatchingEvidenceLabel",
      humanReviewRequired: false,
    },
    nextSafeActionKey: "hiringJourney.stepMatchingNextAction",
    safetyBoundaryKey: "hiringJourney.stepMatchingSafety",
  },
  {
    id: "trust_review",
    order: 3,
    titleKey: "hiringJourney.stepTrustTitle",
    descriptionKey: "hiringJourney.stepTrustDescription",
    status: "in_review",
    owner: "candidate",
    sourceModuleId: "trust_center",
    sourceModuleKey: "hiringJourney.moduleTrustCenter",
    evidenceSummaryKey: "hiringJourney.stepTrustEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceTrustEvidenceLabel",
      humanReviewRequired: true,
    },
    blockerKey: "hiringJourney.stepTrustBlocker",
    nextSafeActionKey: "hiringJourney.stepTrustNextAction",
    safetyBoundaryKey: "hiringJourney.stepTrustSafety",
  },
  {
    id: "candidate_readiness",
    order: 4,
    titleKey: "hiringJourney.stepProfileTitle",
    descriptionKey: "hiringJourney.stepProfileDescription",
    status: "preview_only",
    owner: "candidate",
    sourceModuleId: "profile_360",
    sourceModuleKey: "hiringJourney.moduleProfile360",
    evidenceSummaryKey: "hiringJourney.stepProfileEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceProfileEvidenceLabel",
      humanReviewRequired: true,
    },
    nextSafeActionKey: "hiringJourney.stepProfileNextAction",
    safetyBoundaryKey: "hiringJourney.stepProfileSafety",
  },
  {
    id: "offer_readiness",
    order: 5,
    titleKey: "hiringJourney.stepOfferReadinessTitle",
    descriptionKey: "hiringJourney.stepOfferReadinessDescription",
    status: "preview_only",
    owner: "recruiter",
    sourceModuleId: "offer_readiness",
    sourceModuleKey: "hiringJourney.moduleOfferReadiness",
    evidenceSummaryKey: "hiringJourney.stepOfferReadinessEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceOfferReadinessEvidenceLabel",
      humanReviewRequired: true,
    },
    blockerKey: "hiringJourney.stepOfferReadinessBlocker",
    nextSafeActionKey: "hiringJourney.stepOfferReadinessNextAction",
    safetyBoundaryKey: "hiringJourney.stepOfferReadinessSafety",
  },
  {
    id: "scheduling_proposal",
    order: 6,
    titleKey: "hiringJourney.stepSchedulingProposalTitle",
    descriptionKey: "hiringJourney.stepSchedulingProposalDescription",
    status: "blocked",
    owner: "recruiter",
    sourceModuleId: "scheduling_proposal",
    sourceModuleKey: "hiringJourney.moduleSchedulingProposal",
    evidenceSummaryKey: "hiringJourney.stepSchedulingProposalEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceSchedulingEvidenceLabel",
      humanReviewRequired: true,
    },
    blockerKey: "hiringJourney.stepSchedulingProposalBlocker",
    nextSafeActionKey: "hiringJourney.stepSchedulingProposalNextAction",
    safetyBoundaryKey: "hiringJourney.stepSchedulingProposalSafety",
  },
  {
    id: "interview_preparation",
    order: 7,
    titleKey: "hiringJourney.stepInterviewPrepTitle",
    descriptionKey: "hiringJourney.stepInterviewPrepDescription",
    status: "blocked",
    owner: "candidate",
    sourceModuleId: "calendar_readiness",
    sourceModuleKey: "hiringJourney.moduleCalendarReadiness",
    evidenceSummaryKey: "hiringJourney.stepInterviewPrepEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceInterviewPrepEvidenceLabel",
      humanReviewRequired: true,
    },
    blockerKey: "hiringJourney.stepInterviewPrepBlocker",
    nextSafeActionKey: "hiringJourney.stepInterviewPrepNextAction",
    safetyBoundaryKey: "hiringJourney.stepInterviewPrepSafety",
  },
  {
    id: "decision_review",
    order: 8,
    titleKey: "hiringJourney.stepDecisionReviewTitle",
    descriptionKey: "hiringJourney.stepDecisionReviewDescription",
    status: "not_started",
    owner: "recruiter",
    sourceModuleId: "scheduling_decision_context",
    sourceModuleKey: "hiringJourney.moduleDecisionContext",
    evidenceSummaryKey: "hiringJourney.stepDecisionReviewEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceDecisionReviewEvidenceLabel",
      humanReviewRequired: true,
    },
    nextSafeActionKey: "hiringJourney.stepDecisionReviewNextAction",
    safetyBoundaryKey: "hiringJourney.stepDecisionReviewSafety",
  },
  {
    id: "offer_decision",
    order: 9,
    titleKey: "hiringJourney.stepOfferDecisionTitle",
    descriptionKey: "hiringJourney.stepOfferDecisionDescription",
    status: "not_started",
    owner: "company",
    sourceModuleId: "offer_readiness",
    sourceModuleKey: "hiringJourney.moduleOfferReadiness",
    evidenceSummaryKey: "hiringJourney.stepOfferDecisionEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceOfferDecisionEvidenceLabel",
      humanReviewRequired: true,
    },
    nextSafeActionKey: "hiringJourney.stepOfferDecisionNextAction",
    safetyBoundaryKey: "hiringJourney.stepOfferDecisionSafety",
  },
  {
    id: "placement_verification",
    order: 10,
    titleKey: "hiringJourney.stepPlacementTitle",
    descriptionKey: "hiringJourney.stepPlacementDescription",
    status: "preview_only",
    owner: "board",
    sourceModuleId: "placement_verification",
    sourceModuleKey: "hiringJourney.modulePlacementVerification",
    evidenceSummaryKey: "hiringJourney.stepPlacementEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenancePlacementEvidenceLabel",
      humanReviewRequired: true,
    },
    blockerKey: "hiringJourney.stepPlacementBlocker",
    nextSafeActionKey: "hiringJourney.stepPlacementNextAction",
    safetyBoundaryKey: "hiringJourney.stepPlacementSafety",
  },
  {
    id: "onboarding_preview",
    order: 11,
    titleKey: "hiringJourney.stepOnboardingTitle",
    descriptionKey: "hiringJourney.stepOnboardingDescription",
    status: "not_started",
    owner: "system",
    sourceModuleId: "onboarding_preview",
    sourceModuleKey: "hiringJourney.moduleOnboardingPreview",
    evidenceSummaryKey: "hiringJourney.stepOnboardingEvidence",
    provenance: {
      evidenceLabelKey: "hiringJourney.provenanceOnboardingEvidenceLabel",
      humanReviewRequired: false,
    },
    nextSafeActionKey: "hiringJourney.stepOnboardingNextAction",
    safetyBoundaryKey: "hiringJourney.stepOnboardingSafety",
  },
];

const BLOCKED_ACTIONS: HiringJourneyBlockedAction[] = [
  {
    id: "no_advancement",
    labelKey: "hiringJourney.blockedNoAdvancement",
    reasonKey: "hiringJourney.blockedNoAdvancementReason",
  },
  {
    id: "no_interview_scheduled",
    labelKey: "hiringJourney.blockedNoInterviewScheduled",
    reasonKey: "hiringJourney.blockedNoInterviewScheduledReason",
  },
  {
    id: "no_invite_sent",
    labelKey: "hiringJourney.blockedNoInviteSent",
    reasonKey: "hiringJourney.blockedNoInviteSentReason",
  },
  {
    id: "no_email_sent",
    labelKey: "hiringJourney.blockedNoEmailSent",
    reasonKey: "hiringJourney.blockedNoEmailSentReason",
  },
  {
    id: "no_calendar_sync",
    labelKey: "hiringJourney.blockedNoCalendarSync",
    reasonKey: "hiringJourney.blockedNoCalendarSyncReason",
  },
  {
    id: "no_ats_writeback",
    labelKey: "hiringJourney.blockedNoAtsWriteback",
    reasonKey: "hiringJourney.blockedNoAtsWritebackReason",
  },
  {
    id: "no_payment",
    labelKey: "hiringJourney.blockedNoPayment",
    reasonKey: "hiringJourney.blockedNoPaymentReason",
  },
  {
    id: "no_employer_confirmation",
    labelKey: "hiringJourney.blockedNoEmployerConfirmation",
    reasonKey: "hiringJourney.blockedNoEmployerConfirmationReason",
  },
];

const AUDIT_SUMMARY: HiringJourneyAuditEntry[] = [
  {
    id: "profile_360",
    labelKey: "hiringJourney.auditProfile360",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditProfile360Source",
  },
  {
    id: "trust_center",
    labelKey: "hiringJourney.auditTrustCenter",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditTrustCenterSource",
  },
  {
    id: "offer_readiness",
    labelKey: "hiringJourney.auditOfferReadiness",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditOfferReadinessSource",
  },
  {
    id: "scheduling_proposal",
    labelKey: "hiringJourney.auditSchedulingProposal",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditSchedulingProposalSource",
  },
  {
    id: "placement_verification",
    labelKey: "hiringJourney.auditPlacementVerification",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditPlacementVerificationSource",
  },
  {
    id: "calendar_readiness",
    labelKey: "hiringJourney.auditCalendarReadiness",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditCalendarReadinessSource",
  },
  {
    id: "board_evidence",
    labelKey: "hiringJourney.auditBoardEvidence",
    timestampLabelKey: "hiringJourney.auditTimestamp",
    sourceKey: "hiringJourney.auditBoardEvidenceSource",
  },
];

const PERSONA_OVERALL_STATUS: Record<HiringJourneyPersona, HiringJourneyOverallStatus> = {
  candidate: "preview",
  recruiter: "ready_for_human_review",
  company: "in_review",
  board: "blocked",
};

export function getHiringJourneyStepTemplates(): readonly HiringJourneyStepTemplate[] {
  return STEP_TEMPLATES;
}

export function hiringJourneyHumanReviewStepIds(): readonly HiringJourneyStepId[] {
  return STEP_TEMPLATES.filter((step) => step.provenance.humanReviewRequired).map((step) => step.id);
}

export function getHiringJourneyBlockedActions(): readonly HiringJourneyBlockedAction[] {
  return BLOCKED_ACTIONS;
}

export function getHiringJourneyAuditSummary(): readonly HiringJourneyAuditEntry[] {
  return AUDIT_SUMMARY;
}

const PERSONA_BLOCKING_POINT: Record<HiringJourneyPersona, TranslationKey> = {
  candidate: "hiringJourney.blockingPointScheduling",
  recruiter: "hiringJourney.blockingPointScheduling",
  company: "hiringJourney.blockingPointScheduling",
  board: "hiringJourney.blockingPointBoard",
};

export function getHiringJourneyDemoBase(persona: HiringJourneyPersona): Omit<HiringJourney, "steps"> {
  return {
    journeyId: HIRING_JOURNEY_DEMO_ID,
    persona,
    source: "readiness_preview",
    overallStatus: PERSONA_OVERALL_STATUS[persona],
    blockingPointKey: PERSONA_BLOCKING_POINT[persona],
    humanReviewRequiredKey: "hiringJourney.humanReviewRequired",
    noAutomaticActionKey: "hiringJourney.noAutomaticAction",
    blockedActions: BLOCKED_ACTIONS,
    auditSummary: AUDIT_SUMMARY,
  };
}

export const HIRING_JOURNEY_PERSONAS: readonly HiringJourneyPersona[] = [
  "candidate",
  "recruiter",
  "company",
  "board",
] as const;
