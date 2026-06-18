/** Deterministic pilot Candidate Control Center — sample only, no real PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_CONTROL_CENTER_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_CONTROL_CENTER_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type VisibilityControlSetting = {
  id: string;
  label: string;
  current: "visible" | "hidden" | "review_required";
  note: string;
  mutable: false;
};

export type ExportPreviewSection = {
  id: string;
  label: string;
  item_count: number;
  sample_items: string[];
  downloadable: false;
};

export type CorrectionRequestPreview = {
  id: string;
  field: string;
  current_value: string;
  suggested_correction: string;
  status: "preview_only" | "submitted_preview";
  note: string;
};

export type ConsentReviewItem = {
  id: string;
  purpose: string;
  status: "active" | "review_required" | "not_live";
  last_reviewed_at: string;
  note: string;
};

export type CommunicationPrefControl = {
  channel: "email" | "in_app" | "calendar_hold" | "recruiter_contact";
  status: "opt_in" | "review_required" | "not_live" | "disabled";
  editable: false;
  note: string;
};

export type AppMatchTransparencyItem = {
  id: string;
  kind: "application" | "match";
  role_id: string;
  role_title: string;
  shared_fields: string[];
  withheld_fields: string[];
  human_review_required: true;
};

export type AuditTimelineEventType =
  | "visibility_reviewed"
  | "export_preview_opened"
  | "correction_preview_saved"
  | "consent_reviewed"
  | "comm_pref_viewed"
  | "revoke_planned";

export type AuditTimelineEvent = {
  id: string;
  type: AuditTimelineEventType;
  at: string;
  summary: string;
  backend_write: false;
};

export type CandidateControlCenterRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  control_label: string;
  last_reviewed_at: string;
  visibility_controls: VisibilityControlSetting[];
  export_preview_sections: ExportPreviewSection[];
  correction_requests: CorrectionRequestPreview[];
  consent_review_items: ConsentReviewItem[];
  communication_preferences: CommunicationPrefControl[];
  app_match_transparency: AppMatchTransparencyItem[];
  revoke_disabled: true;
  delete_disabled: true;
  audit_timeline: AuditTimelineEvent[];
  pilot_labelled: true;
};

const DEMO_VISIBILITY: VisibilityControlSetting[] = [
  {
    id: "vis-ctrl-001",
    label: "Profile headline & skills",
    current: "visible",
    note: "Shown when you apply — recruiters see workspace-scoped summary.",
    mutable: false,
  },
  {
    id: "vis-ctrl-002",
    label: "Contact email & phone",
    current: "hidden",
    note: "Withheld until you apply and consent to recruiter contact.",
    mutable: false,
  },
  {
    id: "vis-ctrl-003",
    label: "Match fit score for demo-role-001",
    current: "review_required",
    note: "Pilot signal — you review before applying.",
    mutable: false,
  },
];

const DEMO_EXPORT: ExportPreviewSection[] = [
  {
    id: "exp-001",
    label: "Profile & CV text",
    item_count: 12,
    sample_items: ["Headline", "Skills list", "Experience summary"],
    downloadable: false,
  },
  {
    id: "exp-002",
    label: "Applications (demo-role-001)",
    item_count: 1,
    sample_items: ["Application status", "Submitted at", "Role context"],
    downloadable: false,
  },
  {
    id: "exp-003",
    label: "Consent & audit events",
    item_count: 6,
    sample_items: ["Storage consent", "Match surfaced", "Export preview opened"],
    downloadable: false,
  },
];

const DEMO_CORRECTIONS: CorrectionRequestPreview[] = [
  {
    id: "corr-001",
    field: "Headline",
    current_value: "Senior product engineer · fintech · remote EU",
    suggested_correction: "Staff product engineer · fintech · remote EU",
    status: "preview_only",
    note: "Correction requests are preview-only on pilot — no backend write.",
  },
  {
    id: "corr-002",
    field: "Skills — primary stack",
    current_value: "TypeScript, React, PostgreSQL",
    suggested_correction: "TypeScript, React, FastAPI, PostgreSQL",
    status: "preview_only",
    note: "Human review required before any profile update goes live.",
  },
];

const DEMO_CONSENT: ConsentReviewItem[] = [
  {
    id: "cr-001",
    purpose: "Evaluate applications you submit",
    status: "active",
    last_reviewed_at: "2026-06-03T11:00:00Z",
    note: "Scoped to roles you apply to — human recruiter review.",
  },
  {
    id: "cr-002",
    purpose: "Surface ranked matches",
    status: "active",
    last_reviewed_at: "2026-06-05T09:00:00Z",
    note: "Pilot ranking signal — you choose whether to apply.",
  },
  {
    id: "cr-003",
    purpose: "Identity verification (KYC)",
    status: "review_required",
    last_reviewed_at: "2026-06-12T08:00:00Z",
    note: "Provider processing consent required — not live for all users.",
  },
];

const DEMO_COMM: CommunicationPrefControl[] = [
  {
    channel: "email",
    status: "review_required",
    editable: false,
    note: "Transactional email only when configured — no bulk outreach from TWIN.",
  },
  {
    channel: "in_app",
    status: "opt_in",
    editable: false,
    note: "In-app notifications for application status changes (pilot).",
  },
  {
    channel: "calendar_hold",
    status: "not_live",
    editable: false,
    note: "Interview holds require calendar OAuth — ICS fallback available.",
  },
  {
    channel: "recruiter_contact",
    status: "disabled",
    editable: false,
    note: "Recruiters cannot contact you outside your apply consent — human gate.",
  },
];

const DEMO_APP_MATCH: AppMatchTransparencyItem[] = [
  {
    id: "amt-001",
    kind: "application",
    role_id: CANDIDATE_CONTROL_CENTER_DEMO_ROLE_ID,
    role_title: "Senior Product Engineer",
    shared_fields: ["Name", "Application status", "Match score", "Role context"],
    withheld_fields: ["Phone", "Email address", "Full CV file"],
    human_review_required: true,
  },
  {
    id: "amt-002",
    kind: "match",
    role_id: CANDIDATE_CONTROL_CENTER_DEMO_ROLE_ID,
    role_title: "Senior Product Engineer",
    shared_fields: ["Role title", "Fit summary", "Why surfaced"],
    withheld_fields: ["Hidden profile fields", "Contact channels"],
    human_review_required: true,
  },
];

const DEMO_AUDIT: AuditTimelineEvent[] = [
  {
    id: "aud-001",
    type: "visibility_reviewed",
    at: "2026-06-10T09:00:00Z",
    summary: "Visibility controls reviewed for demo-candidate-001 — preview only.",
    backend_write: false,
  },
  {
    id: "aud-002",
    type: "export_preview_opened",
    at: "2026-06-12T14:00:00Z",
    summary: "Export preview opened — download not live on pilot.",
    backend_write: false,
  },
  {
    id: "aud-003",
    type: "correction_preview_saved",
    at: "2026-06-13T10:30:00Z",
    summary: "Correction request draft saved locally — not submitted to backend.",
    backend_write: false,
  },
  {
    id: "aud-004",
    type: "consent_reviewed",
    at: "2026-06-14T11:00:00Z",
    summary: "Consent review completed for storage and match purposes.",
    backend_write: false,
  },
  {
    id: "aud-005",
    type: "comm_pref_viewed",
    at: "2026-06-15T08:00:00Z",
    summary: "Communication preferences viewed — no channel changes applied.",
    backend_write: false,
  },
  {
    id: "aud-006",
    type: "revoke_planned",
    at: "2026-06-16T16:00:00Z",
    summary: "Revoke/delete actions marked planned — disabled on pilot.",
    backend_write: false,
  },
];

const DEMO_RECORD: CandidateControlCenterRecord = {
  id: CANDIDATE_CONTROL_CENTER_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_CONTROL_CENTER_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  control_label: "Pilot control center · demo-candidate-001",
  last_reviewed_at: "2026-06-16T16:00:00Z",
  visibility_controls: DEMO_VISIBILITY,
  export_preview_sections: DEMO_EXPORT,
  correction_requests: DEMO_CORRECTIONS,
  consent_review_items: DEMO_CONSENT,
  communication_preferences: DEMO_COMM,
  app_match_transparency: DEMO_APP_MATCH,
  revoke_disabled: true,
  delete_disabled: true,
  audit_timeline: DEMO_AUDIT,
  pilot_labelled: true,
};

export function getCandidateControlCenterDemo(): CandidateControlCenterRecord {
  return DEMO_RECORD;
}
