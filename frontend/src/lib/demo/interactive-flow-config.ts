/**
 * Step-based interactive sales demo flows — UI beat every 1–2s during playback.
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
  /** Auto-advance delay; 0 = wait for user decision. Max 2000ms for motion beats. */
  durationMs: number;
  captionKey: TranslationKey;
  analyticsBeat: string;
};

export const INTERACTIVE_FLOW_MAX_STEP_MS = 2_000;
export const INTERACTIVE_FLOW_MIN_STEP_MS = 800;

const candidateSteps: InteractiveFlowStep[] = [
  { id: "c_load", phase: "loading", durationMs: 1_200, captionKey: "demoInteractive.candidateLoad", analyticsBeat: "candidate_load" },
  { id: "c_scan", phase: "scan", durationMs: 1_500, captionKey: "demoInteractive.candidateScan", analyticsBeat: "candidate_scan" },
  { id: "c_rank", phase: "rank", durationMs: 1_500, captionKey: "demoInteractive.candidateRank", analyticsBeat: "candidate_rank" },
  { id: "c_highlight", phase: "highlight", durationMs: 1_500, captionKey: "demoInteractive.candidateHighlight", analyticsBeat: "candidate_highlight" },
  { id: "c_decision", phase: "decision", durationMs: 0, captionKey: "demoInteractive.candidateDecision", analyticsBeat: "candidate_decision" },
  { id: "c_loading", phase: "decision_loading", durationMs: 1_200, captionKey: "demoInteractive.candidateProcessing", analyticsBeat: "candidate_processing" },
  { id: "c_success", phase: "success", durationMs: 1_800, captionKey: "demoInteractive.candidateSuccess", analyticsBeat: "candidate_success" },
  { id: "c_outcome", phase: "outcome", durationMs: 0, captionKey: "demoInteractive.candidateOutcome", analyticsBeat: "candidate_outcome" },
];

const recruiterSteps: InteractiveFlowStep[] = [
  { id: "r_load", phase: "loading", durationMs: 1_200, captionKey: "demoInteractive.recruiterLoad", analyticsBeat: "recruiter_load" },
  { id: "r_inbox", phase: "scan", durationMs: 1_500, captionKey: "demoInteractive.recruiterInbox", analyticsBeat: "recruiter_inbox" },
  { id: "r_card", phase: "rank", durationMs: 1_500, captionKey: "demoInteractive.recruiterCard", analyticsBeat: "recruiter_card" },
  { id: "r_score", phase: "highlight", durationMs: 1_500, captionKey: "demoInteractive.recruiterScore", analyticsBeat: "recruiter_score" },
  { id: "r_decision", phase: "decision", durationMs: 0, captionKey: "demoInteractive.recruiterDecision", analyticsBeat: "recruiter_decision" },
  { id: "r_loading", phase: "decision_loading", durationMs: 1_200, captionKey: "demoInteractive.recruiterProcessing", analyticsBeat: "recruiter_processing" },
  { id: "r_success", phase: "success", durationMs: 1_800, captionKey: "demoInteractive.recruiterSuccess", analyticsBeat: "recruiter_success" },
  { id: "r_outcome", phase: "outcome", durationMs: 0, captionKey: "demoInteractive.recruiterOutcome", analyticsBeat: "recruiter_outcome" },
];

const companySteps: InteractiveFlowStep[] = [
  { id: "co_load", phase: "loading", durationMs: 1_200, captionKey: "demoInteractive.companyLoad", analyticsBeat: "company_load" },
  { id: "co_stats", phase: "scan", durationMs: 1_500, captionKey: "demoInteractive.companyStats", analyticsBeat: "company_stats" },
  { id: "co_pool", phase: "rank", durationMs: 1_500, captionKey: "demoInteractive.companyPool", analyticsBeat: "company_pool" },
  { id: "co_promote", phase: "highlight", durationMs: 1_500, captionKey: "demoInteractive.companyPromote", analyticsBeat: "company_promote" },
  { id: "co_decision", phase: "decision", durationMs: 0, captionKey: "demoInteractive.companyDecision", analyticsBeat: "company_decision" },
  { id: "co_loading", phase: "decision_loading", durationMs: 1_200, captionKey: "demoInteractive.companyProcessing", analyticsBeat: "company_processing" },
  { id: "co_success", phase: "success", durationMs: 1_800, captionKey: "demoInteractive.companySuccess", analyticsBeat: "company_success" },
  { id: "co_outcome", phase: "outcome", durationMs: 0, captionKey: "demoInteractive.companyOutcome", analyticsBeat: "company_outcome" },
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
    }
    const motionSteps = steps.filter((s) => s.durationMs > 0 && s.phase !== "decision_loading");
    if (motionSteps.length < 4) issues.push(`${role}: fewer than 4 motion beats`);
  }
  return issues;
}
