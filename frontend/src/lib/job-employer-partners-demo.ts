/** Fictional partner ecosystem demo data for the employer Partners tab. */

export type PartnerEcosystemCategory = "cloud" | "ats" | "universities" | "staffing";

export type StrategicPartner = {
  id: string;
  name: string;
  category: PartnerEcosystemCategory;
  blurbKey: string;
};

export type PartnerTier = {
  id: string;
  nameKey: string;
  badgeClass: string;
  benefitKeys: string[];
};

export type CoMarketedRole = {
  id: string;
  title: string;
  partnerOrg: string;
  location: string;
  type: string;
};

export type SiPartner = {
  id: string;
  name: string;
  focus: string;
};

export type IntegrationStub = {
  id: string;
  vendor: string;
  category: string;
  statusKey: string;
};

export type PartnerCaseStudy = {
  id: string;
  headlineKey: string;
  metricKeys: string[];
  industry: string;
};

export type PartnerOrgRole = {
  id: string;
  title: string;
  org: string;
  location: string;
  posted: string;
};

export const PARTNER_HERO_STATS = [
  { id: "partners", value: "240+", labelKey: "partnersStatPartners" },
  { id: "countries", value: "62", labelKey: "partnersStatCountries" },
  { id: "integrations", value: "18", labelKey: "partnersStatIntegrations" },
  { id: "hires", value: "14k", labelKey: "partnersStatCoHires" },
] as const;

export const TECH_ALLIANCE_BADGES = [
  "AWS",
  "Azure",
  "Google Cloud",
  "Workday",
  "SAP",
  "Greenhouse",
  "Lever",
  "ServiceNow",
  "Snowflake",
  "Databricks",
] as const;

export const STRATEGIC_PARTNERS: StrategicPartner[] = [
  {
    id: "aws",
    name: "Amazon Web Services",
    category: "cloud",
    blurbKey: "partnersEcosystemCloudAws",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    category: "cloud",
    blurbKey: "partnersEcosystemCloudAzure",
  },
  {
    id: "gh",
    name: "Greenhouse",
    category: "ats",
    blurbKey: "partnersEcosystemAtsGh",
  },
  {
    id: "wd",
    name: "Workday",
    category: "ats",
    blurbKey: "partnersEcosystemAtsWd",
  },
  {
    id: "mit",
    name: "MIT Career Bridge",
    category: "universities",
    blurbKey: "partnersEcosystemUniMit",
  },
  {
    id: "warsaw",
    name: "Warsaw Tech Alliance",
    category: "universities",
    blurbKey: "partnersEcosystemUniWarsaw",
  },
  {
    id: "adecco",
    name: "Adecco Global Talent",
    category: "staffing",
    blurbKey: "partnersEcosystemStaffAdecco",
  },
  {
    id: "randstad",
    name: "Randstad Digital",
    category: "staffing",
    blurbKey: "partnersEcosystemStaffRandstad",
  },
];

export const PARTNER_TIERS: PartnerTier[] = [
  {
    id: "gold",
    nameKey: "partnersTierGoldName",
    badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    benefitKeys: [
      "partnersTierGoldB1",
      "partnersTierGoldB2",
      "partnersTierGoldB3",
      "partnersTierGoldB4",
    ],
  },
  {
    id: "platinum",
    nameKey: "partnersTierPlatinumName",
    badgeClass: "border-violet-400/40 bg-violet-500/10 text-violet-200",
    benefitKeys: [
      "partnersTierPlatinumB1",
      "partnersTierPlatinumB2",
      "partnersTierPlatinumB3",
      "partnersTierPlatinumB4",
      "partnersTierPlatinumB5",
    ],
  },
];

export const CO_MARKETED_ROLES: CoMarketedRole[] = [
  {
    id: "cm1",
    title: "Principal Cloud Architect (joint squad)",
    partnerOrg: "AWS Professional Services",
    location: "London · Hybrid",
    type: "Full-time",
  },
  {
    id: "cm2",
    title: "Workday HCM Integration Lead",
    partnerOrg: "Accenture",
    location: "Chicago · Remote-first",
    type: "Contract-to-hire",
  },
  {
    id: "cm3",
    title: "Campus → Industry Rotational Engineer",
    partnerOrg: "MIT Career Bridge",
    location: "Boston · On-site",
    type: "Rotational",
  },
  {
    id: "cm4",
    title: "Staffing Partner Success Manager",
    partnerOrg: "Randstad Digital",
    location: "Amsterdam · Hybrid",
    type: "Full-time",
  },
];

export const SI_PARTNERS_BY_REGION: Record<"emea" | "americas" | "apac", SiPartner[]> = {
  emea: [
    { id: "acc-emea", name: "Accenture", focus: "Workday · SAP · cloud migration" },
    { id: "del-emea", name: "Deloitte", focus: "Finance transformation · HR tech" },
    { id: "cap-emea", name: "Capgemini", focus: "Enterprise ATS rollouts" },
  ],
  americas: [
    { id: "ibm-am", name: "IBM Consulting", focus: "AI hiring ops · global RPO" },
    { id: "kpmg-am", name: "KPMG", focus: "Compliance-heavy regulated hiring" },
    { id: "pwc-am", name: "PwC", focus: "Executive search pipelines" },
  ],
  apac: [
    { id: "tcs-ap", name: "TCS", focus: "Scale engineering hubs" },
    { id: "infosys-ap", name: "Infosys", focus: "Campus + lateral blends" },
    { id: "ntt-ap", name: "NTT Data", focus: "Japan · ANZ localized ATS" },
  ],
};

export const INTEGRATION_MARKETPLACE: IntegrationStub[] = [
  { id: "gh", vendor: "Greenhouse", category: "ATS", statusKey: "partnersIntegrationLive" },
  { id: "wd", vendor: "Workday", category: "HCM", statusKey: "partnersIntegrationLive" },
  { id: "sap", vendor: "SAP SuccessFactors", category: "HCM", statusKey: "partnersIntegrationBeta" },
  { id: "lever", vendor: "Lever", category: "ATS", statusKey: "partnersIntegrationLive" },
  { id: "icims", vendor: "iCIMS", category: "ATS", statusKey: "partnersIntegrationRoadmap" },
  { id: "smart", vendor: "SmartRecruiters", category: "ATS", statusKey: "partnersIntegrationBeta" },
];

export const PARTNER_CASE_STUDIES: PartnerCaseStudy[] = [
  {
    id: "cs1",
    headlineKey: "partnersCase1Headline",
    metricKeys: ["partnersCase1M1", "partnersCase1M2", "partnersCase1M3"],
    industry: "Financial services",
  },
  {
    id: "cs2",
    headlineKey: "partnersCase2Headline",
    metricKeys: ["partnersCase2M1", "partnersCase2M2"],
    industry: "Cloud infrastructure",
  },
  {
    id: "cs3",
    headlineKey: "partnersCase3Headline",
    metricKeys: ["partnersCase3M1", "partnersCase3M2", "partnersCase3M3"],
    industry: "Life sciences",
  },
];

export const PARTNER_ORG_OPEN_ROLES: PartnerOrgRole[] = [
  {
    id: "pr1",
    title: "Solutions Architect — Talent Cloud",
    org: "Amazon Web Services",
    location: "Dublin",
    posted: "3d ago",
  },
  {
    id: "pr2",
    title: "HRIS Integration Consultant",
    org: "Deloitte",
    location: "Toronto",
    posted: "1w ago",
  },
  {
    id: "pr3",
    title: "University Relations Lead",
    org: "MIT Career Bridge",
    location: "Cambridge, MA",
    posted: "5d ago",
  },
  {
    id: "pr4",
    title: "Technical Recruiter (contract)",
    org: "Randstad Digital",
    location: "Singapore",
    posted: "2d ago",
  },
  {
    id: "pr5",
    title: "Workday Recruiting Specialist",
    org: "Accenture",
    location: "Paris",
    posted: "4d ago",
  },
];
