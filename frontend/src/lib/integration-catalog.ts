import {
  integrationDescKey,
  integrationNameKey,
  type IntegrationItemKey,
} from "@/lib/integrations-hub-i18n";
import type { TranslationKey } from "@/lib/i18n";

export type IntegrationPersona = "candidate" | "recruiter" | "company";
export type IntegrationHubSection = "pracuj" | "linkedin" | "other_ats";
export type IntegrationProvider = "pracuj" | "linkedin" | "twin" | "other";
export type IntegrationCategory =
  | "ats"
  | "jobboard"
  | "employer_branding"
  | "hr_saas"
  | "data_tools"
  | "ads"
  | "services";

export type IntegrationConnectionType =
  | "oauth"
  | "api_key"
  | "link_out"
  | "embedded"
  | "coming_soon";

export type IntegrationAvailability = "available" | "beta" | "coming_soon";

export type IntegrationCatalogItem = {
  id: string;
  itemKey: IntegrationItemKey;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  provider: IntegrationProvider;
  section: Exclude<IntegrationHubSection, "other_ats">;
  category: IntegrationCategory;
  personas: IntegrationPersona[];
  connectionType: IntegrationConnectionType;
  availability: IntegrationAvailability;
  officialUrl: string;
  connectEndpoint?: string;
};

export const INTEGRATION_CATEGORY_ORDER: IntegrationCategory[] = [
  "ats",
  "jobboard",
  "employer_branding",
  "hr_saas",
  "data_tools",
  "ads",
  "services",
];

function item(
  id: string,
  itemKey: IntegrationItemKey,
  section: IntegrationCatalogItem["section"],
  category: IntegrationCategory,
  provider: IntegrationProvider,
  personas: IntegrationPersona[],
  connectionType: IntegrationConnectionType,
  availability: IntegrationAvailability,
  officialUrl: string,
  connectEndpoint?: string,
): IntegrationCatalogItem {
  return {
    id,
    itemKey,
    nameKey: integrationNameKey(itemKey) as TranslationKey,
    descriptionKey: integrationDescKey(itemKey) as TranslationKey,
    provider,
    section,
    category,
    personas,
    connectionType,
    availability,
    officialUrl,
    connectEndpoint,
  };
}

/** 35 integrations: 21 Pracuj.pl + 12 LinkedIn Hiring + 2 TWIN job feeds. */
export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  // Pracuj.pl — ATS & recruitment (5)
  item(
    "pracuj-erecruiter",
    "pracujErecruiter",
    "pracuj",
    "ats",
    "pracuj",
    ["recruiter"],
    "api_key",
    "available",
    "https://erecruiter.pl/",
    "/api/v1/integrations/pracuj/connect",
  ),
  item(
    "pracuj-softgarden",
    "pracujSoftgarden",
    "pracuj",
    "ats",
    "pracuj",
    ["recruiter"],
    "coming_soon",
    "coming_soon",
    "https://www.softgarden.com/",
    "/api/v1/integrations/pracuj/connect",
  ),
  item(
    "pracuj-strefa",
    "pracujStrefa",
    "pracuj",
    "ats",
    "pracuj",
    ["recruiter"],
    "api_key",
    "available",
    "https://www.pracuj.pl/strefa-pracodawcy",
    "/api/v1/integrations/pracuj/connect",
  ),
  item(
    "pracuj-external-ats",
    "pracujExternalAts",
    "pracuj",
    "ats",
    "pracuj",
    ["recruiter"],
    "link_out",
    "available",
    "https://www.pracuj.pl/",
  ),
  item(
    "pracuj-erecruiter-form",
    "pracujErecruiterForm",
    "pracuj",
    "ats",
    "pracuj",
    ["recruiter"],
    "coming_soon",
    "coming_soon",
    "https://erecruiter.pl/",
  ),
  // Pracuj.pl — job boards (4)
  item(
    "pracuj-pl",
    "pracujPl",
    "pracuj",
    "jobboard",
    "pracuj",
    ["candidate", "recruiter", "company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/",
  ),
  item(
    "pracuj-theprotocol",
    "pracujTheprotocol",
    "pracuj",
    "jobboard",
    "pracuj",
    ["candidate", "recruiter", "company"],
    "link_out",
    "available",
    "https://theprotocol.it/",
  ),
  item(
    "pracuj-robota",
    "pracujRobota",
    "pracuj",
    "jobboard",
    "pracuj",
    ["recruiter", "company"],
    "link_out",
    "available",
    "https://robota.ua/",
  ),
  item(
    "pracuj-multiposting",
    "pracujMultiposting",
    "pracuj",
    "jobboard",
    "pracuj",
    ["recruiter", "company"],
    "coming_soon",
    "coming_soon",
    "https://www.pracuj.pl/",
  ),
  // Pracuj.pl — employer branding (4)
  item(
    "pracuj-employer-profile",
    "pracujEmployerProfile",
    "pracuj",
    "employer_branding",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/profile-pracodawcow",
  ),
  item(
    "pracuj-ads",
    "pracujAds",
    "pracuj",
    "ads",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/reklama",
  ),
  item(
    "pracuj-jobicon",
    "pracujJobicon",
    "pracuj",
    "employer_branding",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.jobicon.pl/",
  ),
  item(
    "pracuj-sponsored",
    "pracujSponsored",
    "pracuj",
    "employer_branding",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/",
  ),
  // Pracuj.pl — HR SaaS (2)
  item(
    "pracuj-worksmile",
    "pracujWorksmile",
    "pracuj",
    "hr_saas",
    "pracuj",
    ["company"],
    "coming_soon",
    "coming_soon",
    "https://www.worksmile.com/",
  ),
  item(
    "pracuj-absence",
    "pracujAbsence",
    "pracuj",
    "hr_saas",
    "pracuj",
    ["company"],
    "coming_soon",
    "coming_soon",
    "https://absence.io/",
  ),
  // Pracuj.pl — data & calculators (4)
  item(
    "pracuj-salary-grid",
    "pracujSalaryGrid",
    "pracuj",
    "data_tools",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/siatka-wynagrodzen",
  ),
  item(
    "pracuj-calculators",
    "pracujCalculators",
    "pracuj",
    "data_tools",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/kalkulatory",
  ),
  item(
    "pracuj-reports",
    "pracujReports",
    "pracuj",
    "data_tools",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/raporty",
  ),
  item(
    "pracuj-hr-challenges",
    "pracujHrChallenges",
    "pracuj",
    "data_tools",
    "pracuj",
    ["company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/wyzwania-hr",
  ),
  // Pracuj.pl — services (2)
  item(
    "pracuj-recruitment-360",
    "pracujRecruitment360",
    "pracuj",
    "services",
    "pracuj",
    ["recruiter", "company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/rekrutacja-360",
  ),
  item(
    "pracuj-anonymous-job",
    "pracujAnonymousJob",
    "pracuj",
    "services",
    "pracuj",
    ["recruiter", "company"],
    "link_out",
    "available",
    "https://www.pracuj.pl/",
  ),
  // LinkedIn Hiring (12)
  item(
    "linkedin-recruiter",
    "linkedinRecruiter",
    "linkedin",
    "ats",
    "linkedin",
    ["recruiter"],
    "oauth",
    "beta",
    "https://business.linkedin.com/talent-solutions/recruiter",
    "/api/v1/integrations/linkedin-hiring/connect",
  ),
  item(
    "linkedin-hiring-pro",
    "linkedinHiringPro",
    "linkedin",
    "ats",
    "linkedin",
    ["recruiter"],
    "oauth",
    "coming_soon",
    "https://business.linkedin.com/talent-solutions/hiring-pro",
    "/api/v1/integrations/linkedin-hiring/connect",
  ),
  item(
    "linkedin-recruiter-lite",
    "linkedinRecruiterLite",
    "linkedin",
    "ats",
    "linkedin",
    ["recruiter"],
    "oauth",
    "beta",
    "https://business.linkedin.com/talent-solutions/recruiter-lite",
    "/api/v1/integrations/linkedin-hiring/connect",
  ),
  item(
    "linkedin-job-slots",
    "linkedinJobSlots",
    "linkedin",
    "jobboard",
    "linkedin",
    ["recruiter", "company"],
    "coming_soon",
    "coming_soon",
    "https://business.linkedin.com/talent-solutions/job-posting",
  ),
  item(
    "linkedin-career-pages",
    "linkedinCareerPages",
    "linkedin",
    "employer_branding",
    "linkedin",
    ["company"],
    "link_out",
    "available",
    "https://business.linkedin.com/talent-solutions/career-pages",
  ),
  item(
    "linkedin-talent-insights",
    "linkedinTalentInsights",
    "linkedin",
    "data_tools",
    "linkedin",
    ["recruiter", "company"],
    "link_out",
    "available",
    "https://business.linkedin.com/talent-solutions/talent-insights",
  ),
  item(
    "linkedin-hiring-integrations",
    "linkedinHiringIntegrations",
    "linkedin",
    "ats",
    "linkedin",
    ["recruiter"],
    "coming_soon",
    "coming_soon",
    "https://business.linkedin.com/talent-solutions/integrations",
  ),
  item(
    "linkedin-campaign-manager",
    "linkedinCampaignManager",
    "linkedin",
    "ads",
    "linkedin",
    ["company"],
    "link_out",
    "available",
    "https://business.linkedin.com/marketing-solutions/campaign-manager",
  ),
  item(
    "linkedin-ad-formats",
    "linkedinAdFormats",
    "linkedin",
    "ads",
    "linkedin",
    ["company"],
    "link_out",
    "available",
    "https://business.linkedin.com/marketing-solutions/ad-formats",
  ),
  item(
    "linkedin-page",
    "linkedinPage",
    "linkedin",
    "employer_branding",
    "linkedin",
    ["candidate", "company"],
    "link_out",
    "available",
    "https://www.linkedin.com/company/setup/new/",
  ),
  item(
    "linkedin-business-manager",
    "linkedinBusinessManager",
    "linkedin",
    "ads",
    "linkedin",
    ["company"],
    "link_out",
    "available",
    "https://www.linkedin.com/campaignmanager/",
  ),
  item(
    "linkedin-sales-navigator",
    "linkedinSalesNavigator",
    "linkedin",
    "services",
    "linkedin",
    ["recruiter"],
    "link_out",
    "available",
    "https://business.linkedin.com/sales-solutions/sales-navigator",
  ),
  // TWIN job feeds (2)
  item(
    "twin-pracuj-scraper",
    "twinPracujScraper",
    "pracuj",
    "jobboard",
    "twin",
    ["candidate"],
    "embedded",
    "available",
    "https://www.pracuj.pl/",
  ),
  item(
    "twin-rocketjobs",
    "twinRocketjobs",
    "pracuj",
    "jobboard",
    "twin",
    ["candidate"],
    "embedded",
    "available",
    "https://rocketjobs.pl/",
  ),
];

export function integrationsForPersona(
  persona: IntegrationPersona,
  section: IntegrationHubSection,
): IntegrationCatalogItem[] {
  if (section === "other_ats") return [];
  return INTEGRATION_CATALOG.filter(
    (row) => row.section === section && row.personas.includes(persona),
  );
}
