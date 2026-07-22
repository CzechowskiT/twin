/** Company hiring team cockpit — live workspace links (no demo fixture CTAs). */

import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getCompanyHiringCockpitDemo,
  COMPANY_HIRING_COCKPIT_DEMO_ATS_ID,
  COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
  type CompanyHiringCockpitRecord,
} from "@/lib/company-hiring-cockpit-demo-data";

export {
  COMPANY_HIRING_COCKPIT_DEMO_ATS_ID,
  COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COCKPIT_DEMO_ROLE_ID,
};
export { LAUNCH_STANCE };

export const COMPANY_HIRING_COCKPIT_ROUTE = "/company/hiring-cockpit";

export const COMPANY_HIRING_COCKPIT_PAGE_MARKER = "company-hiring-cockpit-page";

export const COMPANY_HIRING_COCKPIT_MARKERS = {
  page: COMPANY_HIRING_COCKPIT_PAGE_MARKER,
  header: "company-hiring-cockpit-header",
  openRoles: "company-hiring-cockpit-open-roles",
  candidateShortlist: "company-hiring-cockpit-candidate-shortlist",
  pendingFeedback: "company-hiring-cockpit-pending-feedback",
  scorecardsReview: "company-hiring-cockpit-scorecards-review",
  trustConsentWarnings: "company-hiring-cockpit-trust-consent-warnings",
  teamAssignments: "company-hiring-cockpit-team-assignments",
  communicationDrafts: "company-hiring-cockpit-communication-drafts",
  pipelineOverview: "company-hiring-cockpit-pipeline-overview",
  decisionChecklist: "company-hiring-cockpit-decision-checklist",
  humanBoundary: "company-hiring-cockpit-human-boundary",
  moduleLinks: "company-hiring-cockpit-module-links",
  pilotBadge: "company-hiring-cockpit-pilot-badge",
  hubPromo: "company-hiring-cockpit-hub-promo",
  navLink: "company-hiring-cockpit-nav-link",
} as const;

export const COMPANY_HIRING_COCKPIT_MODULE_LINKS = [
  {
    id: "sor_hub",
    href: "/company/dashboard",
    labelKey: "companyHiringCockpit.linkSorHub" as TranslationKey,
  },
  {
    id: "roles",
    href: COMPANY_ROLES_ROUTE,
    labelKey: "companyHiringCockpit.linkRoles" as TranslationKey,
  },
  {
    id: "profile360",
    href: "/company/talent-pool",
    labelKey: "companyHiringCockpit.linkProfile360" as TranslationKey,
  },
  {
    id: "pipeline",
    href: "/company/pipeline",
    labelKey: "companyHiringCockpit.linkPipeline" as TranslationKey,
  },
  {
    id: "notes",
    href: "/company/scorecards",
    labelKey: "companyHiringCockpit.linkNotes" as TranslationKey,
  },
  {
    id: "trust",
    href: "/company/trust-summary",
    labelKey: "companyHiringCockpit.linkTrust" as TranslationKey,
  },
  {
    id: "team",
    href: "/company/team",
    labelKey: "companyHiringCockpit.linkTeam" as TranslationKey,
  },
  {
    id: "communication",
    href: "/company/notifications",
    labelKey: "companyHiringCockpit.linkCommunication" as TranslationKey,
  },
  {
    id: "ats",
    href: atsImportReadinessHref("company"),
    labelKey: "companyHiringCockpit.linkAtsReadiness" as TranslationKey,
  },
  {
    id: "decision_memory",
    href: "/company/scorecards",
    labelKey: "companyHiringCockpit.linkDecisionMemory" as TranslationKey,
  },
] as const;

export const COMPANY_HIRING_COCKPIT_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /message sent/i,
  /automatic outreach/i,
  /automatic application/i,
  /AI decided/i,
  /GDPR compliant/i,
  /legally compliant/i,
  /ATS sync completed/i,
  /writeback completed/i,
  /calendar scheduled/i,
];

export function companyHiringCockpitHref(): string {
  return COMPANY_HIRING_COCKPIT_ROUTE;
}

export function resolveCompanyHiringCockpit(): CompanyHiringCockpitRecord {
  return getCompanyHiringCockpitDemo();
}

export function getCompanyHiringCockpitRecord(): CompanyHiringCockpitRecord {
  return getCompanyHiringCockpitDemo();
}

export function companyCandidateProfileHref(candidateId: string): string {
  return candidateProfile360Href(candidateId, "company");
}

export function companyRolePipelineHref(roleId: string): string {
  return jobPipelineHref(roleId, "company");
}
