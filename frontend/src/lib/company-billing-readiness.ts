/** Company billing readiness — plan label and usage counters (no invoices). */

export type CompanyPlanUsagePayload = {
  company_slug: string;
  source: string;
  generated_at: string;
  billing_live: boolean;
  plan: "demo" | "pilot" | "free" | string;
  usage: {
    open_roles: number;
    reviewed_candidates: number;
    team_seats: number;
  };
  integrations: Array<{ key: string; status: string }>;
};

export const COMPANY_BILLING_ROUTE = "/company/billing";

export function isCompanyBillingWorkspaceScoped(payload: CompanyPlanUsagePayload): boolean {
  return payload.source === "workspace" && Boolean(payload.company_slug?.trim());
}

export function companyBillingPayloadHasForbiddenPii(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const forbidden = ["email", "phone", "candidate_name", "invoice", "stripe_customer"];
  const text = JSON.stringify(payload).toLowerCase();
  return forbidden.some((k) => text.includes(`"${k}"`));
}
