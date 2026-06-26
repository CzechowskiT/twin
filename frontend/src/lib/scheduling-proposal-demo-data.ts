/** Deterministic scheduling proposal pack — demo/readiness bundles only. */

import type { TranslationKey } from "@/lib/i18n";

export type SchedulingProposalPersona = "candidate" | "recruiter" | "company" | "board";

export type SchedulingProposalStatus =
  | "draft_preview"
  | "ready_for_human_review"
  | "blocked_by_calendar_gate"
  | "blocked_by_missing_consent"
  | "blocked_by_missing_staging_smoke";

export type SchedulingProposalActionState =
  | "not_started"
  | "preview_only"
  | "blocked"
  | "requires_human_review";

export type SchedulingProposalReadinessSignal = {
  id: string;
  labelKey: TranslationKey;
  evidenceKey: TranslationKey;
  status: "ready" | "partial" | "blocked";
};

export type SchedulingProposalBlockedAction = {
  id: string;
  actionKey: TranslationKey;
  reasonKey: TranslationKey;
};

export type SchedulingProposalChecklistItem = {
  id: string;
  itemKey: TranslationKey;
  status: "done" | "needed" | "blocked";
};

export type SchedulingProposalAuditEntry = {
  id: string;
  labelKey: TranslationKey;
  timestampLabelKey: TranslationKey;
  sourceKey: TranslationKey;
};

export type SchedulingProposal = {
  proposalId: string;
  candidateId: string;
  roleId: string;
  persona: SchedulingProposalPersona;
  status: SchedulingProposalStatus;
  actionState: SchedulingProposalActionState;
  source: "demo" | "readiness_preview";
  proposedWindowLabelKey: TranslationKey;
  proposedDurationMinutes: number;
  timezoneLabelKey: TranslationKey;
  readinessSignals: readonly SchedulingProposalReadinessSignal[];
  blockedActions: readonly SchedulingProposalBlockedAction[];
  humanReviewChecklist: readonly SchedulingProposalChecklistItem[];
  auditTrail: readonly SchedulingProposalAuditEntry[];
};

export const SCHEDULING_PROPOSAL_DEMO_ID = "demo-scheduling-proposal-001";
export const SCHEDULING_PROPOSAL_DEMO_CANDIDATE_ID = "demo-candidate-001";
export const SCHEDULING_PROPOSAL_DEMO_ROLE_ID = "demo-role-001";

const READINESS_SIGNALS: SchedulingProposalReadinessSignal[] = [
  {
    id: "offer_readiness",
    labelKey: "schedulingProposal.signalOfferReadiness",
    evidenceKey: "schedulingProposal.signalOfferReadinessEvidence",
    status: "partial",
  },
  {
    id: "placement_verification",
    labelKey: "schedulingProposal.signalPlacementVerification",
    evidenceKey: "schedulingProposal.signalPlacementVerificationEvidence",
    status: "partial",
  },
  {
    id: "calendar_readiness",
    labelKey: "schedulingProposal.signalCalendarReadiness",
    evidenceKey: "schedulingProposal.signalCalendarReadinessEvidence",
    status: "partial",
  },
  {
    id: "microsoft_busy_read",
    labelKey: "schedulingProposal.signalMicrosoftBusyRead",
    evidenceKey: "schedulingProposal.signalMicrosoftBusyReadEvidence",
    status: "blocked",
  },
  {
    id: "candidate_consent",
    labelKey: "schedulingProposal.signalCandidateConsent",
    evidenceKey: "schedulingProposal.signalCandidateConsentEvidence",
    status: "ready",
  },
];

const BLOCKED_ACTIONS: SchedulingProposalBlockedAction[] = [
  {
    id: "event_write",
    actionKey: "schedulingProposal.blockedEventWrite",
    reasonKey: "schedulingProposal.blockedEventWriteReason",
  },
  {
    id: "invite_sent",
    actionKey: "schedulingProposal.blockedInviteSent",
    reasonKey: "schedulingProposal.blockedInviteSentReason",
  },
  {
    id: "email_sent",
    actionKey: "schedulingProposal.blockedEmailSent",
    reasonKey: "schedulingProposal.blockedEmailSentReason",
  },
  {
    id: "calendar_sync",
    actionKey: "schedulingProposal.blockedCalendarSync",
    reasonKey: "schedulingProposal.blockedCalendarSyncReason",
  },
  {
    id: "ats_writeback",
    actionKey: "schedulingProposal.blockedAtsWriteback",
    reasonKey: "schedulingProposal.blockedAtsWritebackReason",
  },
  {
    id: "automatic_acceptance",
    actionKey: "schedulingProposal.blockedAutomaticAcceptance",
    reasonKey: "schedulingProposal.blockedAutomaticAcceptanceReason",
  },
];

const HUMAN_REVIEW_CHECKLIST: SchedulingProposalChecklistItem[] = [
  {
    id: "recruiter_review",
    itemKey: "schedulingProposal.checkRecruiterReview",
    status: "needed",
  },
  {
    id: "candidate_confirmation",
    itemKey: "schedulingProposal.checkCandidateConfirmation",
    status: "needed",
  },
  {
    id: "company_approval",
    itemKey: "schedulingProposal.checkCompanyApproval",
    status: "blocked",
  },
  {
    id: "calendar_gate",
    itemKey: "schedulingProposal.checkCalendarGate",
    status: "blocked",
  },
];

const AUDIT_TRAIL: SchedulingProposalAuditEntry[] = [
  {
    id: "demo_source",
    labelKey: "schedulingProposal.auditDemoSource",
    timestampLabelKey: "schedulingProposal.auditDemoTimestamp",
    sourceKey: "schedulingProposal.auditDemoSourceLabel",
  },
  {
    id: "offer_preview",
    labelKey: "schedulingProposal.auditOfferPreview",
    timestampLabelKey: "schedulingProposal.auditOfferTimestamp",
    sourceKey: "schedulingProposal.auditOfferSourceLabel",
  },
  {
    id: "placement_preview",
    labelKey: "schedulingProposal.auditPlacementPreview",
    timestampLabelKey: "schedulingProposal.auditPlacementTimestamp",
    sourceKey: "schedulingProposal.auditPlacementSourceLabel",
  },
  {
    id: "calendar_preview",
    labelKey: "schedulingProposal.auditCalendarPreview",
    timestampLabelKey: "schedulingProposal.auditCalendarTimestamp",
    sourceKey: "schedulingProposal.auditCalendarSourceLabel",
  },
  {
    id: "no_external_confirmation",
    labelKey: "schedulingProposal.auditNoExternalConfirmation",
    timestampLabelKey: "schedulingProposal.auditNoExternalTimestamp",
    sourceKey: "schedulingProposal.auditNoExternalSourceLabel",
  },
];

const PERSONA_STATUS: Record<SchedulingProposalPersona, SchedulingProposalStatus> = {
  candidate: "draft_preview",
  recruiter: "ready_for_human_review",
  company: "blocked_by_missing_consent",
  board: "blocked_by_missing_staging_smoke",
};

const PERSONA_ACTION_STATE: Record<SchedulingProposalPersona, SchedulingProposalActionState> = {
  candidate: "preview_only",
  recruiter: "requires_human_review",
  company: "blocked",
  board: "blocked",
};

export function getSchedulingProposalDemo(persona: SchedulingProposalPersona): SchedulingProposal {
  return {
    proposalId: SCHEDULING_PROPOSAL_DEMO_ID,
    candidateId: SCHEDULING_PROPOSAL_DEMO_CANDIDATE_ID,
    roleId: SCHEDULING_PROPOSAL_DEMO_ROLE_ID,
    persona,
    status: PERSONA_STATUS[persona],
    actionState: PERSONA_ACTION_STATE[persona],
    source: "readiness_preview",
    proposedWindowLabelKey: "schedulingProposal.proposedWindowDemo",
    proposedDurationMinutes: 45,
    timezoneLabelKey: "schedulingProposal.timezoneDemo",
    readinessSignals: READINESS_SIGNALS,
    blockedActions: BLOCKED_ACTIONS,
    humanReviewChecklist: HUMAN_REVIEW_CHECKLIST,
    auditTrail: AUDIT_TRAIL,
  };
}

export const SCHEDULING_PROPOSAL_PERSONAS: readonly SchedulingProposalPersona[] = [
  "candidate",
  "recruiter",
  "company",
  "board",
] as const;
