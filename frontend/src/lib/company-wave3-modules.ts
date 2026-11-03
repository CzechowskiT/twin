/** Company Wave 3 Hard LIVE surfaces — routes must match registry + smoke. */

export const COMPANY_ORG_SETTINGS_ROUTE = "/company/org-settings";
export const COMPANY_PERMISSIONS_ROUTE = "/company/permissions";
export const COMPANY_AUDIT_LOG_ROUTE = "/company/audit-log";
export const COMPANY_SCORECARDS_ROUTE = "/company/scorecards";
export const COMPANY_NOTIFICATIONS_ROUTE = "/company/notifications";
export const COMPANY_ONBOARDING_ROUTE = "/company/onboarding";
export const COMPANY_TRUST_SUMMARY_ROUTE = "/company/trust-summary";

export type CompanyWave3ModuleId =
  | "org-settings"
  | "permissions"
  | "audit-log"
  | "scorecards"
  | "notifications"
  | "onboarding"
  | "trust-summary";

export const COMPANY_WAVE3_MODULE_META: Record<
  CompanyWave3ModuleId,
  { route: string; apiPath: string; marker: string }
> = {
  "org-settings": {
    route: COMPANY_ORG_SETTINGS_ROUTE,
    apiPath: "org-settings",
    marker: "company-org-settings-page",
  },
  permissions: {
    route: COMPANY_PERMISSIONS_ROUTE,
    apiPath: "permissions",
    marker: "company-permissions-page",
  },
  "audit-log": {
    route: COMPANY_AUDIT_LOG_ROUTE,
    apiPath: "audit-log",
    marker: "company-audit-log-page",
  },
  scorecards: {
    route: COMPANY_SCORECARDS_ROUTE,
    apiPath: "scorecards",
    marker: "company-scorecards-page",
  },
  notifications: {
    route: COMPANY_NOTIFICATIONS_ROUTE,
    apiPath: "notifications/draft",
    marker: "company-notifications-page",
  },
  onboarding: {
    route: COMPANY_ONBOARDING_ROUTE,
    apiPath: "onboarding",
    marker: "company-onboarding-page",
  },
  "trust-summary": {
    route: COMPANY_TRUST_SUMMARY_ROUTE,
    apiPath: "trust-summary",
    marker: "company-trust-summary-page",
  },
};
