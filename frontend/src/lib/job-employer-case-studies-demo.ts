/** Fictional case-study demo data for the employer hub Case studies tab. */

export type CaseStudyRegionFilter = "all" | "emea" | "americas" | "apac";
export type CaseStudyIndustryFilter = "all" | "tech" | "finance" | "retail" | "manufacturing";

export type FeaturedCaseStudy = {
  id: string;
  region: Exclude<CaseStudyRegionFilter, "all">;
  industry: Exclude<CaseStudyIndustryFilter, "all">;
  titleKey: string;
  challengeKey: string;
  solutionKey: string;
  resultKeys: string[];
};

export type EmployeeSpotlight = {
  id: string;
  name: string;
  role: string;
  region: string;
  quoteKey: string;
};

export type FunnelStage = {
  id: string;
  labelKey: string;
  beforePct: number;
  afterPct: number;
};

export type CaseStudyOpenRole = {
  id: string;
  title: string;
  location: string;
  team: string;
  posted: string;
};

export type CaseStudyPdf = {
  id: string;
  titleKey: string;
  pages: string;
  sizeLabel: string;
};

export type CaseStudyVideo = {
  id: string;
  titleKey: string;
  durationMin: number;
  speakerKey: string;
};

export const CASE_STUDIES_HERO_STATS = [
  { id: "hires", value: "28,400+", labelKey: "caseStudiesStatHires" },
  { id: "countries", value: "47", labelKey: "caseStudiesStatCountries" },
  { id: "ttf", value: "21 days", labelKey: "caseStudiesStatTtf" },
  { id: "nps", value: "72", labelKey: "caseStudiesStatNps" },
] as const;

export const CASE_STUDY_REGION_FILTERS: CaseStudyRegionFilter[] = [
  "all",
  "emea",
  "americas",
  "apac",
];

export const CASE_STUDY_INDUSTRY_FILTERS: CaseStudyIndustryFilter[] = [
  "all",
  "tech",
  "finance",
  "retail",
  "manufacturing",
];

export const FEATURED_CASE_STUDIES: FeaturedCaseStudy[] = [
  {
    id: "fc1",
    region: "emea",
    industry: "finance",
    titleKey: "caseStudiesFeatured1Title",
    challengeKey: "caseStudiesFeatured1Challenge",
    solutionKey: "caseStudiesFeatured1Solution",
    resultKeys: ["caseStudiesFeatured1R1", "caseStudiesFeatured1R2", "caseStudiesFeatured1R3"],
  },
  {
    id: "fc2",
    region: "americas",
    industry: "tech",
    titleKey: "caseStudiesFeatured2Title",
    challengeKey: "caseStudiesFeatured2Challenge",
    solutionKey: "caseStudiesFeatured2Solution",
    resultKeys: ["caseStudiesFeatured2R1", "caseStudiesFeatured2R2"],
  },
  {
    id: "fc3",
    region: "apac",
    industry: "retail",
    titleKey: "caseStudiesFeatured3Title",
    challengeKey: "caseStudiesFeatured3Challenge",
    solutionKey: "caseStudiesFeatured3Solution",
    resultKeys: ["caseStudiesFeatured3R1", "caseStudiesFeatured3R2", "caseStudiesFeatured3R3"],
  },
  {
    id: "fc4",
    region: "emea",
    industry: "manufacturing",
    titleKey: "caseStudiesFeatured4Title",
    challengeKey: "caseStudiesFeatured4Challenge",
    solutionKey: "caseStudiesFeatured4Solution",
    resultKeys: ["caseStudiesFeatured4R1", "caseStudiesFeatured4R2"],
  },
];

export const EMPLOYEE_SPOTLIGHTS: EmployeeSpotlight[] = [
  {
    id: "es1",
    name: "Amira Hassan",
    role: "VP Talent, EMEA",
    region: "London",
    quoteKey: "caseStudiesQuote1",
  },
  {
    id: "es2",
    name: "Daniel Okoro",
    role: "Head of Engineering Hiring",
    region: "Austin",
    quoteKey: "caseStudiesQuote2",
  },
  {
    id: "es3",
    name: "Yuki Tanaka",
    role: "Campus Programs Director",
    region: "Tokyo",
    quoteKey: "caseStudiesQuote3",
  },
];

export const HIRING_FUNNEL_STAGES: FunnelStage[] = [
  { id: "applied", labelKey: "caseStudiesFunnelApplied", beforePct: 100, afterPct: 100 },
  { id: "screen", labelKey: "caseStudiesFunnelScreen", beforePct: 38, afterPct: 52 },
  { id: "interview", labelKey: "caseStudiesFunnelInterview", beforePct: 14, afterPct: 28 },
  { id: "offer", labelKey: "caseStudiesFunnelOffer", beforePct: 6, afterPct: 14 },
  { id: "accept", labelKey: "caseStudiesFunnelAccept", beforePct: 4, afterPct: 11 },
];

export const CASE_STUDY_OPEN_ROLES: CaseStudyOpenRole[] = [
  {
    id: "cr1",
    title: "Director, Employer Brand & TA Ops",
    location: "Warsaw · Hybrid",
    team: "People",
    posted: "2d ago",
  },
  {
    id: "cr2",
    title: "Principal Recruiter — Platform",
    location: "San Francisco",
    team: "Engineering",
    posted: "4d ago",
  },
  {
    id: "cr3",
    title: "Campus Program Manager",
    location: "Singapore",
    team: "Early careers",
    posted: "1w ago",
  },
  {
    id: "cr4",
    title: "Workforce Planning Analyst",
    location: "Chicago",
    team: "Finance & HR",
    posted: "6d ago",
  },
];

export const CASE_STUDY_PDFS: CaseStudyPdf[] = [
  { id: "pdf1", titleKey: "caseStudiesPdf1Title", pages: "24", sizeLabel: "4.2 MB" },
  { id: "pdf2", titleKey: "caseStudiesPdf2Title", pages: "18", sizeLabel: "3.1 MB" },
  { id: "pdf3", titleKey: "caseStudiesPdf3Title", pages: "32", sizeLabel: "5.8 MB" },
];

export const CASE_STUDY_VIDEOS: CaseStudyVideo[] = [
  { id: "v1", titleKey: "caseStudiesVideo1Title", durationMin: 4, speakerKey: "caseStudiesVideo1Speaker" },
  { id: "v2", titleKey: "caseStudiesVideo2Title", durationMin: 6, speakerKey: "caseStudiesVideo2Speaker" },
  { id: "v3", titleKey: "caseStudiesVideo3Title", durationMin: 3, speakerKey: "caseStudiesVideo3Speaker" },
];
