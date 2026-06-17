/** Unified deterministic demo seed — internally consistent across all SoR modules. */

import {
  TWIN_DEMO_ATS_IMPORT_ID,
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
} from "@/lib/system-of-record-domain/constants";
import type {
  TwinApplication,
  TwinCandidate,
  TwinCommunicationDraft,
  TwinConsentRecord,
  TwinContactHistoryEvent,
  TwinDecisionMemoryEvent,
  TwinDomainSeed,
  TwinEvidenceItem,
  TwinFeedback,
  TwinMatch,
  TwinNote,
  TwinPipelineEntry,
  TwinRole,
  TwinScorecard,
  TwinTeamTask,
  TwinAtsImportRecord,
} from "@/lib/system-of-record-domain/types";

const ROLE: TwinRole = {
  id: TWIN_DEMO_ROLE_PRIMARY_ID,
  title: "Senior Product Engineer",
  department: "Product Engineering",
  location: "EU / Remote",
  priority: "high",
  seniority: "Senior",
  pipeline_health: "healthy",
  candidate_count: 8,
  pilot_labelled: true,
};

const CANDIDATES: TwinCandidate[] = [
  {
    id: "demo-candidate-001",
    display_name: "Alex K. (sample)",
    headline: "Senior Backend Engineer · Python / FastAPI · pilot profile",
    fit_label: "strong",
    match_score: 88,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-14T09:30:00Z",
    profile_360_connected: true,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-002",
    display_name: "Jordan M. (sample)",
    headline: "Product engineer · B2B SaaS",
    fit_label: "good",
    match_score: 81,
    trust_label: "Consent pending review",
    consent_verified: false,
    last_activity: "2026-06-13T14:00:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-003",
    display_name: "Sam R. (sample)",
    headline: "Distributed systems engineer",
    fit_label: "good",
    match_score: 76,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-12T11:15:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-004",
    display_name: "Taylor P. (sample)",
    headline: "Full-stack engineer · interview stage",
    fit_label: "possible",
    match_score: 72,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-11T16:45:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-005",
    display_name: "Casey L. (sample)",
    headline: "Platform engineer · rejected sample",
    fit_label: "weak",
    match_score: 58,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-10T08:20:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-006",
    display_name: "Riley N. (sample)",
    headline: "Backend engineer · nurture pool",
    fit_label: "good",
    match_score: 79,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-09T10:00:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-007",
    display_name: "Morgan D. (sample)",
    headline: "Staff engineer · offer draft",
    fit_label: "strong",
    match_score: 85,
    trust_label: "Consent on file · workspace-scoped",
    consent_verified: true,
    last_activity: "2026-06-08T13:30:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
  {
    id: "demo-candidate-008",
    display_name: "Quinn H. (sample)",
    headline: "Engineer · consent review required",
    fit_label: "possible",
    match_score: 68,
    trust_label: "Consent check required",
    consent_verified: false,
    last_activity: "2026-06-07T09:00:00Z",
    profile_360_connected: false,
    pilot_labelled: true,
  },
];

const PIPELINE_ENTRIES: TwinPipelineEntry[] = [
  { candidate_id: "demo-candidate-001", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "shortlist", rationale: "Strong stack overlap — Python/FastAPI.", profile_360_connected: true },
  { candidate_id: "demo-candidate-002", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "new", rationale: "New match from talent pool import.", profile_360_connected: false },
  { candidate_id: "demo-candidate-003", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "review", rationale: "Moved to review — missing notice period.", profile_360_connected: false },
  { candidate_id: "demo-candidate-004", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "interview", rationale: "Interview hold scheduled — panel feedback pending.", profile_360_connected: false },
  { candidate_id: "demo-candidate-005", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "rejected", rationale: "Dismissed — seniority bar mismatch.", profile_360_connected: false },
  { candidate_id: "demo-candidate-006", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "nurture", rationale: "Snoozed to nurture — timing not right.", profile_360_connected: false },
  { candidate_id: "demo-candidate-007", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "offer", rationale: "Offer draft prepared — human approval required.", profile_360_connected: false },
  { candidate_id: "demo-candidate-008", role_id: TWIN_DEMO_ROLE_PRIMARY_ID, stage: "new", rationale: "Fresh radar match — consent review before outreach.", profile_360_connected: false },
];

const APPLICATIONS: TwinApplication[] = [
  {
    id: "app-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    role_title: "Senior Product Engineer",
    company: "SynthRail Logistics (pilot)",
    pipeline_stage: "Shortlist",
    match_score: 88,
    status_note: "No accept/decline recorded — recruiter decision pending.",
  },
];

const MATCHES: TwinMatch[] = [
  {
    id: "match-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    role_title: "Senior Product Engineer",
    company: "SynthRail Logistics (pilot)",
    match_score: 88,
    why_matched: ["Stack overlap: Python, FastAPI, PostgreSQL.", "Location fit: EU remote within preferences."],
    missing_info: ["Notice period", "Salary expectations"],
    recruiter_decision_required: true,
  },
];

const NOTES: TwinNote[] = [
  {
    id: "note-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    author: "Recruiter (sample)",
    at: "2026-06-10T09:20:00Z",
    category: "general",
    visibility: "team",
    body: "Take-home review scheduled — demo note only, no backend write.",
  },
];

const FEEDBACK: TwinFeedback[] = [
  {
    id: "fb-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    author_role: "Engineering panel (sample)",
    at: "2026-06-11T16:05:00Z",
    recommendation: "continue",
    strengths: ["Clear communication on system design trade-offs."],
    concerns: ["Limited evidence on staff-level scope."],
    missing_evidence: ["Production incident response examples"],
  },
];

const SCORECARDS: TwinScorecard[] = [
  {
    id: "sc-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    updated_at: "2026-06-12T10:35:00Z",
    criteria: [
      { id: "technical_fit", rating: 4, evidence: "Strong Python/FastAPI overlap.", missing_info: "" },
      { id: "domain_fit", rating: 4, evidence: "B2B SaaS product engineering.", missing_info: "" },
      { id: "communication", rating: 5, evidence: "Clear async written updates.", missing_info: "" },
      { id: "seniority", rating: 3, evidence: "Mid-senior signals.", missing_info: "Staff-level scope confirmation" },
      { id: "motivation", rating: 4, evidence: "Interest in logistics domain.", missing_info: "" },
      { id: "culture_team_fit", rating: 4, evidence: "Collaborative panel feedback.", missing_info: "" },
      { id: "delivery_confidence", rating: 4, evidence: "Shipped async pipelines.", missing_info: "" },
      { id: "risk_level", rating: 2, evidence: "Low compliance risk on pilot.", missing_info: "" },
      { id: "consent_trust_readiness", rating: 5, evidence: "Consent on file.", missing_info: "" },
    ],
  },
];

const CONSENT_RECORDS: TwinConsentRecord[] = [
  {
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    status: "Active — workspace import with recruiter attestation",
    source: "Talent Pool CSV import (pilot)",
    recorded_at: "2026-06-01T10:00:00Z",
    owner: "Recruiter (sample)",
    requires_review: false,
    allowed_purposes: [
      "Internal recruiter review within company workspace",
      "Ranked matching and Talent Radar resurfacing",
      "Manual outreach draft preparation (copy-only)",
    ],
  },
];

const CONTACT_HISTORY: TwinContactHistoryEvent[] = [
  {
    id: "ch-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    type: "imported",
    at: "2026-06-01T10:00:00Z",
    actor: "Talent pool import (sample)",
    summary: "Profile imported — no outbound contact.",
    outbound_sent: false,
  },
  {
    id: "ch-002",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    type: "consent_review",
    at: "2026-06-03T14:20:00Z",
    actor: "Recruiter (sample)",
    summary: "Consent evidence flagged for privacy review.",
    outbound_sent: false,
  },
];

const TEAM_TASKS: TwinTeamTask[] = [
  {
    id: "task-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    title: "Confirm notice period with candidate",
    owner: "Recruiter (sample)",
    due_at: "2026-06-18T12:00:00Z",
    status: "open",
  },
  {
    id: "task-002",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    title: "HM scorecard review",
    owner: "Hiring manager (sample)",
    due_at: "2026-06-19T09:00:00Z",
    status: "blocked",
  },
];

const COMMUNICATION_DRAFTS: TwinCommunicationDraft[] = [
  {
    id: "draft-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    title: "Intro status update (draft)",
    purpose: "intro_status",
    status: "draft",
    created_at: "2026-06-14T09:15:00Z",
    outbound_sent: false,
  },
];

const ATS_IMPORT: TwinAtsImportRecord = {
  id: TWIN_DEMO_ATS_IMPORT_ID,
  connector_name: "Lever mapping pilot",
  sample_candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  sample_role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
  mapping_ready: true,
  live_sync: false,
  pilot_labelled: true,
};

const DECISION_MEMORY_EVENTS: TwinDecisionMemoryEvent[] = [
  {
    id: "dm-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    action: "shortlisted",
    at: "2026-06-14T09:30:00Z",
    actor: "Recruiter (sample)",
    note: "Linked to Profile 360 pilot row.",
    source_module: "job_pipeline",
  },
  {
    id: "dm-002",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    action: "draft_prepared",
    at: "2026-06-14T09:15:00Z",
    actor: "Recruiter (sample)",
    note: "Outreach draft prepared — not sent.",
    source_module: "safe_communication",
  },
  {
    id: "dm-003",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
    action: "feedback_submitted",
    at: "2026-06-11T16:05:00Z",
    actor: "Engineering panel (sample)",
    source_module: "candidate_collaboration",
  },
];

const EVIDENCE_ITEMS: TwinEvidenceItem[] = [
  {
    id: "ev-001",
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    label: "Portfolio case study (sample reference)",
    href: "https://example.com/pilot/sample-portfolio-demo-candidate-001",
    kind: "portfolio",
    sample_only: true,
  },
];

const TWIN_DOMAIN_SEED: TwinDomainSeed = {
  candidates: CANDIDATES,
  role: ROLE,
  pipeline_entries: PIPELINE_ENTRIES,
  applications: APPLICATIONS,
  matches: MATCHES,
  notes: NOTES,
  feedback: FEEDBACK,
  scorecards: SCORECARDS,
  consent_records: CONSENT_RECORDS,
  contact_history: CONTACT_HISTORY,
  team_tasks: TEAM_TASKS,
  communication_drafts: COMMUNICATION_DRAFTS,
  ats_import: ATS_IMPORT,
  decision_memory_events: DECISION_MEMORY_EVENTS,
  evidence_items: EVIDENCE_ITEMS,
};

export function getTwinDomainSeed(): TwinDomainSeed {
  return TWIN_DOMAIN_SEED;
}

export function findTwinCandidateInSeed(candidateId: string): TwinCandidate | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  return TWIN_DOMAIN_SEED.candidates.find((c) => c.id === trimmed) ?? null;
}

export function findTwinPipelineEntry(
  candidateId: string,
  roleId: string,
): TwinPipelineEntry | null {
  const c = candidateId.trim();
  const r = roleId.trim();
  if (!c || !r) return null;
  return (
    TWIN_DOMAIN_SEED.pipeline_entries.find(
      (e) => e.candidate_id === c && e.role_id === r,
    ) ?? null
  );
}
