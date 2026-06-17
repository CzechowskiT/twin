/** Deterministic pilot trust layer — consent, contact permission, history (sample only, no real PII). */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_TRUST_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_TRUST_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type ConsentDataSource =
  | "candidate_submitted"
  | "ats_import"
  | "recruiter_entry"
  | "referral"
  | "talent_pool";

export type ContactChannelStatus = "review_required" | "not_allowed" | "not_live" | "prohibited";

export type ContactChannel = {
  channel: "email" | "phone" | "linkedin" | "automated";
  status: ContactChannelStatus;
  note: string;
};

export type ContactHistoryEventType =
  | "imported"
  | "consent_review"
  | "talent_radar"
  | "digest"
  | "note"
  | "feedback_requested";

export type ContactHistoryEvent = {
  id: string;
  type: ContactHistoryEventType;
  at: string;
  actor: string;
  summary: string;
  outbound_sent: false;
};

export type TrustRiskFlag = {
  id: string;
  label: string;
  detail: string;
};

export type CandidateTrustRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  pipeline_stage: string;
  consent_badge: string;
  contact_permission_badge: string;
  last_reviewed_at: string;
  trust_label: string;
  consent_requires_review: true;
  consent_status: string;
  consent_source: ConsentDataSource;
  consent_recorded_at: string;
  consent_owner: string;
  consent_confidence: "pilot_signal" | "needs_verification";
  data_source: ConsentDataSource;
  legal_basis_note: string;
  processing_context: string;
  allowed_purposes: string[];
  contact_after_review: true;
  contact_channels: ContactChannel[];
  contact_history: ContactHistoryEvent[];
  retention_status: string;
  next_review_at: string;
  risk_flags: TrustRiskFlag[];
  pilot_labelled: true;
};

const DEMO_CONTACT_HISTORY: ContactHistoryEvent[] = [
  {
    id: "ch-001",
    type: "imported",
    at: "2026-06-01T10:00:00Z",
    actor: "Talent pool import (sample)",
    summary: "Profile imported into workspace-scoped talent pool — no outbound contact.",
    outbound_sent: false,
  },
  {
    id: "ch-002",
    type: "consent_review",
    at: "2026-06-03T14:20:00Z",
    actor: "Recruiter (sample)",
    summary: "Consent evidence flagged for privacy review — human decision required before contact.",
    outbound_sent: false,
  },
  {
    id: "ch-003",
    type: "talent_radar",
    at: "2026-06-05T09:00:00Z",
    actor: "Talent Radar (sample)",
    summary: "Resurfaced on internal radar for demo-role-001 — pilot signal only.",
    outbound_sent: false,
  },
  {
    id: "ch-004",
    type: "digest",
    at: "2026-06-07T08:00:00Z",
    actor: "Weekly digest (sample)",
    summary: "Included in recruiter digest briefing — copy-only, no message sent.",
    outbound_sent: false,
  },
  {
    id: "ch-005",
    type: "note",
    at: "2026-06-10T09:15:00Z",
    actor: "Recruiter (sample)",
    summary: "Internal note added in collaboration workspace — not visible to candidate.",
    outbound_sent: false,
  },
  {
    id: "ch-006",
    type: "feedback_requested",
    at: "2026-06-11T14:30:00Z",
    actor: "Hiring manager (sample)",
    summary: "Structured feedback requested in pilot — no automated outreach triggered.",
    outbound_sent: false,
  },
];

const DEMO_RISK_FLAGS: TrustRiskFlag[] = [
  {
    id: "rf-001",
    label: "Missing consent evidence",
    detail: "Source receipt not fully verified — privacy review needed before contact.",
  },
  {
    id: "rf-002",
    label: "Source verification",
    detail: "Import path requires recruiter attestation — pilot signal only.",
  },
  {
    id: "rf-003",
    label: "Role-specific only",
    detail: "Consent scoped to demo-role-001 — not transferable to other roles without review.",
  },
  {
    id: "rf-004",
    label: "No auto outreach",
    detail: "Automated sequences and bulk contact are prohibited on this pilot.",
  },
  {
    id: "rf-005",
    label: "Data minimization",
    detail: "Contact history shows workspace events only — no hidden PII or external sends.",
  },
];

const DEMO_RECORD: CandidateTrustRecord = {
  id: CANDIDATE_TRUST_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_TRUST_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  pipeline_stage: "Screening",
  consent_badge: "Requires review",
  contact_permission_badge: "Contact after review",
  last_reviewed_at: "2026-06-03T14:20:00Z",
  trust_label: "Consent requires review · workspace-scoped",
  consent_requires_review: true,
  consent_status: "Requires review",
  consent_source: "talent_pool",
  consent_recorded_at: "2026-06-01T10:00:00Z",
  consent_owner: "Recruiter workspace (sample)",
  consent_confidence: "pilot_signal",
  data_source: "talent_pool",
  legal_basis_note:
    "Processing context shown for recruiter review — not legal advice. Confirm basis with your DPO before contact.",
  processing_context: "Internal talent pool import for demo-role-001 — role-scoped evaluation only.",
  allowed_purposes: [
    "Evaluate fit for demo-role-001",
    "Internal recruiter and hiring team review",
    "Structured feedback and scorecard (pilot)",
  ],
  contact_after_review: true,
  contact_channels: [
    {
      channel: "email",
      status: "review_required",
      note: "Email contact requires privacy review — demo channel status only.",
    },
    {
      channel: "phone",
      status: "not_allowed",
      note: "Phone contact not allowed on this pilot record.",
    },
    {
      channel: "linkedin",
      status: "not_live",
      note: "LinkedIn integration not live — no in-product send.",
    },
    {
      channel: "automated",
      status: "prohibited",
      note: "Automated outreach prohibited — human decision required.",
    },
  ],
  contact_history: DEMO_CONTACT_HISTORY,
  retention_status: "Active pilot retention — review cycle scheduled",
  next_review_at: "2026-07-01T00:00:00Z",
  risk_flags: DEMO_RISK_FLAGS,
  pilot_labelled: true,
};

export function getCandidateTrustDemo(): CandidateTrustRecord {
  return DEMO_RECORD;
}
