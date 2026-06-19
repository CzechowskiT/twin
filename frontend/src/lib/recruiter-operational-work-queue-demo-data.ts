/** Deterministic recruiter operational work queue — demo read-only aggregation. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { getJobPipelineDemo, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type WorkQueueItem = {
  id: string;
  candidate_id: string;
  candidate_display: string;
  role_id: string;
  role_title: string;
  status: string;
  owner: string;
  due_date: string;
  priority: "high" | "medium" | "low";
  next_action_key: string;
  risk_boundary_key: string;
  candidate_href: string;
};

export type RecruiterOperationalWorkQueueRecord = {
  id: string;
  pilot_labelled: true;
  headline: string;
  summary_active: number;
  summary_trust_review: number;
  summary_missing_feedback: number;
  summary_stale: number;
  active_worklist: WorkQueueItem[];
  trust_review: WorkQueueItem[];
  missing_feedback: WorkQueueItem[];
  stale_applications: WorkQueueItem[];
  next_best_actions: { id: string; action_key: string; candidate_display: string }[];
  owner_due_map: { owner: string; due_date: string; count: number }[];
};

export function getRecruiterOperationalWorkQueueDemo(): RecruiterOperationalWorkQueueRecord {
  const pipeline = getJobPipelineDemo();
  const candidate = pipeline.candidates[0];

  const baseItem = (overrides: Partial<WorkQueueItem> & { id: string }): WorkQueueItem => ({
    candidate_id: RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID,
    candidate_display: candidate?.display_name ?? "Demo Candidate 001",
    role_id: RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_ROLE_ID,
    role_title: pipeline.title,
    status: "screening",
    owner: "Recruiter Pilot",
    due_date: "2026-06-20",
    priority: "medium",
    next_action_key: "recruiterOperationalWorkQueue.actionReviewProfile",
    risk_boundary_key: "recruiterOperationalWorkQueue.boundaryHumanReview",
    candidate_href: `/recruiter/candidates/${RECRUITER_OPERATIONAL_WORK_QUEUE_DEMO_CANDIDATE_ID}/profile-360`,
    ...overrides,
  });

  const active_worklist = [
    baseItem({ id: "owq-active-1", priority: "high", status: "interview", owner: "Recruiter Pilot" }),
    baseItem({ id: "owq-active-2", priority: "medium", status: "screening", owner: "Sourcer Demo" }),
  ];
  const trust_review = [
    baseItem({
      id: "owq-trust-1",
      priority: "high",
      next_action_key: "recruiterOperationalWorkQueue.actionTrustReview",
      risk_boundary_key: "recruiterOperationalWorkQueue.boundaryNoRevoke",
    }),
  ];
  const missing_feedback = [
    baseItem({
      id: "owq-fb-1",
      priority: "medium",
      next_action_key: "recruiterOperationalWorkQueue.actionRequestFeedback",
      owner: "HM Demo",
    }),
  ];
  const stale_applications = [
    baseItem({
      id: "owq-stale-1",
      priority: "low",
      status: "applied",
      due_date: "2026-06-10",
      next_action_key: "recruiterOperationalWorkQueue.actionFollowUp",
    }),
  ];

  return {
    id: "recruiter-operational-work-queue-demo",
    pilot_labelled: true,
    headline: "Read-only operational queue — demo aggregation, all actions disabled.",
    summary_active: active_worklist.length,
    summary_trust_review: trust_review.length,
    summary_missing_feedback: missing_feedback.length,
    summary_stale: stale_applications.length,
    active_worklist,
    trust_review,
    missing_feedback,
    stale_applications,
    next_best_actions: [
      { id: "nba-1", action_key: "recruiterOperationalWorkQueue.nbaTrustReview", candidate_display: "Demo Candidate 001" },
      { id: "nba-2", action_key: "recruiterOperationalWorkQueue.nbaFeedback", candidate_display: "Demo Candidate 002" },
    ],
    owner_due_map: [
      { owner: "Recruiter Pilot", due_date: "2026-06-20", count: 2 },
      { owner: "HM Demo", due_date: "2026-06-21", count: 1 },
    ],
  };
}
