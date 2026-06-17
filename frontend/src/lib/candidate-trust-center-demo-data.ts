/** Deterministic pilot Candidate Trust Center — sample only, no real PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_TRUST_CENTER_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_TRUST_CENTER_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type CandidateDataSourceKind =
  | "profile_cv"
  | "application_submitted"
  | "calendar_oauth"
  | "identity_kyc"
  | "referral"
  | "match_signal";

export type CandidateDataSource = {
  id: string;
  kind: CandidateDataSourceKind;
  label: string;
  detail: string;
  last_synced_at: string;
  sample_only: true;
};

export type VisibilityScope = {
  id: string;
  surface: "applications" | "offers" | "matches";
  shared_with_recruiters: string[];
  not_shared: string[];
  human_review_required: true;
};

export type ConsentDataUseItem = {
  id: string;
  purpose: string;
  status: "active" | "review_required" | "not_live";
  note: string;
};

export type CommunicationPreference = {
  channel: "email" | "in_app" | "calendar_hold" | "recruiter_contact";
  status: "opt_in" | "review_required" | "not_live" | "disabled";
  note: string;
};

export type TrustTimelineEventType =
  | "profile_updated"
  | "consent_recorded"
  | "application_submitted"
  | "match_surfaced"
  | "identity_check"
  | "export_requested";

export type TrustTimelineEvent = {
  id: string;
  type: TrustTimelineEventType;
  at: string;
  summary: string;
  outbound_sent: false;
};

export type CandidateTrustCenterRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  trust_label: string;
  last_reviewed_at: string;
  twin_knows_summary: string;
  twin_knows_items: string[];
  data_sources: CandidateDataSource[];
  visibility_scopes: VisibilityScope[];
  consent_items: ConsentDataUseItem[];
  communication_preferences: CommunicationPreference[];
  human_decision_note: string;
  controls_export_disabled: true;
  controls_delete_disabled: true;
  trust_timeline: TrustTimelineEvent[];
  pilot_labelled: true;
};

const DEMO_DATA_SOURCES: CandidateDataSource[] = [
  {
    id: "ds-001",
    kind: "profile_cv",
    label: "Profile & CV",
    detail: "Skills, experience, and CV text you submitted — workspace-scoped sample.",
    last_synced_at: "2026-06-10T09:00:00Z",
    sample_only: true,
  },
  {
    id: "ds-002",
    kind: "application_submitted",
    label: "Application for demo-role-001",
    detail: "Application review card for Senior Product Engineer — pilot scope only.",
    last_synced_at: "2026-06-11T14:30:00Z",
    sample_only: true,
  },
  {
    id: "ds-003",
    kind: "match_signal",
    label: "Match signals",
    detail: "Fit score and role alignment for demo-role-001 — not an automated decision.",
    last_synced_at: "2026-06-12T08:00:00Z",
    sample_only: true,
  },
  {
    id: "ds-004",
    kind: "identity_kyc",
    label: "Identity verification",
    detail: "KYC status placeholder — provider consent required before live checks.",
    last_synced_at: "2026-06-03T11:00:00Z",
    sample_only: true,
  },
];

const DEMO_VISIBILITY: VisibilityScope[] = [
  {
    id: "vis-001",
    surface: "applications",
    shared_with_recruiters: ["Name", "Application status", "Match score", "Role context"],
    not_shared: ["Phone", "Email address", "Full CV file", "Home address"],
    human_review_required: true,
  },
  {
    id: "vis-002",
    surface: "offers",
    shared_with_recruiters: ["Role title", "Company name", "Offer stage (pilot)"],
    not_shared: ["Salary expectations", "Personal notes", "Calendar details"],
    human_review_required: true,
  },
  {
    id: "vis-003",
    surface: "matches",
    shared_with_recruiters: ["Role title", "Fit summary", "Why surfaced"],
    not_shared: ["Hidden profile fields", "Contact channels", "Sensitive attributes"],
    human_review_required: true,
  },
];

const DEMO_CONSENT: ConsentDataUseItem[] = [
  {
    id: "cu-001",
    purpose: "Evaluate applications you submit",
    status: "active",
    note: "Scoped to roles you apply to — human recruiter review.",
  },
  {
    id: "cu-002",
    purpose: "Surface ranked matches",
    status: "active",
    note: "Pilot ranking signal — you choose whether to apply.",
  },
  {
    id: "cu-003",
    purpose: "Identity verification (KYC)",
    status: "review_required",
    note: "Provider processing consent required — not live for all users.",
  },
  {
    id: "cu-004",
    purpose: "Nightly auto-apply sweep",
    status: "not_live",
    note: "Prepare-only on production — paused until explicit opt-in.",
  },
];

const DEMO_COMM_PREFS: CommunicationPreference[] = [
  {
    channel: "email",
    status: "review_required",
    note: "Transactional email only when configured — no bulk outreach from TWIN.",
  },
  {
    channel: "in_app",
    status: "opt_in",
    note: "In-app notifications for application status changes (pilot).",
  },
  {
    channel: "calendar_hold",
    status: "not_live",
    note: "Interview holds require calendar OAuth — ICS fallback available.",
  },
  {
    channel: "recruiter_contact",
    status: "disabled",
    note: "Recruiters cannot contact you outside your apply consent — human gate.",
  },
];

const DEMO_TIMELINE: TrustTimelineEvent[] = [
  {
    id: "tl-001",
    type: "profile_updated",
    at: "2026-06-01T10:00:00Z",
    summary: "Profile summary refreshed — sample data for demo-candidate-001.",
    outbound_sent: false,
  },
  {
    id: "tl-002",
    type: "consent_recorded",
    at: "2026-06-03T11:00:00Z",
    summary: "Storage consent recorded for workspace — pilot signal only.",
    outbound_sent: false,
  },
  {
    id: "tl-003",
    type: "match_surfaced",
    at: "2026-06-05T09:00:00Z",
    summary: "demo-role-001 surfaced in matches — you review before applying.",
    outbound_sent: false,
  },
  {
    id: "tl-004",
    type: "application_submitted",
    at: "2026-06-11T14:30:00Z",
    summary: "Application submitted for demo-role-001 — recruiter sees review card.",
    outbound_sent: false,
  },
  {
    id: "tl-005",
    type: "identity_check",
    at: "2026-06-12T08:00:00Z",
    summary: "Identity verification placeholder — provider consent not completed.",
    outbound_sent: false,
  },
  {
    id: "tl-006",
    type: "export_requested",
    at: "2026-06-14T16:00:00Z",
    summary: "Data export preview requested — download not live on pilot.",
    outbound_sent: false,
  },
];

const DEMO_RECORD: CandidateTrustCenterRecord = {
  id: CANDIDATE_TRUST_CENTER_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_TRUST_CENTER_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  trust_label: "Pilot trust center · demo-candidate-001",
  last_reviewed_at: "2026-06-14T16:00:00Z",
  twin_knows_summary:
    "TWIN holds workspace-scoped profile, application, and match signals for roles you engage with — not a hidden dossier.",
  twin_knows_items: [
    "Profile headline, skills, and CV text you provided",
    "Applications you submitted (e.g. demo-role-001)",
    "Match fit summaries for surfaced roles",
    "Identity verification status (when consented)",
    "Calendar busy blocks (when OAuth connected)",
  ],
  data_sources: DEMO_DATA_SOURCES,
  visibility_scopes: DEMO_VISIBILITY,
  consent_items: DEMO_CONSENT,
  communication_preferences: DEMO_COMM_PREFS,
  human_decision_note:
    "Recruiters review your application card — TWIN does not auto-apply, auto-contact, or decide on your behalf.",
  controls_export_disabled: true,
  controls_delete_disabled: true,
  trust_timeline: DEMO_TIMELINE,
  pilot_labelled: true,
};

export function getCandidateTrustCenterDemo(): CandidateTrustCenterRecord {
  return DEMO_RECORD;
}
