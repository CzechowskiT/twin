/**
 * Founder-led demo — canonical route map for /demo links and QA guards.
 * All hrefs must resolve to existing pages or auth-safe login redirects.
 */
import { loginPathWithNext } from "@/lib/login-redirect";
import type { TranslationKey } from "@/lib/i18n";
import { candidateProfile360Href, CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360";
import {
  candidateCollaborationHref,
  CANDIDATE_COLLABORATION_DEMO_ID,
} from "@/lib/candidate-collaboration";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateTrustHref, CANDIDATE_TRUST_DEMO_ID } from "@/lib/candidate-trust";
import {
  candidateTeamHref,
  TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
} from "@/lib/team-collaboration";
import {
  candidateCommunicationHref,
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
} from "@/lib/safe-communication";
import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { decisionMemoryHref, DECISION_MEMORY_DEMO_ID } from "@/lib/decision-memory";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { companyHiringCockpitHref } from "@/lib/company-hiring-cockpit";
import { jobPipelineHref, JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline";

export type FounderLedDemoLink = {
  id: string;
  href: string;
  requiresAuth: boolean;
  loginPath?: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
};

export type FounderLedDemoHeroCta = {
  id: "company" | "recruiter" | "candidate";
  href: string;
  requiresAuth: boolean;
  loginPath?: string;
  labelKey: TranslationKey;
};

export const FOUNDER_LED_DEMO_HERO_CTAS: readonly FounderLedDemoHeroCta[] = [
  {
    id: "company",
    href: "/for-companies",
    requiresAuth: false,
    labelKey: "founderLedDemo.heroCtaCompany",
  },
  {
    id: "recruiter",
    href: "/recruiter",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    labelKey: "founderLedDemo.heroCtaRecruiter",
  },
  {
    id: "candidate",
    href: "/dashboard",
    requiresAuth: true,
    loginPath: "/login",
    labelKey: "founderLedDemo.heroCtaCandidate",
  },
];

export const FOUNDER_LED_DEMO_JOURNEY_STEPS: readonly FounderLedDemoLink[] = [
  {
    id: "company_memory",
    href: "/for-companies",
    requiresAuth: false,
    titleKey: "founderLedDemo.journeyCompanyMemoryTitle",
    descKey: "founderLedDemo.journeyCompanyMemoryDesc",
  },
  {
    id: "talent_pool_import",
    href: "/recruiter/talent-pool/import",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "founderLedDemo.journeyTalentPoolImportTitle",
    descKey: "founderLedDemo.journeyTalentPoolImportDesc",
  },
  {
    id: "talent_radar",
    href: "/recruiter/talent-radar",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "founderLedDemo.journeyTalentRadarTitle",
    descKey: "founderLedDemo.journeyTalentRadarDesc",
  },
  {
    id: "recruiter_profile_360",
    href: candidateProfile360Href(CANDIDATE_PROFILE_360_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "candidateProfile360.demoJourneyTitle",
    descKey: "candidateProfile360.demoJourneyDesc",
  },
  {
    id: "job_pipeline",
    href: jobPipelineHref(JOB_PIPELINE_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "jobPipeline.demoJourneyTitle",
    descKey: "jobPipeline.demoJourneyDesc",
  },
  {
    id: "collaboration",
    href: candidateCollaborationHref(CANDIDATE_COLLABORATION_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "candidateCollaboration.demoJourneyTitle",
    descKey: "candidateCollaboration.demoJourneyDesc",
  },
  {
    id: "trust",
    href: candidateTrustHref(CANDIDATE_TRUST_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "candidateTrust.demoJourneyTitle",
    descKey: "candidateTrust.demoJourneyDesc",
  },
  {
    id: "team_collaboration",
    href: candidateTeamHref(TEAM_COLLABORATION_CANDIDATE_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "teamCollaboration.demoJourneyTitle",
    descKey: "teamCollaboration.demoJourneyDesc",
  },
  {
    id: "safe_communication",
    href: candidateCommunicationHref(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "safeCommunication.demoJourneyTitle",
    descKey: "safeCommunication.demoJourneyDesc",
  },
  {
    id: "ats_import_readiness",
    href: atsImportReadinessHref("recruiter"),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "atsImportReadiness.demoJourneyTitle",
    descKey: "atsImportReadiness.demoJourneyDesc",
  },
  {
    id: "candidate_profile",
    href: "/profile",
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "founderLedDemo.journeyCandidateProfileTitle",
    descKey: "founderLedDemo.journeyCandidateProfileDesc",
  },
  {
    id: "candidate_trust_center",
    href: candidateTrustCenterHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateTrustCenter.demoJourneyTitle",
    descKey: "candidateTrustCenter.demoJourneyDesc",
  },
  {
    id: "candidate_control_center",
    href: candidateControlCenterHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateControlCenter.demoJourneyTitle",
    descKey: "candidateControlCenter.demoJourneyDesc",
  },
  {
    id: "candidate_export_preview",
    href: candidateExportPreviewHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateExportPreview.demoJourneyTitle",
    descKey: "candidateExportPreview.demoJourneyDesc",
  },
  {
    id: "candidate_correction_request",
    href: candidateCorrectionRequestHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateCorrectionRequest.demoJourneyTitle",
    descKey: "candidateCorrectionRequest.demoJourneyDesc",
  },
  {
    id: "candidate_data_portability",
    href: candidateDataPortabilityHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateDataPortability.demoJourneyTitle",
    descKey: "candidateDataPortability.demoJourneyDesc",
  },
  {
    id: "candidate_revoke_delete",
    href: candidateRevokeDeleteHref(),
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "candidateRevokeDelete.demoJourneyTitle",
    descKey: "candidateRevokeDelete.demoJourneyDesc",
  },
  {
    id: "decision_memory",
    href: decisionMemoryHref(DECISION_MEMORY_DEMO_ID),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "decisionMemory.demoJourneyTitle",
    descKey: "decisionMemory.demoJourneyDesc",
  },
  {
    id: "daily_cockpit",
    href: recruiterDailyCockpitHref(),
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "recruiterDailyCockpit.demoJourneyTitle",
    descKey: "recruiterDailyCockpit.demoJourneyDesc",
  },
  {
    id: "company_hiring_cockpit",
    href: companyHiringCockpitHref(),
    requiresAuth: true,
    loginPath: "/login/company",
    titleKey: "companyHiringCockpit.demoJourneyTitle",
    descKey: "companyHiringCockpit.demoJourneyDesc",
  },
  {
    id: "weekly_digest",
    href: "/recruiter/talent-radar/digest",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "founderLedDemo.journeyWeeklyDigestTitle",
    descKey: "founderLedDemo.journeyWeeklyDigestDesc",
  },
  {
    id: "human_decisioning",
    href: "/demo#founder-led-boundaries",
    requiresAuth: false,
    titleKey: "founderLedDemo.journeyHumanDecisionTitle",
    descKey: "founderLedDemo.journeyHumanDecisionDesc",
  },
];

export const FOUNDER_LED_DEMO_ROLE_ENTRIES: readonly FounderLedDemoLink[] = [
  {
    id: "role_candidate",
    href: "/dashboard",
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "founderLedDemo.roleCandidateTitle",
    descKey: "founderLedDemo.roleCandidateDesc",
  },
  {
    id: "role_recruiter",
    href: "/recruiter",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "founderLedDemo.roleRecruiterTitle",
    descKey: "founderLedDemo.roleRecruiterDesc",
  },
  {
    id: "role_company",
    href: "/company/dashboard",
    requiresAuth: true,
    loginPath: "/login/company",
    titleKey: "founderLedDemo.roleCompanyTitle",
    descKey: "founderLedDemo.roleCompanyDesc",
  },
  {
    id: "role_investor",
    href: "/investor",
    requiresAuth: false,
    titleKey: "founderLedDemo.roleInvestorTitle",
    descKey: "founderLedDemo.roleInvestorDesc",
  },
];

/** Extended route inventory referenced in docs — validated in static tests. */
export const FOUNDER_LED_DEMO_EXTENDED_ROUTES = [
  "/",
  "/for-companies",
  "/company/dashboard",
  "/company/talent-pool",
  "/recruiter/talent-pool",
  "/recruiter/talent-pool/import",
  "/recruiter/talent-radar",
  "/recruiter/talent-radar/digest",
  "/recruiter/candidates/demo-candidate-001",
  "/recruiter/candidates/demo-candidate-001/team",
  "/recruiter/candidates/demo-candidate-001/communication",
  "/recruiter/candidates/demo-candidate-001/decision-memory",
  "/recruiter/daily-cockpit",
  "/company/hiring-cockpit",
  "/company/candidates/demo-candidate-001",
  "/recruiter/inbox",
  "/dashboard/jobs",
  "/dashboard/matches",
  "/profile",
  "/workspace/investor",
] as const;

export const FOUNDER_LED_BOUNDARY_KEYS = [
  "founderLedDemo.boundaryNoAutoApply",
  "founderLedDemo.boundaryNoOutreach",
  "founderLedDemo.boundaryNoHiddenScraping",
  "founderLedDemo.boundaryHumanDecides",
  "founderLedDemo.boundaryConsentTrust",
] as const satisfies readonly TranslationKey[];

export function resolveFounderLedDemoHref(link: {
  href: string;
  requiresAuth: boolean;
  loginPath?: string;
}): string {
  if (link.href.startsWith("/demo#")) return link.href;
  if (!link.requiresAuth) return link.href;
  return loginPathWithNext(link.loginPath ?? "/login", link.href);
}

export function collectFounderLedDemoHrefs(): string[] {
  const raw = [
    ...FOUNDER_LED_DEMO_HERO_CTAS.map((c) => resolveFounderLedDemoHref(c)),
    ...FOUNDER_LED_DEMO_JOURNEY_STEPS.map((s) => resolveFounderLedDemoHref(s)),
    ...FOUNDER_LED_DEMO_ROLE_ENTRIES.map((r) => resolveFounderLedDemoHref(r)),
  ];
  return raw.map((href) => href.split("#")[0]?.split("?")[0] ?? href);
}
