/** Deterministic company hiring command center — demo queue data only. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { ATS_IMPORT_READINESS_DEMO_CONNECTOR } from "@/lib/ats-import-readiness-demo-data";
import { getJobPipelineDemo, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const COMPANY_HIRING_COMMAND_CENTER_DEMO_ATS_ID = ATS_IMPORT_READINESS_DEMO_CONNECTOR;

export type CommandCenterQueueItem = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  role_id: string;
  summary: string;
  priority: "high" | "medium" | "low";
};

export type RoleReadinessRow = {
  id: string;
  role_id: string;
  title: string;
  readiness: "ready" | "blocked" | "draft";
  blockers: number;
  summary: string;
};

export type DecisionBlocker = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  blocker_key: string;
  owner: string;
};

export type HiringTeamTask = {
  id: string;
  assignee: string;
  task_key: string;
  candidate_display: string;
  due_date: string;
};

export type NextMeetingRow = {
  id: string;
  title_key: string;
  scheduled_at: string;
  readiness: "ready" | "blocked" | "pending";
  summary_key: string;
};

export type CompanyHiringCommandCenterRecord = {
  candidate_id: string;
  role_id: string;
  role_title: string;
  ats_connector_id: string;
  generated_at: string;
  pilot_labelled: true;
  role_readiness: RoleReadinessRow[];
  shortlist: CommandCenterQueueItem[];
  pending_feedback: CommandCenterQueueItem[];
  decision_blockers: DecisionBlocker[];
  trust_boundaries: CommandCenterQueueItem[];
  hiring_team_tasks: HiringTeamTask[];
  next_meetings: NextMeetingRow[];
};

function candidateDisplay(id: string): string {
  const row = getJobPipelineDemo().candidates.find((c) => c.id === id);
  return row?.display_name ?? id;
}

export function getCompanyHiringCommandCenterDemo(): CompanyHiringCommandCenterRecord {
  const role = getJobPipelineDemo();

  return {
    candidate_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
    role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
    role_title: role.title,
    ats_connector_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ATS_ID,
    generated_at: "2026-06-19T08:00:00Z",
    pilot_labelled: true,
    role_readiness: [
      {
        id: "rr-001",
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        title: role.title,
        readiness: "ready",
        blockers: 1,
        summary: "Primary pilot role — panel pack ready, one consent blocker on shortlist.",
      },
      {
        id: "rr-002",
        role_id: "demo-role-002",
        title: "Staff Platform Engineer",
        readiness: "blocked",
        blockers: 2,
        summary: "HM scorecard template incomplete — decision pack not ready.",
      },
      {
        id: "rr-003",
        role_id: "demo-role-003",
        title: "Engineering Manager",
        readiness: "draft",
        blockers: 0,
        summary: "Draft role — quality checklist incomplete before activation.",
      },
    ],
    shortlist: [
      {
        id: "sl-001",
        candidate_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Shortlist decision pending — Profile 360 connected, match score 88.",
        priority: "high",
      },
      {
        id: "sl-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Interview stage — panel feedback missing before next hold.",
        priority: "high",
      },
      {
        id: "sl-003",
        candidate_id: "demo-candidate-007",
        candidate_display: candidateDisplay("demo-candidate-007"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Offer draft prepared — human approval required before any contact.",
        priority: "medium",
      },
      {
        id: "sl-004",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Review stage stalled — notice period evidence needed.",
        priority: "medium",
      },
    ],
    pending_feedback: [
      {
        id: "fb-001",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Engineering panel feedback not recorded after interview hold.",
        priority: "high",
      },
      {
        id: "fb-002",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "HM feedback missing — review stage blocked for 3 days.",
        priority: "medium",
      },
      {
        id: "fb-003",
        candidate_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Peer interview notes draft — awaiting HM sign-off.",
        priority: "medium",
      },
    ],
    decision_blockers: [
      {
        id: "db-001",
        candidate_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID),
        blocker_key: "companyHiringCommandCenter.blockerConsent",
        owner: "Alex (HM)",
      },
      {
        id: "db-002",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        blocker_key: "companyHiringCommandCenter.blockerTrustReview",
        owner: "Sam (Recruiter)",
      },
      {
        id: "db-003",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        blocker_key: "companyHiringCommandCenter.blockerPanelFeedback",
        owner: "Jordan (Panel)",
      },
    ],
    trust_boundaries: [
      {
        id: "tb-001",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Consent pending review — talent pool import row blocked for outreach drafts.",
        priority: "high",
      },
      {
        id: "tb-002",
        candidate_id: "demo-candidate-008",
        candidate_display: candidateDisplay("demo-candidate-008"),
        role_id: COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
        summary: "Consent check required — radar match held until trust review.",
        priority: "high",
      },
    ],
    hiring_team_tasks: [
      {
        id: "ht-001",
        assignee: "Alex (HM)",
        task_key: "companyHiringCommandCenter.taskShortlistDecision",
        candidate_display: candidateDisplay(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID),
        due_date: "2026-06-20",
      },
      {
        id: "ht-002",
        assignee: "Jordan (Panel)",
        task_key: "companyHiringCommandCenter.taskScorecard",
        candidate_display: candidateDisplay("demo-candidate-004"),
        due_date: "2026-06-19",
      },
      {
        id: "ht-003",
        assignee: "Sam (Recruiter)",
        task_key: "companyHiringCommandCenter.taskEvidence",
        candidate_display: candidateDisplay("demo-candidate-003"),
        due_date: "2026-06-21",
      },
    ],
    next_meetings: [
      {
        id: "nm-001",
        title_key: "companyHiringCommandCenter.meetingPanelPack",
        scheduled_at: "2026-06-20T14:00:00Z",
        readiness: "blocked",
        summary_key: "companyHiringCommandCenter.meetingPanelBlocked",
      },
      {
        id: "nm-002",
        title_key: "companyHiringCommandCenter.meetingHmSync",
        scheduled_at: "2026-06-21T10:00:00Z",
        readiness: "ready",
        summary_key: "companyHiringCommandCenter.meetingHmReady",
      },
    ],
  };
}
