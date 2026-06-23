/** Company hiring command center — deterministic demo command view for hiring managers. */

import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getCompanyHiringCommandCenterDemo,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_ATS_ID,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
  type CompanyHiringCommandCenterRecord,
} from "@/lib/company-hiring-command-center-demo-data";
import { companyHiringCockpitHref } from "@/lib/company-hiring-cockpit";
import { candidateCommunicationHref } from "@/lib/safe-communication";
import { candidateTeamHref } from "@/lib/team-collaboration";

export {
  COMPANY_HIRING_COMMAND_CENTER_DEMO_ATS_ID,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID,
  COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID,
};
export { LAUNCH_STANCE };

export const COMPANY_HIRING_COMMAND_CENTER_ROUTE = "/company/hiring-command-center";

export const COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER = "company-hiring-command-center-page";

export const COMPANY_HIRING_COMMAND_CENTER_MARKERS = {
  page: COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  header: "company-hiring-command-center-header",
  roleReadiness: "company-hiring-command-center-role-readiness",
  shortlist: "company-hiring-command-center-shortlist",
  pendingFeedback: "company-hiring-command-center-pending-feedback",
  decisionBlockers: "company-hiring-command-center-decision-blockers",
  trustBoundaries: "company-hiring-command-center-trust-boundaries",
  hiringTeamTasks: "company-hiring-command-center-hiring-team-tasks",
  nextMeetingReadiness: "company-hiring-command-center-next-meeting-readiness",
  boundaryPanel: "company-hiring-command-center-boundary-panel",
  disabledActions: "company-hiring-command-center-disabled-actions",
  pilotBadge: "company-hiring-command-center-pilot-badge",
  moduleLinks: "company-hiring-command-center-module-links",
  navLink: "company-hiring-command-center-nav-link",
  operatingState: "company-hiring-command-center-operating-state",
  operatingStateSource: "company-hiring-command-center-operating-state-source",
  schedulingProof: "company-hiring-command-center-scheduling-proof",
} as const;

export const COMPANY_HIRING_COMMAND_CENTER_FORBIDDEN_PATTERNS: RegExp[] = [
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

export const COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS = [
  { key: "approve", labelKey: "companyHiringCommandCenter.actionApprove" as TranslationKey },
  { key: "reject", labelKey: "companyHiringCommandCenter.actionReject" as TranslationKey },
  {
    key: "request_interview",
    labelKey: "companyHiringCommandCenter.actionRequestInterview" as TranslationKey,
  },
  {
    key: "message_recruiter",
    labelKey: "companyHiringCommandCenter.actionMessageRecruiter" as TranslationKey,
  },
  { key: "export_share", labelKey: "companyHiringCommandCenter.actionExportShare" as TranslationKey },
] as const;

export const COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS = [
  {
    id: "hiring_cockpit",
    href: companyHiringCockpitHref(),
    labelKey: "companyHiringCommandCenter.linkHiringCockpit" as TranslationKey,
  },
  {
    id: "sor_hub",
    href: "/company/dashboard",
    labelKey: "companyHiringCommandCenter.linkSorHub" as TranslationKey,
  },
  {
    id: "roles",
    href: COMPANY_ROLES_ROUTE,
    labelKey: "companyHiringCommandCenter.linkRoles" as TranslationKey,
  },
  {
    id: "profile360",
    href: candidateProfile360Href(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkProfile360" as TranslationKey,
  },
  {
    id: "pipeline",
    href: jobPipelineHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_ROLE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkPipeline" as TranslationKey,
  },
  {
    id: "notes",
    href: candidateCollaborationHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkNotes" as TranslationKey,
  },
  {
    id: "trust",
    href: candidateTrustHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkTrust" as TranslationKey,
  },
  {
    id: "team",
    href: candidateTeamHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkTeam" as TranslationKey,
  },
  {
    id: "communication",
    href: candidateCommunicationHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkCommunication" as TranslationKey,
  },
  {
    id: "ats",
    href: atsImportReadinessHref("company"),
    labelKey: "companyHiringCommandCenter.linkAtsReadiness" as TranslationKey,
  },
  {
    id: "decision_memory",
    href: decisionMemoryHref(COMPANY_HIRING_COMMAND_CENTER_DEMO_CANDIDATE_ID, "company"),
    labelKey: "companyHiringCommandCenter.linkDecisionMemory" as TranslationKey,
  },
  {
    id: "placement_verification",
    href: "/company/placement-verification",
    labelKey: "placementChecklist.companyPageTitle" as TranslationKey,
  },
  {
    id: "calendar_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "schedulingProof.linkCandidateReadiness" as TranslationKey,
  },
] as const;

export function companyHiringCommandCenterHref(): string {
  return COMPANY_HIRING_COMMAND_CENTER_ROUTE;
}

export function resolveCompanyHiringCommandCenter(): CompanyHiringCommandCenterRecord {
  return getCompanyHiringCommandCenterDemo();
}

export function companyCommandCenterProfileHref(candidateId: string): string {
  return candidateProfile360Href(candidateId, "company");
}

export function companyCommandCenterPipelineHref(roleId: string): string {
  return jobPipelineHref(roleId, "company");
}
