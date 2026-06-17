/** Deterministic recruiter daily operating cockpit — demo queue data only. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { ATS_IMPORT_READINESS_DEMO_CONNECTOR } from "@/lib/ats-import-readiness-demo-data";
import { getJobPipelineDemo, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID = ATS_IMPORT_READINESS_DEMO_CONNECTOR;

export type CockpitQueueItem = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  role_id: string;
  summary: string;
  priority: "high" | "medium" | "low";
};

export type CockpitPipelineChange = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  from_stage: string;
  to_stage: string;
  changed_at: string;
  rationale: string;
};

export type CockpitAtsQueueItem = {
  id: string;
  connector: string;
  candidate_id: string;
  role_id: string;
  issue: string;
  status: "review" | "mapping";
};

export type CockpitChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  boundary?: string;
};

export type RecruiterDailyCockpitRecord = {
  candidate_id: string;
  role_id: string;
  role_title: string;
  ats_connector_id: string;
  generated_at: string;
  pilot_labelled: true;
  priority_worklist: CockpitQueueItem[];
  open_decisions: CockpitQueueItem[];
  consent_review: CockpitQueueItem[];
  feedback_missing: CockpitQueueItem[];
  scorecards_pending: CockpitQueueItem[];
  comm_drafts_review: CockpitQueueItem[];
  pipeline_stage_changes: CockpitPipelineChange[];
  ats_import_queue: CockpitAtsQueueItem[];
  weekly_digest_candidates: CockpitQueueItem[];
  daily_checklist: CockpitChecklistItem[];
};

function candidateDisplay(id: string): string {
  const row = getJobPipelineDemo().candidates.find((c) => c.id === id);
  return row?.display_name ?? id;
}

export function getRecruiterDailyCockpitDemo(): RecruiterDailyCockpitRecord {
  const role = getJobPipelineDemo();

  return {
    candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
    role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
    role_title: role.title,
    ats_connector_id: RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
    generated_at: "2026-06-17T08:00:00Z",
    pilot_labelled: true,
    priority_worklist: [
      {
        id: "pri-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Shortlist decision pending — Profile 360 connected, match score 88.",
        priority: "high",
      },
      {
        id: "pri-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Interview stage — panel feedback missing before next hold.",
        priority: "high",
      },
      {
        id: "pri-003",
        candidate_id: "demo-candidate-007",
        candidate_display: candidateDisplay("demo-candidate-007"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Offer draft prepared — human approval required before any contact.",
        priority: "medium",
      },
      {
        id: "pri-004",
        candidate_id: "demo-candidate-006",
        candidate_display: candidateDisplay("demo-candidate-006"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Nurture row resurfaced — timing signal only, no auto outreach.",
        priority: "medium",
      },
      {
        id: "pri-005",
        candidate_id: "demo-candidate-008",
        candidate_display: candidateDisplay("demo-candidate-008"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Talent Radar digest match — shortlist review without follow-up draft.",
        priority: "high",
      },
      {
        id: "pri-006",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Review stage stalled — notice period evidence needed.",
        priority: "medium",
      },
      {
        id: "pri-007",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Talent pool import row — consent review before pipeline move.",
        priority: "high",
      },
    ],
    open_decisions: [
      {
        id: "dec-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Accept / decline / shortlist — inbox row awaiting recruiter action.",
        priority: "high",
      },
      {
        id: "dec-002",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Review stage — notice period evidence needed before shortlist.",
        priority: "medium",
      },
    ],
    consent_review: [
      {
        id: "con-001",
        candidate_id: "demo-candidate-002",
        candidate_display: candidateDisplay("demo-candidate-002"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Consent pending review — talent pool import row blocked for outreach drafts.",
        priority: "high",
      },
      {
        id: "con-002",
        candidate_id: "demo-candidate-008",
        candidate_display: candidateDisplay("demo-candidate-008"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Consent check required — radar match held until trust review.",
        priority: "high",
      },
    ],
    feedback_missing: [
      {
        id: "fb-001",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Engineering panel feedback not recorded after interview hold.",
        priority: "high",
      },
      {
        id: "fb-002",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "HM feedback missing — review stage blocked for 3 days.",
        priority: "medium",
      },
    ],
    scorecards_pending: [
      {
        id: "sc-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Seniority criterion missing evidence — scorecard draft open.",
        priority: "medium",
      },
      {
        id: "sc-002",
        candidate_id: "demo-candidate-004",
        candidate_display: candidateDisplay("demo-candidate-004"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Panel scorecard not started — interview stage candidate.",
        priority: "high",
      },
    ],
    comm_drafts_review: [
      {
        id: "draft-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Intro status update draft — copy-only, human review before send.",
        priority: "medium",
      },
      {
        id: "draft-002",
        candidate_id: "demo-candidate-006",
        candidate_display: candidateDisplay("demo-candidate-006"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Nurture follow-up draft prepared — no outbound until approved.",
        priority: "low",
      },
    ],
    pipeline_stage_changes: [
      {
        id: "psc-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        from_stage: "review",
        to_stage: "shortlist",
        changed_at: "2026-06-14T09:30:00Z",
        rationale: "Strong stack overlap — moved on demo-role-001 board.",
      },
      {
        id: "psc-002",
        candidate_id: "demo-candidate-003",
        candidate_display: candidateDisplay("demo-candidate-003"),
        from_stage: "new",
        to_stage: "review",
        changed_at: "2026-06-13T11:00:00Z",
        rationale: "Missing notice period flagged — human review required.",
      },
    ],
    ats_import_queue: [
      {
        id: "ats-001",
        connector: RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        issue: "Field mapping draft ready — human attestation before import commit.",
        status: "mapping",
      },
      {
        id: "ats-002",
        connector: RECRUITER_DAILY_COCKPIT_DEMO_ATS_ID,
        candidate_id: "demo-candidate-002",
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        issue: "Potential duplicate row — review against demo-role-001 pipeline.",
        status: "review",
      },
    ],
    weekly_digest_candidates: [
      {
        id: "dig-001",
        candidate_id: RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID,
        candidate_display: candidateDisplay(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Returning from Talent Radar digest — shortlist without follow-up.",
        priority: "high",
      },
      {
        id: "dig-002",
        candidate_id: "demo-candidate-006",
        candidate_display: candidateDisplay("demo-candidate-006"),
        role_id: RECRUITER_DAILY_COCKPIT_DEMO_ROLE_ID,
        summary: "Snoozed nurture row resurfaced — timing signal only, no auto outreach.",
        priority: "medium",
      },
    ],
    daily_checklist: [
      {
        id: "chk-001",
        label: "Review inbox accept/decline for demo-candidate-001 on demo-role-001",
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
