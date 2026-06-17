/** Deterministic pilot Team Collaboration — sample only, no real PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const TEAM_COLLABORATION_CANDIDATE_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const TEAM_COLLABORATION_ROLE_DEMO_ID = JOB_PIPELINE_DEMO_ID;

export type TeamActivityEventType =
  | "reviewed"
  | "feedback_requested"
  | "scorecard_drafted"
  | "consent_review"
  | "shortlist"
  | "task_created"
  | "digest"
  | "decision_pending";

export type TeamCollaborationStatus = "active" | "awaiting_feedback" | "decision_pending";

export type AssignmentRole =
  | "decision_owner"
  | "reviewer"
  | "consent"
  | "recruiter"
  | "hiring_manager"
  | "task_owner";

export type TeamActivityEvent = {
  type: TeamActivityEventType;
  at: string;
  actor: string;
  summary: string;
};

export type TeamAssignment = {
  role: AssignmentRole;
  owner_label: string;
  status: "assigned" | "pending" | "complete";
};

export type TeamFollowUpTask = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  due: string;
  owner_label: string;
  status: "open" | "in_progress" | "blocked";
  linked_surface: string;
};

export type TeamOpenQuestion = {
  id: string;
  question: string;
  missing_evidence: string;
  owner_label: string;
};

export type TeamChecklistItem = {
  id: string;
  label_key: string;
  status: "complete" | "pending" | "blocked";
  note?: string;
};

export type CandidateTeamCollaborationRecord = {
  id: string;
  display_name: string;
  role_id: string;
  role_title: string;
  pipeline_stage: string;
  collaboration_status: TeamCollaborationStatus;
  decision_owner: string;
  pilot_labelled: true;
  activity_events: TeamActivityEvent[];
  assignments: TeamAssignment[];
  follow_up_tasks: TeamFollowUpTask[];
  open_questions: TeamOpenQuestion[];
  decision_checklist: TeamChecklistItem[];
};

export type JobTeamCollaborationRecord = {
  role_id: string;
  title: string;
  department: string;
  collaboration_status: TeamCollaborationStatus;
  decision_owner: string;
  pilot_labelled: true;
  activity_events: TeamActivityEvent[];
  assignments: TeamAssignment[];
  follow_up_tasks: TeamFollowUpTask[];
  open_questions: TeamOpenQuestion[];
  decision_checklist: TeamChecklistItem[];
};

const DEMO_ACTIVITY: TeamActivityEvent[] = [
  {
    type: "reviewed",
    at: "2026-06-12T10:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Profile 360 reviewed — stack overlap noted for pilot role.",
  },
  {
    type: "feedback_requested",
    at: "2026-06-13T11:30:00Z",
    actor: "Recruiter (sample)",
    summary: "Hiring manager feedback requested — no outbound message sent.",
  },
  {
    type: "scorecard_drafted",
    at: "2026-06-13T15:00:00Z",
    actor: "Hiring manager (sample)",
    summary: "Nine-criteria scorecard drafted — requires human review.",
  },
  {
    type: "consent_review",
    at: "2026-06-14T09:00:00Z",
    actor: "Privacy reviewer (sample)",
    summary: "Consent context flagged for review — contact not live.",
  },
  {
    type: "shortlist",
    at: "2026-06-14T09:30:00Z",
    actor: "Recruiter (sample)",
    summary: "Moved to shortlist on demo-role-001 pipeline board.",
  },
  {
    type: "task_created",
    at: "2026-06-14T14:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Follow-up task created — schedule HM debrief (demo-only).",
  },
  {
    type: "digest",
    at: "2026-06-15T08:00:00Z",
    actor: "Talent Radar digest (sample)",
    summary: "Weekly digest included this candidate — audit context only.",
  },
  {
    type: "decision_pending",
    at: "2026-06-15T16:00:00Z",
    actor: "System (pilot)",
    summary: "Human decision required — shortlist hold pending evidence.",
  },
];

const DEMO_ASSIGNMENTS: TeamAssignment[] = [
  { role: "decision_owner", owner_label: "Hiring manager (sample)", status: "assigned" },
  { role: "reviewer", owner_label: "Tech interviewer (sample)", status: "pending" },
  { role: "consent", owner_label: "Privacy reviewer (sample)", status: "pending" },
  { role: "recruiter", owner_label: "Recruiter (sample)", status: "assigned" },
  { role: "hiring_manager", owner_label: "Hiring manager (sample)", status: "assigned" },
  { role: "task_owner", owner_label: "Recruiter (sample)", status: "assigned" },
];

const DEMO_TASKS: TeamFollowUpTask[] = [
  {
    id: "task-001",
    title: "Collect HM feedback on technical depth",
    priority: "high",
    due: "2026-06-18",
    owner_label: "Recruiter (sample)",
    status: "open",
    linked_surface: "collaboration/feedback",
  },
  {
    id: "task-002",
    title: "Complete consent review before contact",
    priority: "high",
    due: "2026-06-19",
    owner_label: "Privacy reviewer (sample)",
    status: "in_progress",
    linked_surface: "trust/consent",
  },
  {
    id: "task-003",
    title: "Finalize scorecard missing evidence fields",
    priority: "medium",
    due: "2026-06-20",
    owner_label: "Hiring manager (sample)",
    status: "open",
    linked_surface: "collaboration/scorecard",
  },
  {
    id: "task-004",
    title: "Schedule debrief with hiring team",
    priority: "medium",
    due: "2026-06-21",
    owner_label: "Recruiter (sample)",
    status: "blocked",
    linked_surface: "team/tasks",
  },
  {
    id: "task-005",
    title: "Prepare communication draft",
    priority: "high",
    due: "2026-06-17",
    owner_label: "Recruiter (sample)",
    status: "open",
    linked_surface: "communication/drafts",
  },
];

const DEMO_QUESTIONS: TeamOpenQuestion[] = [
  {
    id: "q-001",
    question: "Does delivery confidence evidence cover distributed systems?",
    missing_evidence: "Scorecard delivery criterion — no project references attached.",
    owner_label: "Hiring manager (sample)",
  },
  {
    id: "q-002",
    question: "Is consent scope sufficient for interview scheduling?",
    missing_evidence: "Trust layer — contact permission review pending.",
    owner_label: "Privacy reviewer (sample)",
  },
];

const DEMO_CHECKLIST: TeamChecklistItem[] = [
  { id: "chk-profile", label_key: "profile", status: "complete" },
  { id: "chk-consent", label_key: "consent", status: "pending", note: "Requires review" },
  { id: "chk-scorecard", label_key: "scorecard", status: "pending" },
  { id: "chk-feedback", label_key: "feedback", status: "pending" },
  { id: "chk-risks", label_key: "risks", status: "pending" },
  { id: "chk-communication", label_key: "communication", status: "blocked", note: "Not live" },
  { id: "chk-human", label_key: "human_decision", status: "pending" },
];

const CANDIDATE_DEMO: CandidateTeamCollaborationRecord = {
  id: TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
  display_name: "Alex K. (sample)",
  role_id: TEAM_COLLABORATION_ROLE_DEMO_ID,
  role_title: "Senior Product Engineer (pilot)",
  pipeline_stage: "shortlist",
  collaboration_status: "decision_pending",
  decision_owner: "Hiring manager (sample)",
  pilot_labelled: true,
  activity_events: DEMO_ACTIVITY,
  assignments: DEMO_ASSIGNMENTS,
  follow_up_tasks: DEMO_TASKS,
  open_questions: DEMO_QUESTIONS,
  decision_checklist: DEMO_CHECKLIST,
};

const JOB_DEMO: JobTeamCollaborationRecord = {
  role_id: TEAM_COLLABORATION_ROLE_DEMO_ID,
  title: "Senior Product Engineer (pilot)",
  department: "Engineering",
  collaboration_status: "awaiting_feedback",
  decision_owner: "Hiring manager (sample)",
  pilot_labelled: true,
  activity_events: DEMO_ACTIVITY,
  assignments: DEMO_ASSIGNMENTS,
  follow_up_tasks: DEMO_TASKS,
  open_questions: DEMO_QUESTIONS,
  decision_checklist: DEMO_CHECKLIST,
};

export function getCandidateTeamCollaborationDemo(): CandidateTeamCollaborationRecord {
  return CANDIDATE_DEMO;
}

export function getJobTeamCollaborationDemo(): JobTeamCollaborationRecord {
  return JOB_DEMO;
}
