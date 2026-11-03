/**
 * Step-based interactive sales demo flows — UI beat ~1s during playback.
 */
import type { SalesDemoRole } from "@/lib/demo/sales-demo-config";
import type { TranslationKey } from "@/lib/i18n";

export type InteractiveFlowPhase =
  | "loading"
  | "scan"
  | "rank"
  | "highlight"
  | "decision"
  | "decision_loading"
  | "success"
  | "outcome";

export type InteractiveFlowStep = {
  id: string;
  phase: InteractiveFlowPhase;
  /** Auto-advance delay; 0 = wait for user decision. */
  durationMs: number;
  captionKey: TranslationKey;
  analyticsBeat: string;
  /** Product UI elements that change on this beat (≥2 for motion steps). */
  uiChanges: readonly string[];
};

/** Canonical beat cadence — founder target ~1s between successive UI elements. */
export const INTERACTIVE_FLOW_TARGET_BEAT_MS = 1_000;
export const INTERACTIVE_FLOW_BEAT_MIN_MS = 900;
export const INTERACTIVE_FLOW_BEAT_MAX_MS = 1_100;
export const INTERACTIVE_FLOW_ABSOLUTE_MAX_MS = 1_200;
export const INTERACTIVE_FLOW_MAX_STEP_MS = INTERACTIVE_FLOW_ABSOLUTE_MAX_MS;
export const INTERACTIVE_FLOW_MIN_STEP_MS = INTERACTIVE_FLOW_BEAT_MIN_MS;

const candidateSteps: InteractiveFlowStep[] = [
  {
    id: "c_load",
    phase: "loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateLoad",
    analyticsBeat: "candidate_load",
    uiChanges: ["left_skeleton", "center_skeleton", "timeline_idle"],
  },
  {
    id: "c_scan",
    phase: "scan",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateScan",
    analyticsBeat: "candidate_scan",
    uiChanges: ["left_jobs_visible", "center_profile_partial", "timeline_scan"],
  },
  {
    id: "c_rank",
    phase: "rank",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateRank",
    analyticsBeat: "candidate_rank",
    uiChanges: ["left_scores", "center_role_title", "right_score_61"],
  },
  {
    id: "c_highlight",
    phase: "highlight",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateHighlight",
    analyticsBeat: "candidate_highlight",
    uiChanges: ["left_reorder", "center_skills", "right_score_94"],
  },
  {
    id: "c_decision",
    phase: "decision",
    durationMs: 0,
    captionKey: "demoInteractive.candidateDecision",
    analyticsBeat: "candidate_decision",
    uiChanges: ["center_cta", "right_readiness", "timeline_decision"],
  },
  {
    id: "c_loading",
    phase: "decision_loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateProcessing",
    analyticsBeat: "candidate_processing",
    uiChanges: ["center_loading", "right_status", "timeline_processing"],
  },
  {
    id: "c_success",
    phase: "success",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.candidateSuccess",
    analyticsBeat: "candidate_success",
    uiChanges: ["center_calendar", "right_next_step", "timeline_slot"],
  },
  {
    id: "c_outcome",
    phase: "outcome",
    durationMs: 0,
    captionKey: "demoInteractive.candidateOutcome",
    analyticsBeat: "candidate_outcome",
    uiChanges: ["center_outcome", "right_outcome", "timeline_complete"],
  },
];

const recruiterSteps: InteractiveFlowStep[] = [
  {
    id: "r_load",
    phase: "loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterLoad",
    analyticsBeat: "recruiter_load",
    uiChanges: ["left_skeleton", "center_skeleton", "timeline_idle"],
  },
  {
    id: "r_inbox",
    phase: "scan",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterInbox",
    analyticsBeat: "recruiter_inbox",
    uiChanges: ["left_inbox_count", "center_card_partial", "timeline_inbox"],
  },
  {
    id: "r_card",
    phase: "rank",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterCard",
    analyticsBeat: "recruiter_card",
    uiChanges: ["left_queue_active", "center_rationale", "right_score"],
  },
  {
    id: "r_score",
    phase: "highlight",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterScore",
    analyticsBeat: "recruiter_score",
    uiChanges: ["left_card_promote", "center_tags", "right_action"],
  },
  {
    id: "r_decision",
    phase: "decision",
    durationMs: 0,
    captionKey: "demoInteractive.recruiterDecision",
    analyticsBeat: "recruiter_decision",
    uiChanges: ["center_cta", "right_suggested", "timeline_decision"],
  },
  {
    id: "r_loading",
    phase: "decision_loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterProcessing",
    analyticsBeat: "recruiter_processing",
    uiChanges: ["center_loading", "right_status", "timeline_processing"],
  },
  {
    id: "r_success",
    phase: "success",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.recruiterSuccess",
    analyticsBeat: "recruiter_success",
    uiChanges: ["center_slots", "right_confirmed", "timeline_interview"],
  },
  {
    id: "r_outcome",
    phase: "outcome",
    durationMs: 0,
    captionKey: "demoInteractive.recruiterOutcome",
    analyticsBeat: "recruiter_outcome",
    uiChanges: ["center_outcome", "right_outcome", "timeline_complete"],
  },
];

const companySteps: InteractiveFlowStep[] = [
  {
    id: "co_load",
    phase: "loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companyLoad",
    analyticsBeat: "company_load",
    uiChanges: ["left_skeleton", "center_skeleton", "timeline_idle"],
  },
  {
    id: "co_stats",
    phase: "scan",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companyStats",
    analyticsBeat: "company_stats",
    uiChanges: ["left_pipeline", "center_stats", "timeline_scan"],
  },
  {
    id: "co_pool",
    phase: "rank",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companyPool",
    analyticsBeat: "company_pool",
    uiChanges: ["left_shortlist", "center_candidate", "right_readiness"],
  },
  {
    id: "co_promote",
    phase: "highlight",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companyPromote",
    analyticsBeat: "company_promote",
    uiChanges: ["left_promote", "center_blocker", "right_decision"],
  },
  {
    id: "co_decision",
    phase: "decision",
    durationMs: 0,
    captionKey: "demoInteractive.companyDecision",
    analyticsBeat: "company_decision",
    uiChanges: ["center_cta", "right_next_action", "timeline_decision"],
  },
  {
    id: "co_loading",
    phase: "decision_loading",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companyProcessing",
    analyticsBeat: "company_processing",
    uiChanges: ["center_loading", "right_status", "timeline_processing"],
  },
  {
    id: "co_success",
    phase: "success",
    durationMs: INTERACTIVE_FLOW_TARGET_BEAT_MS,
    captionKey: "demoInteractive.companySuccess",
    analyticsBeat: "company_success",
    uiChanges: ["center_calendar_overlay", "right_confirmed", "timeline_slot"],
  },
  {
    id: "co_outcome",
    phase: "outcome",
    durationMs: 0,
    captionKey: "demoInteractive.companyOutcome",
    analyticsBeat: "company_outcome",
    uiChanges: ["center_outcome", "right_outcome", "timeline_complete"],
  },
];

export const INTERACTIVE_FLOW_STEPS: Record<SalesDemoRole, readonly InteractiveFlowStep[]> = {
  candidate: candidateSteps,
  recruiter: recruiterSteps,
  company: companySteps,
};

export function interactiveFlowSteps(role: SalesDemoRole): readonly InteractiveFlowStep[] {
  return INTERACTIVE_FLOW_STEPS[role];
}

export function validateInteractiveFlowConfig(): string[] {
  const issues: string[] = [];
  for (const [role, steps] of Object.entries(INTERACTIVE_FLOW_STEPS)) {
    if (steps.length < 6) issues.push(`${role}: fewer than 6 steps`);
    for (const step of steps) {
      if (step.durationMs > INTERACTIVE_FLOW_MAX_STEP_MS && step.durationMs > 0) {
        issues.push(`${role}/${step.id}: durationMs ${step.durationMs} > ${INTERACTIVE_FLOW_MAX_STEP_MS}`);
      }
      if (step.durationMs > 0 && step.durationMs < INTERACTIVE_FLOW_MIN_STEP_MS) {
        issues.push(`${role}/${step.id}: durationMs ${step.durationMs} < ${INTERACTIVE_FLOW_MIN_STEP_MS}`);
      }
      if (!step.analyticsBeat) issues.push(`${role}/${step.id}: missing analyticsBeat`);
      if (step.durationMs > 0 && step.uiChanges.length < 2) {
        issues.push(`${role}/${step.id}: fewer than 2 uiChanges on motion beat`);
      }
    }
    const motionSteps = steps.filter((s) => s.durationMs > 0 && s.phase !== "decision_loading");
    if (motionSteps.length < 4) issues.push(`${role}: fewer than 4 motion beats`);
  }
  return issues;
}
