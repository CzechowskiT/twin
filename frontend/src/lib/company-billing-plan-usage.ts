/** Company plan & usage readiness — types and static guardrails (no payments). */

export type CompanyPlanStatus = "demo" | "pilot" | "free";

export type IntegrationReadinessStatus = "live" | "pilot" | "planned" | "not_live";

export type CompanyPlanUsagePayload = {
  company_slug: string;
  billing_live: false;
  plan_status: CompanyPlanStatus;
  usage: {
    roles_count: number;
    candidates_reviewed: number;
    team_seats: number;
  };
  integrations: Array<{
    id: string;
    status: IntegrationReadinessStatus;
  }>;
  generated_at: string;
};

export const COMPANY_BILLING_CONTACT_EMAIL = "contact@twin.care";

export const COMPANY_BILLING_WAITLIST_HREF = "/companies/signup";

/** Patterns that must not appear in billing readiness surfaces (fake revenue / payments). */
export const COMPANY_BILLING_FORBIDDEN_PATTERNS: RegExp[] = [
  /\bstripe\s+checkout\b/i,
  /\bcheckout\.session\b/i,
  /\bfake\s+invoice/i,
  /\bpaid\s+users?\b/i,
  /\bplacement\s+revenue\b/i,
  /\bmonthly\s+recurring\s+revenue\b/i,
  /\bactivate\s+subscription\b/i,
  /\bupgrade\s+to\s+pro\b/i,
];

export const COMPANY_BILLING_VISUAL_MARKERS = {
  billingNotLiveBanner: "company-billing-not-live-banner",
  planStatusBadge: "company-billing-plan-status",
  usageGrid: "company-billing-usage-grid",
  integrationsList: "company-billing-integrations",
  ctaContact: "company-billing-cta-contact",
  ctaPilot: "company-billing-cta-pilot",
} as const;

export function integrationLabelKey(id: string): `companyBilling.integration_${string}` {
  return `companyBilling.integration_${id}` as `companyBilling.integration_${string}`;
}

export function integrationStatusKey(
  status: IntegrationReadinessStatus,
): `companyBilling.integrationStatus_${IntegrationReadinessStatus}` {
  return `companyBilling.integrationStatus_${status}`;
}

export function planStatusLabelKey(status: CompanyPlanStatus): `companyBilling.plan_${CompanyPlanStatus}` {
  return `companyBilling.plan_${status}`;
}
