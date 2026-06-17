/** Deterministic pilot decision memory / audit trail — sample only, no real PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const DECISION_MEMORY_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const DECISION_MEMORY_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type DecisionMemoryState =
  | "new"
  | "under_review"
  | "shortlisted"
  | "hold"
  | "rejected"
  | "nurture"
  | "offer_pending"
  | "decision_pending";

export type DecisionTimelineEventType =
  | "import"
  | "ats_mapping"
  | "consent"
  | "match"
  | "talent_radar"
  | "profile_viewed"
  | "scorecard_drafted"
  | "hm_feedback"
  | "shortlisted"
  | "comm_draft"
  | "decision_pending";

export type DecisionTimelineEvent = {
  id: string;
  type: DecisionTimelineEventType;
  at: string;
  actor: string;
  source_module: string;
  evidence_href: string;
  audit_note: string;
  final_decision: false;
};

export type EvidenceBundleStatus = "reviewed" | "pending" | "requires_review" | "blocked";

export type EvidenceBundleItem = {
  id: string;
  category: string;
  status: EvidenceBundleStatus;
  source_href: string;
  summary: string;
  missing_evidence: string[];
};

export type DecisionBlocker = {
  id: string;
  label: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

export type NextActionItem = {
  id: string;
  label: string;
  completed: boolean;
  not_live: boolean;
};

export type DecisionMemoryRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  pipeline_stage: string;
  decision_status: string;
  decision_state: DecisionMemoryState;
  decision_state_label: string;
  owner: string;
  last_event_at: string;
  last_event_summary: string;
  timeline: DecisionTimelineEvent[];
  evidence_bundle: EvidenceBundleItem[];
  blockers: DecisionBlocker[];
  next_actions: NextActionItem[];
  pilot_labelled: true;
};

const DEMO_TIMELINE: DecisionTimelineEvent[] = [
  {
    id: "dm-001",
    type: "import",
    at: "2026-06-01T10:00:00Z",
    actor: "Talent pool import (sample)",
    source_module: "ATS import readiness",
    evidence_href: "/recruiter/integrations/ats-import-readiness",
    audit_note: "Profile imported into workspace-scoped talent pool — no outbound contact.",
    final_decision: false,
  },
  {
    id: "dm-002",
    type: "ats_mapping",
    at: "2026-06-01T11:30:00Z",
    actor: "ATS mapping (sample)",
    source_module: "ATS import readiness",
    evidence_href: "/recruiter/integrations/ats-import-readiness",
    audit_note: "Field mapping draft prepared — no ATS writeback, human review required.",
    final_decision: false,
  },
  {
    id: "dm-003",
    type: "consent",
    at: "2026-06-03T14:20:00Z",
    actor: "Privacy review queue (sample)",
    source_module: "Trust & consent",
    evidence_href: "/recruiter/candidates/demo-candidate-001/trust",
    audit_note: "Consent evidence flagged for review — human decision required before contact.",
    final_decision: false,
  },
  {
    id: "dm-004",
    type: "match",
    at: "2026-06-05T09:00:00Z",
    actor: "Matching engine (sample)",
    source_module: "Profile 360",
    evidence_href: "/recruiter/candidates/demo-candidate-001",
    audit_note: "AI-assisted match signal for demo-role-001 — not a hiring decision.",
    final_decision: false,
  },
  {
    id: "dm-005",
    type: "talent_radar",
    at: "2026-06-06T08:15:00Z",
    actor: "Talent Radar (sample)",
    source_module: "Talent Radar",
    evidence_href: "/recruiter/talent-radar",
    audit_note: "Resurfaced on internal radar — pilot signal only.",
    final_decision: false,
  },
  {
    id: "dm-006",
    type: "profile_viewed",
    at: "2026-06-08T16:45:00Z",
    actor: "Recruiter (sample)",
    source_module: "Profile 360",
    evidence_href: "/recruiter/candidates/demo-candidate-001",
    audit_note: "Profile 360 opened for review — no outbound contact.",
    final_decision: false,
  },
  {
    id: "dm-007",
    type: "scorecard_drafted",
    at: "2026-06-10T11:00:00Z",
    actor: "Recruiter (sample)",
    source_module: "Notes & feedback",
    evidence_href: "/recruiter/candidates/demo-candidate-001/scorecard",
    audit_note: "Scorecard draft saved — requires human review before sharing.",
    final_decision: false,
  },
  {
    id: "dm-008",
    type: "hm_feedback",
    at: "2026-06-12T13:30:00Z",
    actor: "Hiring manager (sample)",
    source_module: "Team collaboration",
    evidence_href: "/recruiter/candidates/demo-candidate-001/team",
    audit_note: "HM feedback recorded — positive signal, decision still pending.",
    final_decision: false,
  },
  {
    id: "dm-009",
    type: "shortlisted",
    at: "2026-06-13T10:00:00Z",
    actor: "Recruiter (sample)",
    source_module: "Job pipeline",
    evidence_href: "/recruiter/jobs/demo-role-001/pipeline",
    audit_note: "Shortlisted in pipeline — human decision pending, not a final hire.",
    final_decision: false,
  },
  {
    id: "dm-010",
    type: "comm_draft",
    at: "2026-06-14T09:30:00Z",
    actor: "Recruiter (sample)",
    source_module: "Safe communication",
    evidence_href: "/recruiter/candidates/demo-candidate-001/communication",
    audit_note: "Communication draft prepared — no outbound contact, requires review.",
    final_decision: false,
  },
  {
    id: "dm-011",
    type: "decision_pending",
    at: "2026-06-15T08:00:00Z",
    actor: "Audit cockpit (sample)",
    source_module: "Decision memory",
    evidence_href: "/recruiter/candidates/demo-candidate-001/decision-memory",
    audit_note: "Shortlisted — human decision pending. No final hiring decision recorded.",
    final_decision: false,
  },
];

const DEMO_EVIDENCE: EvidenceBundleItem[] = [
  {
    id: "ev-001",
    category: "Profile & CV",
    status: "reviewed",
    source_href: "/recruiter/candidates/demo-candidate-001",
    summary: "Profile 360 summary reviewed — imported CV on file (sample).",
    missing_evidence: [],
  },
  {
    id: "ev-002",
    category: "Consent & trust",
    status: "requires_review",
    source_href: "/recruiter/candidates/demo-candidate-001/trust",
    summary: "Consent evidence flagged — privacy review required before contact.",
    missing_evidence: ["Signed consent artifact (sample placeholder)"],
  },
  {
    id: "ev-003",
    category: "Scorecard & feedback",
    status: "reviewed",
    source_href: "/recruiter/candidates/demo-candidate-001/scorecard",
    summary: "Recruiter scorecard draft and HM feedback on file.",
    missing_evidence: [],
  },
  {
    id: "ev-004",
    category: "ATS mapping",
    status: "pending",
    source_href: "/recruiter/integrations/ats-import-readiness",
    summary: "Field mapping draft — no ATS writeback in pilot.",
    missing_evidence: ["Employer attestation (not live)"],
  },
  {
    id: "ev-005",
    category: "Communication draft",
    status: "requires_review",
    source_href: "/recruiter/candidates/demo-candidate-001/communication",
    summary: "Outreach draft prepared — draft only, not dispatched.",
    missing_evidence: ["Human approval before any send"],
  },
  {
    id: "ev-006",
    category: "Team review",
    status: "reviewed",
    source_href: "/recruiter/candidates/demo-candidate-001/team",
    summary: "Team collaboration notes and task assignments recorded.",
    missing_evidence: [],
  },
];

const DEMO_BLOCKERS: DecisionBlocker[] = [
  {
    id: "bl-001",
    label: "Consent review pending",
    detail: "Privacy review required before any outbound contact — human decision required.",
    severity: "high",
  },
  {
    id: "bl-002",
    label: "Notice period unconfirmed",
    detail: "Availability not verified — confirm before scheduling (calendar not live).",
    severity: "medium",
  },
  {
    id: "bl-003",
    label: "Compensation band missing",
    detail: "Salary expectations not on imported row — recruiter should verify.",
    severity: "low",
  },
];

const DEMO_NEXT_ACTIONS: NextActionItem[] = [
  {
    id: "na-001",
    label: "Complete consent & trust review",
    completed: false,
    not_live: false,
  },
  {
    id: "na-002",
    label: "Confirm HM shortlist decision",
    completed: false,
    not_live: false,
  },
  {
    id: "na-003",
    label: "Review communication draft (no send)",
    completed: false,
    not_live: false,
  },
  {
    id: "na-004",
    label: "Schedule interview slot (calendar not live)",
    completed: false,
    not_live: true,
  },
  {
    id: "na-005",
    label: "Record final accept / decline decision",
    completed: false,
    not_live: false,
  },
];

const DEMO_RECORD: DecisionMemoryRecord = {
  id: DECISION_MEMORY_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior Backend Engineer · Python / FastAPI · pilot profile",
  role_id: DECISION_MEMORY_DEMO_ROLE_ID,
  role_title: "Senior Backend Engineer — SynthRail Logistics",
  pipeline_stage: "Shortlisted — human decision pending",
  decision_status: "Shortlisted — human decision pending",
  decision_state: "shortlisted",
  decision_state_label: "Shortlisted — human decision pending",
  owner: "Recruiter (sample)",
  last_event_at: "2026-06-15T08:00:00Z",
  last_event_summary: "Decision pending — no final hiring decision recorded.",
  timeline: DEMO_TIMELINE,
  evidence_bundle: DEMO_EVIDENCE,
  blockers: DEMO_BLOCKERS,
  next_actions: DEMO_NEXT_ACTIONS,
  pilot_labelled: true,
};

export function getDecisionMemoryDemo(): DecisionMemoryRecord {
  return DEMO_RECORD;
}
