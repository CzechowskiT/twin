import { COMPANY_BILLING_ROUTE } from "@/lib/company-billing-readiness";
import { COMPANY_HIRING_ROUTE } from "@/lib/company-hiring-dashboard";
import { COMPANY_INTEGRATIONS_ROUTE } from "@/lib/company-integrations-readiness";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_TEAM_ROUTE } from "@/lib/company-team-permissions";
import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

/** Company workspace module cards — honest billing/integrations readiness. */
export const COMPANY_WORKSPACE_MODULES: readonly WorkspaceModuleDef[] = [
  {
    id: "roles",
    href: COMPANY_ROLES_ROUTE,
    titleKey: "workspaceModules.companyRolesTitle",
    valuePropKey: "workspaceModules.companyRolesValue",
    hintKey: "workspaceModules.companyRolesHint",
    ctaKey: "workspaceModules.companyRolesCta",
    status: "live",
  },
  {
    id: "team",
    href: COMPANY_TEAM_ROUTE,
    titleKey: "workspaceModules.companyTeamTitle",
    valuePropKey: "workspaceModules.companyTeamValue",
    ctaKey: "workspaceModules.companyTeamCta",
    status: "pilot",
  },
  {
    id: "pipeline",
    href: "/company/pipeline",
    titleKey: "workspaceModules.companyPipelineTitle",
    valuePropKey: "workspaceModules.companyPipelineValue",
    ctaKey: "workspaceModules.companyPipelineCta",
    status: "live",
  },
  {
    id: "billing",
    href: COMPANY_BILLING_ROUTE,
    titleKey: "workspaceModules.companyBillingTitle",
    valuePropKey: "workspaceModules.companyBillingValue",
    hintKey: "workspaceModules.companyBillingHint",
    ctaKey: "workspaceModules.companyBillingCta",
    status: "not_live",
  },
  {
    id: "integrations",
    href: COMPANY_INTEGRATIONS_ROUTE,
    titleKey: "workspaceModules.companyIntegrationsTitle",
    valuePropKey: "workspaceModules.companyIntegrationsValue",
    hintKey: "workspaceModules.companyIntegrationsHint",
    ctaKey: "workspaceModules.companyIntegrationsCta",
    status: "pilot",
  },
  {
    id: "settings",
    href: COMPANY_HIRING_ROUTE,
    titleKey: "workspaceModules.companySettingsTitle",
    valuePropKey: "workspaceModules.companySettingsValue",
    hintKey: "workspaceModules.companySettingsHint",
    ctaKey: "workspaceModules.companySettingsCta",
    status: "needs_setup",
  },
];
