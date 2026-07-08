/** Company integrations readiness — honest static status rows (no fake “connected”). */

export type CompanyIntegrationRow = {
  id: string;
  status: "live" | "pilot" | "planned" | "not_live";
  href?: string;
};

export const COMPANY_INTEGRATIONS_ROUTE = "/company/integrations";

export const COMPANY_INTEGRATION_ROWS: CompanyIntegrationRow[] = [
  { id: "acceptance_inbox", status: "live", href: "/recruiter/inbox" },
  { id: "talent_pool_import", status: "pilot", href: "/company/talent-pool" },
  { id: "team_tokens", status: "pilot", href: "/company/team" },
  { id: "ats_webhooks", status: "planned" },
  { id: "employer_calendar", status: "not_live" },
  { id: "employer_billing", status: "not_live", href: "/company/billing" },
  { id: "greenhouse_webhook", status: "planned" },
];

export const COMPANY_INTEGRATIONS_FORBIDDEN = [/all integrations live/i, /fully connected/i];
