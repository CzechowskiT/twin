/** Deterministic company hiring team cockpit — demo queue data only. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { ATS_IMPORT_READINESS_DEMO_CONNECTOR } from "@/lib/ats-import-readiness-demo-data";
import { getJobPipelineDemo, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const COMPANY_HIRING_COCKPIT_DEMO_ATS_ID = ATS_IMPORT_READINESS_DEMO_CONNECTOR;

export type CockpitQueueItem = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  role_id: string;
  summary: string;
  priority: "high" | "medium" | "low";
};

export type CockpitOpenRole = {
  id: string;
  role_id: string;
  title: string;
  status: "active" | "draft" | "paused";
  candidates_in_pipeline: number;
  summary: string;
};

export type CockpitTeamAssignment = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  assignee: string;
  role: string;
  summary: string;
};

export type CockpitPipelineStage = {
  stage: string;
  count: number;
};

export type CockpitChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  boundary?: string;
};

export type CompanyHiringCockpitRecord = {
  candidate_id: string;
  role_id: string;
  role_title: string;
  ats_connector_id: string;
  generated_at: string;
  pilot_labelled: true;
  open_roles: CockpitOpenRole[];
  candidate_shortlist: CockpitQueueItem[];
  pending_feedback: CockpitQueueItem[];
  scorecards_review: CockpitQueueItem[];
  trust_consent_warnings: CockpitQueueItem[];
  team_assignments: CockpitTeamAssignment[];
  communication_drafts: CockpitQueueItem[];
  pipeline_overview: CockpitPipelineStage[];
  decision_checklist: CockpitChecklistItem[];
};

function candidateDisplay(id: string): string {
  const row = getJobPipelineDemo().candidates.find((c) => c.id === id);
  return row?.display_name ?? id;
}

export function getCompanyHiringCockpitDemo(): CompanyHiringCockpitRecord {
  const role = getJobPipelineDemo();

  return {
    candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
    role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
    role_title: role.title,
    ats_connector_id: COMPANY_HIRING_COCKPIT_DEMO_ATS_ID,
    generated_at: "2026-06-17T08:00:00Z",
    pilot_labelled: true,
    open_roles: [
      {
        id: "role-001",
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        title: role.title,
        status: "active",
        candidates_in_pipeline: 8,
        summary: "Primary pilot role — shortlist and panel decisions in flight.",
      },
      {
        id: "role-002",
        role_id: "demo-role-002",
        title: "Staff Platform Engineer",
        status: "active",
        candidates_in_pipeline: 3,
        summary: "Secondary role — HM review queue, no external posting.",
      },
      {
        id: "role-003",
        role_id: "demo-role-003",
        title: "Engineering Manager",
        status: "draft",
        candidates_in_pipeline: 0,
        summary: "Draft role — quality checklist incomplete before activation.",
      },
    ],
    candidate_shortlist: [
      {
        id: "sl-001",
        candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Shortlist decision pending — Profile 360 connected, match score 88.",
        priority: "high",
      },
      {
        id: "sl-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Interview stage — panel feedback missing before next hold.",
        priority: "high",
      },
      {
        id: "sl-003",
        candidate_id: "demo-candidate-007",
        candidate_display: candidateDisplay("demo-candidate-007"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Offer draft prepared — human approval required before any contact.",
        priority: "medium",
      },
      {
        id: "sl-004",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Review stage stalled — notice period evidence needed.",
        priority: "medium",
      },
      {
        id: "sl-005",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Talent pool import row — consent review before pipeline move.",
        priority: "high",
      },
    ],
    pending_feedback: [
      {
        id: "fb-001",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Engineering panel feedback not recorded after interview hold.",
        priority: "high",
      },
      {
        id: "fb-002",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "HM feedback missing — review stage blocked for 3 days.",
        priority: "medium",
      },
      {
        id: "fb-003",
        candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Peer interview notes draft — awaiting HM sign-off.",
        priority: "medium",
      },
    ],
    scorecards_review: [
      {
        id: "sc-001",
        candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Seniority criterion missing evidence — scorecard draft open.",
        priority: "medium",
      },
      {
        id: "sc-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Panel scorecard not started — interview stage candidate.",
        priority: "high",
      },
    ],
    trust_consent_warnings: [
      {
        id: "con-001",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Consent pending review — talent pool import row blocked for outreach drafts.",
        priority: "high",
      },
      {
        id: "con-002",
        candidate_id: "demo-candidate-008",
        candidate_display: candidateDisplay("demo-candidate-008"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Consent check required — radar match held until trust review.",
        priority: "high",
      },
    ],
    team_assignments: [
      {
        id: "ta-001",
        candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID),
        assignee: "Alex (HM)",
        role: "Hiring manager",
        summary: "Shortlist decision owner — accept / decline / defer.",
      },
      {
        id: "ta-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        assignee: "Jordan (Panel)",
        role: "Interviewer",
        summary: "Scorecard and feedback due before stage progression.",
      },
      {
        id: "ta-003",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        assignee: "Sam (Recruiter)",
        role: "Recruiting partner",
        summary: "Notice period evidence collection — no auto outreach.",
      },
    ],
    communication_drafts: [
      {
        id: "draft-001",
        candidate_id: COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Intro status update draft — copy-only, human review before send.",
        priority: "medium",
      },
      {
        id: "draft-002",
        candidate_id: "demo-candidate-006",
        candidate_display: candidateDisplay("demo-candidate-006"),
        role_id: COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
        summary: "Nurture follow-up draft prepared — no outbound until approved.",
        priority: "low",
      },
    ],
    pipeline_overview: [
      { stage: "new", count: 2 },
      { stage: "review", count: 3 },
      { stage: "shortlist", count: 2 },
      { stage: "interview", count: 1 },
      { stage: "offer", count: 0 },
    ],
    decision_checklist: [
      {
        id: "chk-001",
        label: "Review shortlist for demo-candidate-001 on demo-role-001",
        done: false,
      },
      {
        id: "chk-002",
        label: "Confirm consent evidence before any communication draft send",
        done: false,
        boundary: "no_outreach",
      },
      {
        id: "chk-003",
        label: "Complete panel scorecard for interview-stage candidates",
        done: false,
      },
      {
        id: "chk-004",
        label: "ATS import mapping — preview only, no live sync",
        done: false,
        boundary: "no_ats_sync",
      },
      {
        id: "chk-005",
        label: "Public launch remains NO-GO — P0 performance OPEN",
        done: false,
        boundary: "launch_no_go",
      },
      {
        id: "chk-006",
        label: "Phase 3B controlled multitab — HARD BLOCKED",
        done: false,
        boundary: "phase3b_blocked",
      },
    ],
  };
}
