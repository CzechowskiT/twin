/** Recruiter integrations readiness — honest static status rows (no fake “connected”). */

export type RecruiterIntegrationRow = {
  id: string;
  status: "live" | "pilot" | "planned" | "not_live";
  href?: string;
};

export const RECRUITER_INTEGRATIONS_ROUTE = "/recruiter/integrations";

export const RECRUITER_INTEGRATION_ROWS: RecruiterIntegrationRow[] = [
  { id: "acceptance_inbox", status: "live", href: "/recruiter/inbox" },
  { id: "talent_pool_import", status: "pilot", href: "/recruiter/talent-pool" },
  { id: "ats_oauth", status: "pilot", href: "/recruiter/integrations/ats" },
  { id: "calendar_sync", status: "not_live" },
  { id: "teams_meet", status: "planned" },
  { id: "greenhouse_webhook", status: "planned" },
  { id: "lever_webhook", status: "planned" },
];

export const RECRUITER_INTEGRATIONS_FORBIDDEN = [/all integrations live/i, /fully connected/i];
