/** Recruiter workspace activation API — Wave C slice 1. */

export const RECRUITER_ACTIVATION_API_PATH = "/api/recruiter/activation";

export type RecruiterActivationStep = {
  id: string;
  label_key: string;
  completed: boolean;
  completed_at: string | null;
};

export type RecruiterActivationState = {
  company_slug: string;
  configured: boolean;
  workspace_connected: boolean;
  queue_loaded: boolean;
  first_decision: boolean;
  activation_complete: boolean;
  first_decision_action: string | null;
  workspace_connected_at: string | null;
  queue_loaded_at: string | null;
  first_decision_at: string | null;
  activation_completed_at: string | null;
  completion_percent: number;
  completed_steps: string[];
  remaining_steps: string[];
  next_action: string;
  next_action_href: string;
  steps: RecruiterActivationStep[];
  pilot_status: string;
  browser_smoke_status: string;
};

export function recruiterActivationQuery(token: string, companySlug: string): string {
  const params = new URLSearchParams({ token, company_slug: companySlug });
  return `${RECRUITER_ACTIVATION_API_PATH}?${params.toString()}`;
}
