/** Deterministic pilot Safe Communication — draft only, no real PII or outbound. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const SAFE_COMMUNICATION_CANDIDATE_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const SAFE_COMMUNICATION_ROLE_DEMO_ID = JOB_PIPELINE_DEMO_ID;

export type DraftRecipientType = "candidate" | "hiring_manager" | "internal" | "consent_reviewer";

export type DraftPurpose =
  | "intro_status"
  | "hm_feedback_request"
  | "follow_up"
  | "internal_summary"
  | "consent_review_request";

export type DraftTone = "professional" | "warm" | "formal" | "internal";

export type DraftStatus = "draft" | "needs_review" | "blocked";

export type CommunicationDraft = {
  id: string;
  title: string;
  recipient_type: DraftRecipientType;
  purpose: DraftPurpose;
  tone: DraftTone;
  status: DraftStatus;
  owner_label: string;
  created_at: string;
  subject: string;
  body: string;
  placeholder_variables: string[];
  review_checklist: string[];
};

export type CommunicationAuditEventType =
  | "draft_created"
  | "consent_review"
  | "feedback_prepared"
  | "profile_reviewed";

export type CommunicationAuditEvent = {
  type: CommunicationAuditEventType;
  at: string;
  actor: string;
  summary: string;
};

export type InternalUpdateCard = {
  status: string;
  open_questions: string[];
  next_decision: string;
  follow_up_owner: string;
  team_tasks_surface: string;
};

export type CandidateSafeCommunicationRecord = {
  id: string;
  display_name: string;
  role_id: string;
  role_title: string;
  communication_status: "draft_only";
  consent_badge: string;
  decision_owner: string;
  pilot_labelled: true;
  drafts: CommunicationDraft[];
  default_draft_id: string;
  internal_update: InternalUpdateCard;
  audit_events: CommunicationAuditEvent[];
};

export type JobSafeCommunicationRecord = {
  role_id: string;
  title: string;
  department: string;
  communication_status: "draft_only";
  consent_badge: string;
  decision_owner: string;
  pilot_labelled: true;
  drafts: CommunicationDraft[];
  default_draft_id: string;
  internal_update: InternalUpdateCard;
  audit_events: CommunicationAuditEvent[];
};

const DEMO_DRAFTS: CommunicationDraft[] = [
  {
    id: "draft-intro-status",
    title: "Intro / status update",
    recipient_type: "candidate",
    purpose: "intro_status",
    tone: "professional",
    status: "needs_review",
    owner_label: "Recruiter (sample)",
    created_at: "2026-06-14T10:00:00Z",
    subject: "Update on your application — {{role_title}}",
    body:
      "Hello {{candidate_display_name}},\n\nThank you for your interest in {{role_title}} at {{company_name}}. This is a draft status update — not sent. Your profile is under review by the hiring team.\n\nNext step: human review of consent and fit evidence before any contact goes live.\n\n— Recruiter (sample)",
    placeholder_variables: ["candidate_display_name", "role_title", "company_name"],
    review_checklist: ["consent_reviewed", "fit_evidence_attached", "tone_approved"],
  },
  {
    id: "draft-hm-feedback",
    title: "HM feedback request",
    recipient_type: "hiring_manager",
    purpose: "hm_feedback_request",
    tone: "formal",
    status: "draft",
    owner_label: "Recruiter (sample)",
    created_at: "2026-06-13T11:30:00Z",
    subject: "Feedback request — {{candidate_display_name}} for {{role_title}}",
    body:
      "Hi {{hm_name}},\n\nPlease review the attached Profile 360 summary for {{candidate_display_name}}. This draft requests your feedback — no message sent.\n\nKey areas: technical depth, delivery confidence, team fit.\n\nReply in TWIN collaboration workspace — not via outbound email.\n\n— Recruiter (sample)",
    placeholder_variables: ["hm_name", "candidate_display_name", "role_title"],
    review_checklist: ["scorecard_linked", "evidence_complete", "deadline_set"],
  },
  {
    id: "draft-follow-up",
    title: "Follow-up (post-review)",
    recipient_type: "candidate",
    purpose: "follow_up",
    tone: "warm",
    status: "blocked",
    owner_label: "Recruiter (sample)",
    created_at: "2026-06-15T09:00:00Z",
    subject: "Following up — {{role_title}} opportunity",
    body:
      "Hello {{candidate_display_name}},\n\nThis follow-up draft is blocked pending consent review. Contact requires review — no automatic outreach.\n\nWe will reach out only after human approval of contact permission.\n\n— Recruiter (sample)",
    placeholder_variables: ["candidate_display_name", "role_title"],
    review_checklist: ["consent_cleared", "contact_permission_live", "human_approval"],
  },
  {
    id: "draft-internal-summary",
    title: "Internal hiring summary",
    recipient_type: "internal",
    purpose: "internal_summary",
    tone: "internal",
    status: "draft",
    owner_label: "Recruiter (sample)",
    created_at: "2026-06-14T15:00:00Z",
    subject: "Internal summary — {{candidate_display_name}} / {{role_title}}",
    body:
      "Team,\n\nInternal-only draft summary for debrief — not sent externally.\n\nFit: strong overlap on stack; delivery evidence pending.\nConsent: requires review before candidate contact.\nNext: HM feedback + scorecard completion.\n\n— Recruiter (sample)",
    placeholder_variables: ["candidate_display_name", "role_title"],
    review_checklist: ["no_pii_leak", "internal_only_confirmed"],
  },
  {
    id: "draft-consent-review",
    title: "Consent review request",
    recipient_type: "consent_reviewer",
    purpose: "consent_review_request",
    tone: "formal",
    status: "needs_review",
    owner_label: "Privacy reviewer (sample)",
    created_at: "2026-06-14T09:00:00Z",
    subject: "Consent review required — {{candidate_display_name}}",
    body:
      "Privacy team,\n\nPlease review contact permission context for {{candidate_display_name}} before any draft moves toward live contact.\n\nThis request is draft only — not sent. Human review required.\n\n— Privacy reviewer (sample)",
    placeholder_variables: ["candidate_display_name"],
    review_checklist: ["consent_source_verified", "allowed_use_checked", "retention_noted"],
  },
];

const DEMO_AUDIT: CommunicationAuditEvent[] = [
  {
    type: "draft_created",
    at: "2026-06-14T10:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Intro/status draft created — draft only, not sent.",
  },
  {
    type: "consent_review",
    at: "2026-06-14T09:00:00Z",
    actor: "Privacy reviewer (sample)",
    summary: "Consent review flagged — contact requires review.",
  },
  {
    type: "feedback_prepared",
    at: "2026-06-13T15:00:00Z",
    actor: "Hiring manager (sample)",
    summary: "HM feedback request draft prepared — no outbound sent.",
  },
  {
    type: "profile_reviewed",
    at: "2026-06-12T10:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Profile 360 reviewed before communication drafting.",
  },
];

const DEMO_INTERNAL_UPDATE: InternalUpdateCard = {
  status: "Draft library active — all messages require human review before any live contact.",
  open_questions: [
    "Is consent cleared for candidate-facing follow-up?",
    "Has HM completed scorecard evidence fields?",
  ],
  next_decision: "Approve or revise intro/status draft after consent review.",
  follow_up_owner: "Recruiter (sample)",
  team_tasks_surface: "team/tasks",
};

export function getCandidateSafeCommunicationDemo(): CandidateSafeCommunicationRecord {
  return {
    id: SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
    display_name: "Alex K. (sample)",
    role_id: SAFE_COMMUNICATION_ROLE_DEMO_ID,
    role_title: "Senior Backend Engineer (pilot)",
    communication_status: "draft_only",
    consent_badge: "Requires review",
    decision_owner: "Hiring manager (sample)",
    pilot_labelled: true,
    drafts: DEMO_DRAFTS,
    default_draft_id: "draft-intro-status",
    internal_update: DEMO_INTERNAL_UPDATE,
    audit_events: DEMO_AUDIT,
  };
}

export function getJobSafeCommunicationDemo(): JobSafeCommunicationRecord {
  return {
    role_id: SAFE_COMMUNICATION_ROLE_DEMO_ID,
    title: "Senior Backend Engineer (pilot)",
    department: "Engineering",
    communication_status: "draft_only",
    consent_badge: "Pilot sample — review required",
    decision_owner: "Hiring manager (sample)",
    pilot_labelled: true,
    drafts: DEMO_DRAFTS,
    default_draft_id: "draft-hm-feedback",
    internal_update: {
      ...DEMO_INTERNAL_UPDATE,
      status: "Role-scoped draft library — demo-only, no automatic outreach.",
    },
    audit_events: DEMO_AUDIT,
  };
}
