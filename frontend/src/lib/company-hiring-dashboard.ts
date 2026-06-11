/** Company hiring dashboard — workspace-scoped executive snapshot types. */

export type CompanyHiringDashboardPayload = {
  company_slug: string;
  source: string;
  generated_at: string;
  roles_total: number;
  roles_active: number;
  roles_draft: number;
  pipeline_total_applications: number;
  pipeline_segments: Record<string, number>;
  average_match_score: number | null;
  team_tokens: number;
  session_authenticated: boolean;
  readiness: {
    billing_live: boolean;
    public_launch: boolean;
    invites_live: boolean;
  };
  links: {
    roles: string;
    pipeline: string;
    team: string;
    inbox: string;
  };
};

export const COMPANY_HIRING_ROUTE = "/company/dashboard";

export const COMPANY_HIRING_FORBIDDEN_PATTERNS = [
  /time-to-hire/i,
  /hire conversion/i,
  /\$\d/,
  /revenue/i,
  /customers?\s+\d+/i,
];

export function isCompanyHiringWorkspaceScoped(payload: CompanyHiringDashboardPayload): boolean {
  return payload.source === "workspace" && Boolean(payload.company_slug?.trim());
}

export function companyHiringPayloadHasForbiddenPii(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const forbidden = ["email", "phone", "candidate_name", "cv", "decline_note"];
  const text = JSON.stringify(payload).toLowerCase();
  return forbidden.some((k) => text.includes(`"${k}"`));
}
