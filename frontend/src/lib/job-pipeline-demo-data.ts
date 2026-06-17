/** Deterministic pilot Job Pipeline — sample only, no real PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { TWIN_DEMO_ROLE_PRIMARY_ID } from "@/lib/system-of-record-domain/constants";

export const JOB_PIPELINE_DEMO_ID = TWIN_DEMO_ROLE_PRIMARY_ID;

export type JobPipelineStageId =
  | "new"
  | "review"
  | "shortlist"
  | "interview"
  | "offer"
  | "rejected"
  | "nurture";

export type JobPipelineHealth = "healthy" | "attention" | "stalled";

export type JobPipelineCandidateLink = {
  candidate_id: string;
  profile_360_connected: boolean;
};

export type JobPipelineCandidate = {
  id: string;
  display_name: string;
  fit_label: "strong" | "good" | "possible" | "weak";
  match_score: number;
  trust_label: string;
  consent_verified: boolean;
  last_activity: string;
  stage: JobPipelineStageId;
  rationale: string;
  profile_link: JobPipelineCandidateLink;
};

export type JobPipelineDecisionEvent = {
  action:
    | "matched"
    | "moved_to_review"
    | "shortlisted"
    | "interview_scheduled"
    | "offer_drafted"
    | "rejected"
    | "nurtured";
  at: string;
  actor: string;
  candidate_id: string;
  note?: string;
};

export type JobPipelineRecord = {
  id: string;
  title: string;
  department: string;
  location: string;
  priority: "high" | "medium" | "low";
  seniority: string;
  pipeline_health: JobPipelineHealth;
  candidate_count: number;
  pilot_labelled: true;
  candidates: JobPipelineCandidate[];
  decision_events: JobPipelineDecisionEvent[];
};

export const JOB_PIPELINE_STAGE_ORDER: readonly JobPipelineStageId[] = [
  "new",
  "review",
  "shortlist",
  "interview",
  "offer",
  "rejected",
  "nurture",
] as const;

const DEMO_CANDIDATES: JobPipelineCandidate[] = [
  {
    id: "demo-candidate-001",
    display_name: "Alex K. (sample)",
    fit_label: "strong",
    match_score: 88,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-14T09:30:00Z",
    stage: "shortlist",
    rationale: "Strong stack overlap — Python/FastAPI; recruiter shortlisted from Talent Radar.",
    profile_link: { candidate_id: CANDIDATE_PROFILE_360_DEMO_ID, profile_360_connected: true },
  },
  {
    id: "demo-candidate-002",
    display_name: "Jordan M. (sample)",
    fit_label: "good",
    match_score: 81,
    trust_label: "Consent pending review",
    consent_verified: false,
    last_activity: "2026-06-13T14:00:00Z",
    stage: "new",
    rationale: "New match from talent pool import — product-engineering bar overlap.",
    profile_link: { candidate_id: "demo-candidate-002", profile_360_connected: false },
  },
  {
    id: "demo-candidate-003",
    display_name: "Sam R. (sample)",
    fit_label: "good",
    match_score: 76,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-12T11:15:00Z",
    stage: "review",
    rationale: "Moved to review — missing notice period; fit on distributed systems.",
    profile_link: { candidate_id: "demo-candidate-003", profile_360_connected: false },
  },
  {
    id: "demo-candidate-004",
    display_name: "Taylor P. (sample)",
    fit_label: "possible",
    match_score: 72,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-11T16:45:00Z",
    stage: "interview",
    rationale: "Interview hold scheduled — panel feedback pending (pilot placeholder).",
    profile_link: { candidate_id: "demo-candidate-004", profile_360_connected: false },
  },
  {
    id: "demo-candidate-005",
    display_name: "Casey L. (sample)",
    fit_label: "weak",
    match_score: 58,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-10T08:20:00Z",
    stage: "rejected",
    rationale: "Dismissed — seniority bar mismatch; retained in talent memory.",
    profile_link: { candidate_id: "demo-candidate-005", profile_360_connected: false },
  },
  {
    id: "demo-candidate-006",
    display_name: "Riley N. (sample)",
    fit_label: "good",
    match_score: 79,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-09T10:00:00Z",
    stage: "nurture",
    rationale: "Snoozed to nurture — timing not right; resurface in 90 days.",
    profile_link: { candidate_id: "demo-candidate-006", profile_360_connected: false },
  },
  {
    id: "demo-candidate-007",
    display_name: "Morgan D. (sample)",
    fit_label: "strong",
    match_score: 85,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-08T13:30:00Z",
    stage: "offer",
    rationale: "Offer draft prepared — human approval required before send.",
    profile_link: { candidate_id: "demo-candidate-007", profile_360_connected: false },
  },
  {
    id: "demo-candidate-008",
    display_name: "Quinn H. (sample)",
    fit_label: "possible",
    match_score: 68,
    trust_label: "Consent check required",
    consent_verified: false,
    last_activity: "2026-06-07T09:00:00Z",
    stage: "new",
    rationale: "Fresh radar match — consent review before outreach.",
    profile_link: { candidate_id: "demo-candidate-008", profile_360_connected: false },
  },
];

const DEMO_DECISION_EVENTS: JobPipelineDecisionEvent[] = [
  {
    action: "matched",
    at: "2026-06-07T09:00:00Z",
    actor: "TWIN matching (pilot)",
    candidate_id: "demo-candidate-008",
    note: "Radar batch — no auto-outreach.",
  },
  {
    action: "moved_to_review",
    at: "2026-06-12T11:15:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-003",
  },
  {
    action: "shortlisted",
    at: "2026-06-14T09:30:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-001",
    note: "Linked to Profile 360 pilot row.",
  },
  {
    action: "interview_scheduled",
    at: "2026-06-11T16:45:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-004",
    note: "Calendar hold placeholder — not live sync.",
  },
  {
    action: "offer_drafted",
    at: "2026-06-08T13:30:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-007",
    note: "Draft only — no send on pilot.",
  },
  {
    action: "rejected",
    at: "2026-06-10T08:20:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-005",
  },
  {
    action: "nurtured",
    at: "2026-06-09T10:00:00Z",
    actor: "Recruiter (sample)",
    candidate_id: "demo-candidate-006",
    note: "Talent memory — 90-day snooze.",
  },
];

const DEMO_JOB_PIPELINE: JobPipelineRecord = {
  id: JOB_PIPELINE_DEMO_ID,
  title: "Senior Product Engineer",
  department: "Product Engineering",
  location: "EU / Remote",
  priority: "high",
  seniority: "Senior",
  pipeline_health: "healthy",
  candidate_count: DEMO_CANDIDATES.length,
  pilot_labelled: true,
  candidates: DEMO_CANDIDATES,
  decision_events: DEMO_DECISION_EVENTS,
};

export function getJobPipelineDemo(): JobPipelineRecord {
  return DEMO_JOB_PIPELINE;
}

export function candidatesForStage(
  record: JobPipelineRecord,
  stage: JobPipelineStageId,
): JobPipelineCandidate[] {
  return record.candidates.filter((c) => c.stage === stage);
}
