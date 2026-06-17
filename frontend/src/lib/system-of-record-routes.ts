/**
 * System-of-record navigation hub — central route registry per persona.
 * Every href must resolve to an existing page or safe external link (mailto).
 */
import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import {
  candidateCollaborationHref,
  CANDIDATE_COLLABORATION_DEMO_ID,
} from "@/lib/candidate-collaboration";
import {
  candidateProfile360Href,
  CANDIDATE_PROFILE_360_DEMO_ID,
} from "@/lib/candidate-profile-360";
import { candidateTrustHref, CANDIDATE_TRUST_DEMO_ID } from "@/lib/candidate-trust";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { decisionMemoryHref, DECISION_MEMORY_DEMO_ID } from "@/lib/decision-memory";
import { COMPANY_BILLING_ROUTE } from "@/lib/company-billing-readiness";
import { COMPANY_HIRING_ROUTE } from "@/lib/company-hiring-dashboard";
import { COMPANY_HIRING_COCKPIT_ROUTE } from "@/lib/company-hiring-cockpit";
import { COMPANY_INTEGRATIONS_ROUTE } from "@/lib/company-integrations-readiness";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_TEAM_ROUTE } from "@/lib/company-team-permissions";
import { COMPANY_TALENT_POOL_ROUTE } from "@/lib/company-talent-pool";
import { jobPipelineHref, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import { RECRUITER_INTEGRATIONS_ROUTE } from "@/lib/recruiter-integrations-readiness";
import {
  candidateCommunicationHref,
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
} from "@/lib/safe-communication";
import { candidateTeamHref, TEAM_COLLABORATION_CANDIDATE_DEMO_ID } from "@/lib/team-collaboration";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

export type SystemOfRecordBoundaryTag =
  | "pilot"
  | "draft_only"
  | "not_live"
  | "human_decision_required"
  | "no_outreach"
  | "no_ats_sync";

export type SystemOfRecordModuleFamily =
  | "dashboard"
  | "profile"
  | "pipeline"
  | "applications"
  | "matches"
  | "calendar"
  | "evidence"
  | "identity"
  | "referrals"
  | "inbox"
  | "talent"
  | "analytics"
  | "integrations"
  | "collaboration"
  | "trust"
  | "communication"
  | "team"
  | "billing"
  | "investor"
  | "demo";

export type SystemOfRecordRouteEntry = {
  id: string;
  persona: MarketingPersona;
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  ctaKey: TranslationKey;
  hintKey?: TranslationKey;
  status: WorkspaceModuleStatus;
  moduleFamily: SystemOfRecordModuleFamily;
  boundaryTags: readonly SystemOfRecordBoundaryTag[];
};

export const SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS: Record<
  SystemOfRecordBoundaryTag,
  TranslationKey
> = {
  pilot: "systemOfRecord.boundaryPilot",
  draft_only: "systemOfRecord.boundaryDraftOnly",
  not_live: "systemOfRecord.boundaryNotLive",
  human_decision_required: "systemOfRecord.boundaryHumanDecisionRequired",
  no_outreach: "systemOfRecord.boundaryNoOutreach",
  no_ats_sync: "systemOfRecord.boundaryNoAtsSync",
};

export const SYSTEM_OF_RECORD_HUB_MARKER = "system-of-record-navigation-hub";

const RECRUITER_DEMO_PIPELINE = jobPipelineHref(JOB_PIPELINE_DEMO_ID, "recruiter");
const COMPANY_DEMO_PIPELINE = jobPipelineHref(JOB_PIPELINE_DEMO_ID, "company");
const RECRUITER_DEMO_PROFILE = candidateProfile360Href(CANDIDATE_PROFILE_360_DEMO_ID, "recruiter");
const COMPANY_DEMO_PROFILE = candidateProfile360Href(CANDIDATE_PROFILE_360_DEMO_ID, "company");
const RECRUITER_DEMO_COLLAB = candidateCollaborationHref(CANDIDATE_COLLABORATION_DEMO_ID, "recruiter");
const COMPANY_DEMO_COLLAB = candidateCollaborationHref(CANDIDATE_COLLABORATION_DEMO_ID, "company");
const RECRUITER_DEMO_TRUST = candidateTrustHref(CANDIDATE_TRUST_DEMO_ID, "recruiter");
const COMPANY_DEMO_TRUST = candidateTrustHref(CANDIDATE_TRUST_DEMO_ID, "company");
const RECRUITER_DEMO_TEAM = candidateTeamHref(TEAM_COLLABORATION_CANDIDATE_DEMO_ID, "recruiter");
const COMPANY_DEMO_TEAM = candidateTeamHref(TEAM_COLLABORATION_CANDIDATE_DEMO_ID, "company");
const RECRUITER_DEMO_COMM = candidateCommunicationHref(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID, "recruiter");
const COMPANY_DEMO_COMM = candidateCommunicationHref(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID, "company");
const RECRUITER_DEMO_DECISION_MEMORY = decisionMemoryHref(DECISION_MEMORY_DEMO_ID, "recruiter");
const COMPANY_DEMO_DECISION_MEMORY = decisionMemoryHref(DECISION_MEMORY_DEMO_ID, "company");

/** Full system-of-record route inventory — single source for hub cards and QA guards. */
export const SYSTEM_OF_RECORD_ROUTES: readonly SystemOfRecordRouteEntry[] = [
  // —— Candidate ——
  {
    id: "candidate_panel",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.panel,
    titleKey: "systemOfRecord.candidatePanelTitle",
    descriptionKey: "systemOfRecord.candidatePanelValue",
    ctaKey: "systemOfRecord.candidatePanelCta",
    status: "live",
    moduleFamily: "dashboard",
    boundaryTags: [],
  },
  {
    id: "candidate_jobs",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.jobs,
    titleKey: "workspaceModules.candidateJobsTitle",
    descriptionKey: "workspaceModules.candidateJobsValue",
    hintKey: "workspaceModules.candidateJobsHint",
    ctaKey: "workspaceModules.candidateJobsCta",
    status: "live",
    moduleFamily: "matches",
    boundaryTags: [],
  },
  {
    id: "candidate_matches",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.matches,
    titleKey: "workspaceModules.candidateMatchesTitle",
    descriptionKey: "workspaceModules.candidateMatchesValue",
    hintKey: "workspaceModules.candidateMatchesHint",
    ctaKey: "workspaceModules.candidateMatchesCta",
    status: "live",
    moduleFamily: "matches",
    boundaryTags: [],
  },
  {
    id: "candidate_profile",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.profile,
    titleKey: "workspaceModules.candidateProfileTitle",
    descriptionKey: "workspaceModules.candidateProfileValue",
    hintKey: "workspaceModules.candidateProfileHint",
    ctaKey: "workspaceModules.candidateProfileCta",
    status: "live",
    moduleFamily: "profile",
    boundaryTags: [],
  },
  {
    id: "candidate_cv",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.cv,
    titleKey: "systemOfRecord.candidateCvTitle",
    descriptionKey: "systemOfRecord.candidateCvValue",
    ctaKey: "systemOfRecord.candidateCvCta",
    status: "live",
    moduleFamily: "profile",
    boundaryTags: [],
  },
  {
    id: "candidate_applications",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.applications,
    titleKey: "workspaceModules.candidateApplicationsTitle",
    descriptionKey: "workspaceModules.candidateApplicationsValue",
    ctaKey: "workspaceModules.candidateApplicationsCta",
    status: "live",
    moduleFamily: "applications",
    boundaryTags: [],
  },
  {
    id: "candidate_evidence",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.evidence,
    titleKey: "workspaceModules.candidateEvidenceTitle",
    descriptionKey: "workspaceModules.candidateEvidenceValue",
    ctaKey: "workspaceModules.candidateEvidenceCta",
    status: "live",
    moduleFamily: "evidence",
    boundaryTags: [],
  },
  {
    id: "candidate_interview_prep",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.interviewPrep,
    titleKey: "workspaceModules.candidateInterviewTitle",
    descriptionKey: "workspaceModules.candidateInterviewValue",
    ctaKey: "workspaceModules.candidateInterviewCta",
    status: "pilot",
    moduleFamily: "applications",
    boundaryTags: ["pilot"],
  },
  {
    id: "candidate_calendar",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.calendar,
    titleKey: "workspaceModules.candidateCalendarTitle",
    descriptionKey: "workspaceModules.candidateCalendarValue",
    hintKey: "workspaceModules.candidateCalendarHint",
    ctaKey: "workspaceModules.candidateCalendarCta",
    status: "live",
    moduleFamily: "calendar",
    boundaryTags: [],
  },
  {
    id: "candidate_plan",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.plan,
    titleKey: "workspaceModules.candidatePlanTitle",
    descriptionKey: "workspaceModules.candidatePlanValue",
    hintKey: "workspaceModules.candidatePlanHint",
    ctaKey: "workspaceModules.candidatePlanCta",
    status: "pilot",
    moduleFamily: "billing",
    boundaryTags: ["pilot", "not_live"],
  },
  {
    id: "candidate_identity",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.identity,
    titleKey: "workspaceModules.candidateIdentityTitle",
    descriptionKey: "workspaceModules.candidateIdentityValue",
    hintKey: "workspaceModules.candidateIdentityHint",
    ctaKey: "workspaceModules.candidateIdentityCta",
    status: "live",
    moduleFamily: "identity",
    boundaryTags: [],
  },
  {
    id: "candidate_trust",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.trust,
    titleKey: "workspaceModules.candidateTrustCenterTitle",
    descriptionKey: "workspaceModules.candidateTrustCenterValue",
    hintKey: "workspaceModules.candidateTrustCenterHint",
    ctaKey: "workspaceModules.candidateTrustCenterCta",
    status: "pilot",
    moduleFamily: "trust",
    boundaryTags: ["pilot", "human_decision_required", "no_outreach"],
  },
  {
    id: "candidate_referrals",
    persona: "candidate",
    href: CANDIDATE_CANONICAL_ROUTES.referrals,
    titleKey: "workspaceModules.candidateReferralsTitle",
    descriptionKey: "workspaceModules.candidateReferralsValue",
    ctaKey: "workspaceModules.candidateReferralsCta",
    status: "pilot",
    moduleFamily: "referrals",
    boundaryTags: ["pilot"],
  },
  // —— Recruiter ——
  {
    id: "recruiter_hub",
    persona: "recruiter",
    href: "/recruiter",
    titleKey: "systemOfRecord.recruiterHubTitle",
    descriptionKey: "systemOfRecord.recruiterHubValue",
    ctaKey: "systemOfRecord.recruiterHubCta",
    status: "live",
    moduleFamily: "dashboard",
    boundaryTags: [],
  },
  {
    id: "recruiter_daily_cockpit",
    persona: "recruiter",
    href: "/recruiter/daily-cockpit",
    titleKey: "recruiterDailyCockpit.demoJourneyTitle",
    descriptionKey: "recruiterDailyCockpit.demoJourneyDesc",
    ctaKey: "recruiterDailyCockpit.openDailyCockpit",
    status: "pilot",
    moduleFamily: "dashboard",
    boundaryTags: ["pilot", "human_decision_required", "no_outreach", "no_ats_sync"],
  },
  {
    id: "recruiter_inbox",
    persona: "recruiter",
    href: "/recruiter/inbox",
    titleKey: "workspaceModules.recruiterInboxTitle",
    descriptionKey: "workspaceModules.recruiterInboxValue",
    ctaKey: "workspaceModules.recruiterInboxCta",
    status: "live",
    moduleFamily: "inbox",
    boundaryTags: ["human_decision_required"],
  },
  {
    id: "recruiter_jobs",
    persona: "recruiter",
    href: "/recruiter/jobs",
    titleKey: "workspaceModules.recruiterJobsTitle",
    descriptionKey: "workspaceModules.recruiterJobsValue",
    ctaKey: "workspaceModules.recruiterJobsCta",
    status: "live",
    moduleFamily: "pipeline",
    boundaryTags: [],
  },
  {
    id: "recruiter_demo_pipeline",
    persona: "recruiter",
    href: RECRUITER_DEMO_PIPELINE,
    titleKey: "jobPipeline.demoJourneyTitle",
    descriptionKey: "jobPipeline.demoJourneyDesc",
    ctaKey: "systemOfRecord.openPipelineCta",
    status: "pilot",
    moduleFamily: "pipeline",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "recruiter_talent_radar",
    persona: "recruiter",
    href: "/recruiter/talent-radar",
    titleKey: "workspaceModules.recruiterTalentRadarTitle",
    descriptionKey: "workspaceModules.recruiterTalentRadarValue",
    hintKey: "workspaceModules.recruiterTalentRadarHint",
    ctaKey: "workspaceModules.recruiterTalentRadarCta",
    status: "pilot",
    moduleFamily: "talent",
    boundaryTags: ["pilot", "no_outreach"],
  },
  {
    id: "recruiter_talent_radar_digest",
    persona: "recruiter",
    href: "/recruiter/talent-radar/digest",
    titleKey: "workspaceModules.recruiterTalentRadarDigestTitle",
    descriptionKey: "workspaceModules.recruiterTalentRadarDigestValue",
    ctaKey: "workspaceModules.recruiterTalentRadarDigestCta",
    status: "pilot",
    moduleFamily: "talent",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "recruiter_talent_pool",
    persona: "recruiter",
    href: "/recruiter/talent-pool",
    titleKey: "workspaceModules.recruiterTalentPoolTitle",
    descriptionKey: "workspaceModules.recruiterTalentPoolValue",
    hintKey: "workspaceModules.recruiterTalentPoolHint",
    ctaKey: "workspaceModules.recruiterTalentPoolCta",
    status: "pilot",
    moduleFamily: "talent",
    boundaryTags: ["pilot", "no_ats_sync"],
  },
  {
    id: "recruiter_talent_pool_import",
    persona: "recruiter",
    href: "/recruiter/talent-pool/import",
    titleKey: "systemOfRecord.recruiterTalentPoolImportTitle",
    descriptionKey: "systemOfRecord.recruiterTalentPoolImportValue",
    ctaKey: "systemOfRecord.recruiterTalentPoolImportCta",
    status: "pilot",
    moduleFamily: "talent",
    boundaryTags: ["pilot", "no_ats_sync"],
  },
  {
    id: "recruiter_demo_profile_360",
    persona: "recruiter",
    href: RECRUITER_DEMO_PROFILE,
    titleKey: "candidateProfile360.demoJourneyTitle",
    descriptionKey: "candidateProfile360.demoJourneyDesc",
    ctaKey: "systemOfRecord.openProfile360Cta",
    status: "pilot",
    moduleFamily: "profile",
    boundaryTags: ["pilot"],
  },
  {
    id: "recruiter_demo_collaboration",
    persona: "recruiter",
    href: RECRUITER_DEMO_COLLAB,
    titleKey: "candidateCollaboration.demoJourneyTitle",
    descriptionKey: "candidateCollaboration.demoJourneyDesc",
    ctaKey: "systemOfRecord.openCollaborationCta",
    status: "pilot",
    moduleFamily: "collaboration",
    boundaryTags: ["pilot", "draft_only", "human_decision_required"],
  },
  {
    id: "recruiter_demo_trust",
    persona: "recruiter",
    href: RECRUITER_DEMO_TRUST,
    titleKey: "candidateTrust.demoJourneyTitle",
    descriptionKey: "candidateTrust.demoJourneyDesc",
    ctaKey: "systemOfRecord.openTrustCta",
    status: "pilot",
    moduleFamily: "trust",
    boundaryTags: ["pilot"],
  },
  {
    id: "recruiter_demo_team",
    persona: "recruiter",
    href: RECRUITER_DEMO_TEAM,
    titleKey: "teamCollaboration.demoJourneyTitle",
    descriptionKey: "teamCollaboration.demoJourneyDesc",
    ctaKey: "systemOfRecord.openTeamCta",
    status: "pilot",
    moduleFamily: "team",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "recruiter_demo_communication",
    persona: "recruiter",
    href: RECRUITER_DEMO_COMM,
    titleKey: "safeCommunication.demoJourneyTitle",
    descriptionKey: "safeCommunication.demoJourneyDesc",
    ctaKey: "systemOfRecord.openCommunicationCta",
    status: "pilot",
    moduleFamily: "communication",
    boundaryTags: ["pilot", "draft_only", "no_outreach"],
  },
  {
    id: "recruiter_demo_decision_memory",
    persona: "recruiter",
    href: RECRUITER_DEMO_DECISION_MEMORY,
    titleKey: "decisionMemory.demoJourneyTitle",
    descriptionKey: "decisionMemory.demoJourneyDesc",
    ctaKey: "systemOfRecord.openDecisionMemoryCta",
    status: "pilot",
    moduleFamily: "evidence",
    boundaryTags: ["pilot", "human_decision_required", "no_outreach", "no_ats_sync"],
  },
  {
    id: "recruiter_ats_import_readiness",
    persona: "recruiter",
    href: atsImportReadinessHref("recruiter"),
    titleKey: "atsImportReadiness.demoJourneyTitle",
    descriptionKey: "atsImportReadiness.demoJourneyDesc",
    ctaKey: "systemOfRecord.openAtsReadinessCta",
    status: "pilot",
    moduleFamily: "integrations",
    boundaryTags: ["pilot", "no_ats_sync", "human_decision_required"],
  },
  {
    id: "recruiter_integrations",
    persona: "recruiter",
    href: RECRUITER_INTEGRATIONS_ROUTE,
    titleKey: "workspaceModules.recruiterIntegrationsTitle",
    descriptionKey: "workspaceModules.recruiterIntegrationsValue",
    hintKey: "workspaceModules.recruiterIntegrationsHint",
    ctaKey: "workspaceModules.recruiterIntegrationsCta",
    status: "pilot",
    moduleFamily: "integrations",
    boundaryTags: ["pilot", "no_ats_sync"],
  },
  {
    id: "recruiter_analytics",
    persona: "recruiter",
    href: "/recruiter/analytics",
    titleKey: "workspaceModules.recruiterAnalyticsTitle",
    descriptionKey: "workspaceModules.recruiterAnalyticsValue",
    ctaKey: "workspaceModules.recruiterAnalyticsCta",
    status: "pilot",
    moduleFamily: "analytics",
    boundaryTags: ["pilot"],
  },
  {
    id: "recruiter_search",
    persona: "recruiter",
    href: "/recruiter/search",
    titleKey: "workspaceModules.recruiterSearchTitle",
    descriptionKey: "workspaceModules.recruiterSearchValue",
    ctaKey: "workspaceModules.recruiterSearchCta",
    status: "live",
    moduleFamily: "talent",
    boundaryTags: [],
  },
  // —— Company ——
  {
    id: "company_dashboard",
    persona: "company",
    href: COMPANY_HIRING_ROUTE,
    titleKey: "systemOfRecord.companyDashboardTitle",
    descriptionKey: "systemOfRecord.companyDashboardValue",
    ctaKey: "systemOfRecord.companyDashboardCta",
    status: "live",
    moduleFamily: "dashboard",
    boundaryTags: [],
  },
  {
    id: "company_hiring_cockpit",
    persona: "company",
    href: COMPANY_HIRING_COCKPIT_ROUTE,
    titleKey: "companyHiringCockpit.demoJourneyTitle",
    descriptionKey: "companyHiringCockpit.demoJourneyDesc",
    ctaKey: "companyHiringCockpit.openHiringCockpit",
    status: "pilot",
    moduleFamily: "dashboard",
    boundaryTags: ["pilot", "human_decision_required", "no_outreach", "no_ats_sync"],
  },
  {
    id: "company_roles",
    persona: "company",
    href: COMPANY_ROLES_ROUTE,
    titleKey: "workspaceModules.companyRolesTitle",
    descriptionKey: "workspaceModules.companyRolesValue",
    hintKey: "workspaceModules.companyRolesHint",
    ctaKey: "workspaceModules.companyRolesCta",
    status: "live",
    moduleFamily: "pipeline",
    boundaryTags: [],
  },
  {
    id: "company_demo_pipeline",
    persona: "company",
    href: COMPANY_DEMO_PIPELINE,
    titleKey: "jobPipeline.demoJourneyTitle",
    descriptionKey: "jobPipeline.demoJourneyDesc",
    ctaKey: "systemOfRecord.openPipelineCta",
    status: "pilot",
    moduleFamily: "pipeline",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "company_talent_pool",
    persona: "company",
    href: COMPANY_TALENT_POOL_ROUTE,
    titleKey: "workspaceModules.companyTalentPoolTitle",
    descriptionKey: "workspaceModules.companyTalentPoolValue",
    hintKey: "workspaceModules.companyTalentPoolHint",
    ctaKey: "workspaceModules.companyTalentPoolCta",
    status: "pilot",
    moduleFamily: "talent",
    boundaryTags: ["pilot", "no_ats_sync", "no_outreach"],
  },
  {
    id: "company_demo_profile_360",
    persona: "company",
    href: COMPANY_DEMO_PROFILE,
    titleKey: "candidateProfile360.demoJourneyTitle",
    descriptionKey: "candidateProfile360.demoJourneyDesc",
    ctaKey: "systemOfRecord.openProfile360Cta",
    status: "pilot",
    moduleFamily: "profile",
    boundaryTags: ["pilot"],
  },
  {
    id: "company_demo_collaboration",
    persona: "company",
    href: COMPANY_DEMO_COLLAB,
    titleKey: "candidateCollaboration.demoJourneyTitle",
    descriptionKey: "candidateCollaboration.demoJourneyDesc",
    ctaKey: "systemOfRecord.openCollaborationCta",
    status: "pilot",
    moduleFamily: "collaboration",
    boundaryTags: ["pilot", "draft_only", "human_decision_required"],
  },
  {
    id: "company_demo_trust",
    persona: "company",
    href: COMPANY_DEMO_TRUST,
    titleKey: "candidateTrust.demoJourneyTitle",
    descriptionKey: "candidateTrust.demoJourneyDesc",
    ctaKey: "systemOfRecord.openTrustCta",
    status: "pilot",
    moduleFamily: "trust",
    boundaryTags: ["pilot"],
  },
  {
    id: "company_demo_team",
    persona: "company",
    href: COMPANY_DEMO_TEAM,
    titleKey: "teamCollaboration.demoJourneyTitle",
    descriptionKey: "teamCollaboration.demoJourneyDesc",
    ctaKey: "systemOfRecord.openTeamCta",
    status: "pilot",
    moduleFamily: "team",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "company_demo_communication",
    persona: "company",
    href: COMPANY_DEMO_COMM,
    titleKey: "safeCommunication.demoJourneyTitle",
    descriptionKey: "safeCommunication.demoJourneyDesc",
    ctaKey: "systemOfRecord.openCommunicationCta",
    status: "pilot",
    moduleFamily: "communication",
    boundaryTags: ["pilot", "draft_only", "no_outreach"],
  },
  {
    id: "company_demo_decision_memory",
    persona: "company",
    href: COMPANY_DEMO_DECISION_MEMORY,
    titleKey: "decisionMemory.demoJourneyTitle",
    descriptionKey: "decisionMemory.demoJourneyDesc",
    ctaKey: "systemOfRecord.openDecisionMemoryCta",
    status: "pilot",
    moduleFamily: "evidence",
    boundaryTags: ["pilot", "human_decision_required", "no_outreach", "no_ats_sync"],
  },
  {
    id: "company_ats_import_readiness",
    persona: "company",
    href: atsImportReadinessHref("company"),
    titleKey: "atsImportReadiness.demoJourneyTitle",
    descriptionKey: "atsImportReadiness.demoJourneyDesc",
    ctaKey: "systemOfRecord.openAtsReadinessCta",
    status: "pilot",
    moduleFamily: "integrations",
    boundaryTags: ["pilot", "no_ats_sync", "human_decision_required"],
  },
  {
    id: "company_integrations",
    persona: "company",
    href: COMPANY_INTEGRATIONS_ROUTE,
    titleKey: "workspaceModules.companyIntegrationsTitle",
    descriptionKey: "workspaceModules.companyIntegrationsValue",
    hintKey: "workspaceModules.companyIntegrationsHint",
    ctaKey: "workspaceModules.companyIntegrationsCta",
    status: "pilot",
    moduleFamily: "integrations",
    boundaryTags: ["pilot", "no_ats_sync"],
  },
  {
    id: "company_team",
    persona: "company",
    href: COMPANY_TEAM_ROUTE,
    titleKey: "workspaceModules.companyTeamTitle",
    descriptionKey: "workspaceModules.companyTeamValue",
    ctaKey: "workspaceModules.companyTeamCta",
    status: "pilot",
    moduleFamily: "team",
    boundaryTags: ["pilot"],
  },
  {
    id: "company_billing",
    persona: "company",
    href: COMPANY_BILLING_ROUTE,
    titleKey: "workspaceModules.companyBillingTitle",
    descriptionKey: "workspaceModules.companyBillingValue",
    hintKey: "workspaceModules.companyBillingHint",
    ctaKey: "workspaceModules.companyBillingCta",
    status: "not_live",
    moduleFamily: "billing",
    boundaryTags: ["not_live"],
  },
  // —— Investor ——
  {
    id: "investor_public_room",
    persona: "investor",
    href: "/investor",
    titleKey: "workspaceModules.investorPublicRoomTitle",
    descriptionKey: "workspaceModules.investorPublicRoomValue",
    ctaKey: "workspaceModules.investorPublicRoomCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: [],
  },
  {
    id: "investor_workspace_hub",
    persona: "investor",
    href: "/workspace/investor",
    titleKey: "workspaceModules.investorHubTitle",
    descriptionKey: "workspaceModules.investorHubLead",
    ctaKey: "systemOfRecord.investorWorkspaceCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: [],
  },
  {
    id: "investor_metrics",
    persona: "investor",
    href: "/investor/metrics",
    titleKey: "workspaceModules.investorMetricsTitle",
    descriptionKey: "workspaceModules.investorMetricsValue",
    hintKey: "workspaceModules.investorMetricsHint",
    ctaKey: "workspaceModules.investorMetricsCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: [],
  },
  {
    id: "investor_roadmap",
    persona: "investor",
    href: "/investor/roadmap",
    titleKey: "workspaceModules.investorRoadmapTitle",
    descriptionKey: "workspaceModules.investorRoadmapValue",
    ctaKey: "workspaceModules.investorRoadmapCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: [],
  },
  {
    id: "investor_data_room",
    persona: "investor",
    href: "/investor/data-room",
    titleKey: "workspaceModules.investorDataRoomTitle",
    descriptionKey: "workspaceModules.investorDataRoomValue",
    hintKey: "workspaceModules.investorDataRoomHint",
    ctaKey: "workspaceModules.investorDataRoomCta",
    status: "pilot",
    moduleFamily: "investor",
    boundaryTags: ["pilot"],
  },
  {
    id: "investor_calculator",
    persona: "investor",
    href: "/investor/calculator",
    titleKey: "workspaceModules.investorCalculatorTitle",
    descriptionKey: "workspaceModules.investorCalculatorValue",
    ctaKey: "workspaceModules.investorCalculatorCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: [],
  },
  {
    id: "investor_placement",
    persona: "investor",
    href: "/investor/placement",
    titleKey: "workspaceModules.investorPlacementTitle",
    descriptionKey: "workspaceModules.investorPlacementValue",
    ctaKey: "workspaceModules.investorPlacementCta",
    status: "pilot",
    moduleFamily: "investor",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "investor_product_proof",
    persona: "investor",
    href: "/investor/product-proof",
    titleKey: "executiveProductProof.demoJourneyTitle",
    descriptionKey: "executiveProductProof.demoJourneyDesc",
    ctaKey: "executiveProductProof.openProductProofCta",
    status: "live",
    moduleFamily: "investor",
    boundaryTags: ["human_decision_required", "no_outreach", "no_ats_sync"],
  },
  {
    id: "investor_demo",
    persona: "investor",
    href: "/demo",
    titleKey: "systemOfRecord.investorDemoTitle",
    descriptionKey: "systemOfRecord.investorDemoValue",
    ctaKey: "systemOfRecord.investorDemoCta",
    status: "live",
    moduleFamily: "demo",
    boundaryTags: [],
  },
  {
    id: "investor_sor_proof_pipeline",
    persona: "investor",
    href: RECRUITER_DEMO_PIPELINE,
    titleKey: "systemOfRecord.investorProofPipelineTitle",
    descriptionKey: "systemOfRecord.investorProofPipelineValue",
    ctaKey: "systemOfRecord.investorProofPipelineCta",
    status: "pilot",
    moduleFamily: "demo",
    boundaryTags: ["pilot", "human_decision_required"],
  },
  {
    id: "investor_sor_proof_collaboration",
    persona: "investor",
    href: RECRUITER_DEMO_COLLAB,
    titleKey: "systemOfRecord.investorProofCollaborationTitle",
    descriptionKey: "systemOfRecord.investorProofCollaborationValue",
    ctaKey: "systemOfRecord.investorProofCollaborationCta",
    status: "pilot",
    moduleFamily: "demo",
    boundaryTags: ["pilot", "draft_only", "no_outreach"],
  },
  {
    id: "investor_sor_proof_ats",
    persona: "investor",
    href: atsImportReadinessHref("recruiter"),
    titleKey: "systemOfRecord.investorProofAtsTitle",
    descriptionKey: "systemOfRecord.investorProofAtsValue",
    ctaKey: "systemOfRecord.investorProofAtsCta",
    status: "pilot",
    moduleFamily: "demo",
    boundaryTags: ["pilot", "no_ats_sync"],
  },
] as const;

export function getSystemOfRecordRoutesForPersona(
  persona: MarketingPersona,
): readonly SystemOfRecordRouteEntry[] {
  return SYSTEM_OF_RECORD_ROUTES.filter((entry) => entry.persona === persona);
}

export function normalizeSystemOfRecordHref(href: string): string {
  const base = href.split("#")[0]?.split("?")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

export function collectSystemOfRecordHrefs(persona?: MarketingPersona): string[] {
  const entries = persona
    ? getSystemOfRecordRoutesForPersona(persona)
    : SYSTEM_OF_RECORD_ROUTES;
  return entries.map((entry) => normalizeSystemOfRecordHref(entry.href));
}
