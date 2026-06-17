/** TWIN system-of-record domain kernel — strict types, no PII, deterministic IDs. */

import type { MarketingPersona } from "@/lib/marketing-persona";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

export type TwinPersona = MarketingPersona;

export type TwinModuleStatus = WorkspaceModuleStatus;

export type TwinBoundaryTag =
  | "pilot"
  | "draft_only"
  | "not_live"
  | "human_decision_required"
  | "no_outreach"
  | "no_ats_sync";

export type TwinFitLabel = "strong" | "good" | "possible" | "weak";

export type TwinPipelineStageId =
  | "new"
  | "review"
  | "shortlist"
  | "interview"
  | "offer"
  | "rejected"
  | "nurture";

export type TwinCandidate = {
  id: string;
  display_name: string;
  headline: string;
  fit_label: TwinFitLabel;
  match_score: number;
  trust_label: string;
  consent_verified: boolean;
  last_activity: string;
  profile_360_connected: boolean;
  pilot_labelled: true;
};

export type TwinRole = {
  id: string;
  title: string;
  department: string;
  location: string;
  priority: "high" | "medium" | "low";
  seniority: string;
  pipeline_health: "healthy" | "attention" | "stalled";
  candidate_count: number;
  pilot_labelled: true;
};

export type TwinApplication = {
  id: string;
  candidate_id: string;
  role_id: string;
  role_title: string;
  company: string;
  pipeline_stage: string;
  match_score: number;
  status_note: string;
};

export type TwinMatch = {
  id: string;
  candidate_id: string;
  role_id: string;
  role_title: string;
  company: string;
  match_score: number;
  why_matched: string[];
  missing_info: string[];
  recruiter_decision_required: true;
};

export type TwinPipelineStage = {
  id: TwinPipelineStageId;
  label: string;
  order: number;
};

export type TwinPipelineEntry = {
  candidate_id: string;
  role_id: string;
  stage: TwinPipelineStageId;
  rationale: string;
  profile_360_connected: boolean;
};

export type TwinNote = {
  id: string;
  candidate_id: string;
  role_id: string;
  author: string;
  at: string;
  category: "general" | "interview" | "reference" | "internal";
  visibility: "team" | "recruiter_only" | "hiring_manager";
  body: string;
};

export type TwinFeedback = {
  id: string;
  candidate_id: string;
  role_id: string;
  author_role: string;
  at: string;
  recommendation: "continue" | "hold" | "reject" | "needs_evidence";
  strengths: string[];
  concerns: string[];
  missing_evidence: string[];
};

export type TwinScorecardCriterion = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  evidence: string;
  missing_info: string;
};

export type TwinScorecard = {
  id: string;
  candidate_id: string;
  role_id: string;
  criteria: TwinScorecardCriterion[];
  updated_at: string;
};

export type TwinConsentRecord = {
  candidate_id: string;
  role_id: string;
  status: string;
  source: string;
  recorded_at: string;
  owner: string;
  requires_review: boolean;
  allowed_purposes: string[];
};

export type TwinContactHistoryEvent = {
  id: string;
  candidate_id: string;
  type:
    | "imported"
    | "consent_review"
    | "talent_radar"
    | "digest"
    | "note"
    | "feedback_requested";
  at: string;
  actor: string;
  summary: string;
  outbound_sent: false;
};

export type TwinTeamTask = {
  id: string;
  candidate_id: string;
  role_id: string;
  title: string;
  owner: string;
  due_at: string;
  status: "open" | "blocked" | "done";
};

export type TwinCommunicationDraft = {
  id: string;
  candidate_id: string;
  role_id: string;
  title: string;
  purpose: string;
  status: "draft" | "needs_review" | "blocked";
  created_at: string;
  outbound_sent: false;
};

export type TwinAtsImportRecord = {
  id: string;
  connector_name: string;
  sample_candidate_id: string;
  sample_role_id: string;
  mapping_ready: boolean;
  live_sync: false;
  pilot_labelled: true;
};

export type TwinDecisionMemoryEvent = {
  id: string;
  candidate_id: string;
  role_id: string;
  action: string;
  at: string;
  actor: string;
  note?: string;
  source_module: string;
};

export type TwinDecisionMemoryView = {
  candidate_id: string;
  role_id: string;
  display_name: string;
  role_title: string;
  events: readonly TwinDecisionMemoryEvent[];
  pilot_labelled: true;
};

export type TwinEvidenceItem = {
  id: string;
  candidate_id: string;
  label: string;
  href: string;
  kind: "portfolio" | "reference" | "certification";
  sample_only: true;
};

export type TwinSystemOfRecordLink = {
  id: string;
  persona: TwinPersona;
  module_family: string;
  href: string;
  title_key: string;
  status: TwinModuleStatus;
  boundary_tags: readonly TwinBoundaryTag[];
};

export type TwinSystemOfRecordContext = {
  candidate_id?: string;
  role_id?: string;
  import_id?: string;
};

export type TwinDomainSeed = {
  candidates: readonly TwinCandidate[];
  role: TwinRole;
  pipeline_entries: readonly TwinPipelineEntry[];
  applications: readonly TwinApplication[];
  matches: readonly TwinMatch[];
  notes: readonly TwinNote[];
  feedback: readonly TwinFeedback[];
  scorecards: readonly TwinScorecard[];
  consent_records: readonly TwinConsentRecord[];
  contact_history: readonly TwinContactHistoryEvent[];
  team_tasks: readonly TwinTeamTask[];
  communication_drafts: readonly TwinCommunicationDraft[];
  ats_import: TwinAtsImportRecord;
  decision_memory_events: readonly TwinDecisionMemoryEvent[];
  evidence_items: readonly TwinEvidenceItem[];
};
