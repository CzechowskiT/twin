/** Deterministic pilot collaboration — notes, feedback, scorecards, forms (sample only, no real PII). */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_COLLABORATION_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_COLLABORATION_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type CollaborationNoteCategory = "general" | "interview" | "reference" | "internal";
export type CollaborationNoteVisibility = "team" | "recruiter_only" | "hiring_manager";

export type CollaborationNote = {
  id: string;
  author: string;
  at: string;
  category: CollaborationNoteCategory;
  visibility: CollaborationNoteVisibility;
  body: string;
};

export type FeedbackRecommendation = "continue" | "hold" | "reject" | "needs_evidence";

export type HiringFeedback = {
  id: string;
  author_role: string;
  at: string;
  recommendation: FeedbackRecommendation;
  strengths: string[];
  concerns: string[];
  missing_evidence: string[];
};

export type ScorecardCriterionId =
  | "technical_fit"
  | "domain_fit"
  | "communication"
  | "seniority"
  | "motivation"
  | "culture_team_fit"
  | "delivery_confidence"
  | "risk_level"
  | "consent_trust_readiness";

export type ScorecardCriterion = {
  id: ScorecardCriterionId;
  rating: 1 | 2 | 3 | 4 | 5;
  evidence: string;
  missing_info: string;
};

export type FormPreviewId = "screening" | "interview_feedback" | "hiring_manager_review";

export type FormPreviewField = {
  label: string;
  field_type: "text" | "select" | "rating" | "textarea";
};

export type FormPreview = {
  id: FormPreviewId;
  fields: FormPreviewField[];
};

export type CollaborationAuditEvent = {
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export type CandidateCollaborationRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  pipeline_stage: string;
  trust_label: string;
  consent_verified: boolean;
  pilot_labelled: true;
  notes: CollaborationNote[];
  feedback: HiringFeedback[];
  scorecard: ScorecardCriterion[];
  forms: FormPreview[];
  audit_events: CollaborationAuditEvent[];
};

const DEMO_NOTES: CollaborationNote[] = [
  {
    id: "note-001",
    author: "Recruiter (sample)",
    at: "2026-06-10T09:15:00Z",
    category: "general",
    visibility: "team",
    body: "Strong product sense in async take-home review — align on system design depth in next round.",
  },
  {
    id: "note-002",
    author: "Hiring manager (sample)",
    at: "2026-06-11T14:30:00Z",
    category: "interview",
    visibility: "hiring_manager",
    body: "Panel liked clarity on trade-offs; wants evidence on cross-team delivery at scale.",
  },
  {
    id: "note-003",
    author: "Recruiter (sample)",
    at: "2026-06-12T11:00:00Z",
    category: "internal",
    visibility: "recruiter_only",
    body: "Consent verified for structured feedback share — no outreach until HM review completes.",
  },
];

const DEMO_FEEDBACK: HiringFeedback[] = [
  {
    id: "fb-001",
    author_role: "Engineering panel (sample)",
    at: "2026-06-11T16:00:00Z",
    recommendation: "continue",
    strengths: ["Clear communication", "Solid API design examples", "Asks good clarifying questions"],
    concerns: ["Limited live coding sample in pilot data"],
    missing_evidence: ["Pairing session on legacy codebase navigation"],
  },
  {
    id: "fb-002",
    author_role: "Hiring manager (sample)",
    at: "2026-06-12T10:30:00Z",
    recommendation: "needs_evidence",
    strengths: ["Domain curiosity", "Motivation aligned with product mission"],
    concerns: ["Seniority signal mixed on org-wide influence"],
    missing_evidence: ["Reference check on stakeholder management", "Portfolio deep-dive recording"],
  },
  {
    id: "fb-003",
    author_role: "Recruiter ops (sample)",
    at: "2026-06-12T15:00:00Z",
    recommendation: "hold",
    strengths: ["Consent trail complete", "Trust badge green on sample row"],
    concerns: ["Waiting on HM scorecard before shortlist commit"],
    missing_evidence: ["Hiring manager review form (planned)"],
  },
];

const DEMO_SCORECARD: ScorecardCriterion[] = [
  {
    id: "technical_fit",
    rating: 4,
    evidence: "Take-home showed clean service boundaries and test discipline.",
    missing_info: "Live system design on scaling event pipeline.",
  },
  {
    id: "domain_fit",
    rating: 4,
    evidence: "Prior B2B SaaS shipping cycles map to role scope.",
    missing_info: "Depth in regulated-data contexts (if required).",
  },
  {
    id: "communication",
    rating: 5,
    evidence: "Structured async updates; panel noted concise written answers.",
    missing_info: "Executive stakeholder presentation sample.",
  },
  {
    id: "seniority",
    rating: 3,
    evidence: "Led squad features; limited evidence on multi-team initiatives.",
    missing_info: "Examples of org-level technical decisions.",
  },
  {
    id: "motivation",
    rating: 5,
    evidence: "Articulated why role + company mission; asked thoughtful product questions.",
    missing_info: "None on pilot row.",
  },
  {
    id: "culture_team_fit",
    rating: 4,
    evidence: "Collaborative tone in panel; values async-first workflow.",
    missing_info: "On-site collaboration preference (if hybrid).",
  },
  {
    id: "delivery_confidence",
    rating: 4,
    evidence: "Shipped incremental releases with measurable outcomes in sample CV.",
    missing_info: "Incident response / on-call comfort level.",
  },
  {
    id: "risk_level",
    rating: 2,
    evidence: "Low consent risk; no red flags in sample checks.",
    missing_info: "Reference verification still pending (planned).",
  },
  {
    id: "consent_trust_readiness",
    rating: 5,
    evidence: "GDPR consent verified; allowed use covers structured feedback share.",
    missing_info: "None — pilot row marked ready.",
  },
];

const DEMO_FORMS: FormPreview[] = [
  {
    id: "screening",
    fields: [
      { label: "Must-have skills match", field_type: "rating" },
      { label: "Salary band alignment", field_type: "select" },
      { label: "Screening notes", field_type: "textarea" },
    ],
  },
  {
    id: "interview_feedback",
    fields: [
      { label: "Technical depth", field_type: "rating" },
      { label: "Communication clarity", field_type: "rating" },
      { label: "Recommendation", field_type: "select" },
      { label: "Evidence links", field_type: "text" },
    ],
  },
  {
    id: "hiring_manager_review",
    fields: [
      { label: "Team fit", field_type: "rating" },
      { label: "Seniority calibration", field_type: "select" },
      { label: "Decision rationale", field_type: "textarea" },
    ],
  },
];

const DEMO_AUDIT: CollaborationAuditEvent[] = [
  {
    at: "2026-06-10T09:20:00Z",
    actor: "Recruiter (sample)",
    action: "note_added",
    detail: "General team note on take-home review — demo only, no backend write.",
  },
  {
    at: "2026-06-11T16:05:00Z",
    actor: "Engineering panel (sample)",
    action: "feedback_submitted",
    detail: "Structured feedback card — continue recommendation (not a final hire decision).",
  },
  {
    at: "2026-06-12T10:35:00Z",
    actor: "Hiring manager (sample)",
    action: "scorecard_updated",
    detail: "Nine-criteria scorecard draft — needs evidence on seniority signal.",
  },
  {
    at: "2026-06-12T15:10:00Z",
    actor: "Recruiter ops (sample)",
    action: "review_paused",
    detail: "Hold pending HM form — no auto-outreach triggered.",
  },
];

const DEMO_RECORD: CandidateCollaborationRecord = {
  id: CANDIDATE_COLLABORATION_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · B2B SaaS",
  role_id: CANDIDATE_COLLABORATION_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  pipeline_stage: "Shortlist",
  trust_label: "Consent verified · sample",
  consent_verified: true,
  pilot_labelled: true,
  notes: DEMO_NOTES,
  feedback: DEMO_FEEDBACK,
  scorecard: DEMO_SCORECARD,
  forms: DEMO_FORMS,
  audit_events: DEMO_AUDIT,
};

export function getCandidateCollaborationDemo(): CandidateCollaborationRecord {
  return DEMO_RECORD;
}
