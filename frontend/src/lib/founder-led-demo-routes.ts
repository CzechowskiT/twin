/**
 * Founder-led demo — canonical route map for /demo links and QA guards.
 * All hrefs must resolve to existing pages or auth-safe login redirects.
 */
import { loginPathWithNext } from "@/lib/login-redirect";
import type { TranslationKey } from "@/lib/i18n";
import { candidateProfile360Href, CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360";
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
    id: "candidate_profile",
    href: "/profile",
    requiresAuth: true,
    loginPath: "/login",
    titleKey: "founderLedDemo.journeyCandidateProfileTitle",
    descKey: "founderLedDemo.journeyCandidateProfileDesc",
  },
  {
    id: "decision_memory",
    href: "/recruiter/inbox",
    requiresAuth: true,
    loginPath: "/login/recruiter",
    titleKey: "founderLedDemo.journeyDecisionMemoryTitle",
    descKey: "founderLedDemo.journeyDecisionMemoryDesc",
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
