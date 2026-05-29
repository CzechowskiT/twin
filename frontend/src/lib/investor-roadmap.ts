/**
 * Investor-facing roadmap: live = verified scrape in production conditions;
 * registry = adapter wired in SCRAPE_REGISTRY but often blocked (bots, login, SPA);
 * planned = not wired yet.
 */
export type InvestorPortal = {
  name: string;
  boardId?: string;
  /** True when live smoke tests consistently return listings (see backend global_boards). */
  scrapingVerified?: boolean;
};
export type InvestorCompany = { name: string; boardId?: string; scrapingVerified?: boolean };

export type PortalDeployStatus = "live" | "registry" | "planned";

const PORTAL_PAIRS: [string, string | undefined, boolean | undefined][] = [
  ["Indeed", "indeed", true],
  ["LinkedIn", "linkedin", false],
  ["Glassdoor", "glassdoor", true],
  ["ZipRecruiter", "ziprecruiter", true],
  ["Monster", "monster", false],
  ["CareerBuilder", "careerbuilder", false],
  ["Google for Jobs", "google-jobs", false],
  ["SimplyHired", "simplyhired", true],
  ["Snagajob", "snagajob", false],
  ["LinkUp", undefined, undefined],
  ["Wellfound (AngelList Talent)", undefined, undefined],
  ["Dice", undefined, undefined],
  ["We Work Remotely", undefined, undefined],
  ["Remote.co", undefined, undefined],
  ["FlexJobs", undefined, undefined],
  ["Turing", undefined, undefined],
  ["Toptal", undefined, undefined],
  ["Upwork", undefined, undefined],
  ["Fiverr", undefined, undefined],
  ["eFinancialCareers", undefined, undefined],
  ["BioSpace", undefined, undefined],
  ["Rigzone", undefined, undefined],
  ["Jooble", "jooble", false],
  ["StepStone", "stepstone", false],
  ["Totaljobs", undefined, undefined],
  ["Reed.co.uk", "reed", true],
  ["Welcome to the Jungle", undefined, undefined],
  ["Cadremploi", undefined, undefined],
  ["InfoJobs", undefined, undefined],
  ["Pracuj.pl", "pracuj-sales", true],
  ["Jobindex", undefined, undefined],
  ["Jobbland", undefined, undefined],
  ["HeadHunter (hh.ru)", undefined, undefined],
  ["SEEK", "seek", false],
  ["Naukri", undefined, undefined],
  ["Boss Zhipin", undefined, undefined],
  ["Zhaopin", undefined, undefined],
  ["58.com", undefined, undefined],
  ["Liepin", undefined, undefined],
  ["Jobstreet", undefined, undefined],
  ["JobsDB", undefined, undefined],
  ["Wantedly", undefined, undefined],
  ["Daijob", undefined, undefined],
  ["Computrabajo", undefined, undefined],
  ["OccMundial", undefined, undefined],
  ["Catho", undefined, undefined],
  ["Bayt", undefined, undefined],
  ["GulfTalent", undefined, undefined],
  ["Jobberman", undefined, undefined],
  ["BrighterMonday", undefined, undefined],
  ["Workopolis", undefined, undefined],
];

export const INVESTOR_PORTALS: InvestorPortal[] = PORTAL_PAIRS.map(([name, boardId, scrapingVerified]) => ({
  name,
  boardId,
  scrapingVerified,
}));

/** Employers with public Greenhouse JSON boards wired in ``registry.py`` (careers adapter). */
const INVESTOR_GREENHOUSE_LIVE: InvestorCompany[] = [
  { name: "Stripe", boardId: "gh-stripe", scrapingVerified: true },
  { name: "Databricks", boardId: "gh-databricks", scrapingVerified: true },
  { name: "Airbnb", boardId: "gh-airbnb", scrapingVerified: true },
  { name: "Duolingo", boardId: "gh-duolingo", scrapingVerified: true },
  { name: "Cloudflare", boardId: "gh-cloudflare", scrapingVerified: true },
  { name: "Robinhood", boardId: "gh-robinhood", scrapingVerified: true },
  { name: "Figma", boardId: "gh-figma", scrapingVerified: true },
  { name: "Anthropic", boardId: "gh-anthropic", scrapingVerified: true },
];

const COMPANY_NAMES = [
  "Microsoft",
  "Apple",
  "NVIDIA",
  "Alphabet (Google)",
  "Meta Platforms",
  "TSMC",
  "Broadcom",
  "ASML",
  "Oracle",
  "Samsung Electronics",
  "Tencent",
  "Adobe",
  "Salesforce",
  "AMD",
  "Qualcomm",
  "Cisco Systems",
  "SAP",
  "Intel",
  "IBM",
  "Sony",
  "Alibaba Group",
  "Baidu",
  "Xiaomi",
  "Keyence",
  "Infosys",
  "Amazon",
  "Walmart",
  "Costco Wholesale",
  "Home Depot",
  "Meituan",
  "Pinduoduo (PDD Holdings)",
  "JD.com",
  "Target",
  "Lowe's",
  "DHL Group",
  "FedEx",
  "UPS",
  "Inditex (Zara)",
  "MercadoLibre",
  "Fast Retailing (Uniqlo)",
  "Tesla",
  "Toyota Motor",
  "BYD",
  "Porsche",
  "Mercedes-Benz Group",
  "Volkswagen Group",
  "BMW Group",
  "Ferrari",
  "Stellantis",
  "Honda Motor",
  "Berkshire Hathaway",
  "JPMorgan Chase & Co.",
  "Visa",
  "Mastercard",
  "Bank of America",
  "ICBC",
  "China Construction Bank",
  "Agricultural Bank of China",
  "Wells Fargo",
  "HSBC Holdings",
  "Goldman Sachs",
  "Morgan Stanley",
  "Royal Bank of Canada",
  "HDFC Bank",
  "BlackRock",
  "UBS Group",
  "Allianz",
  "Ping An Insurance",
  "Eli Lilly & Co.",
  "Novo Nordisk",
  "UnitedHealth Group",
  "Johnson & Johnson",
  "Merck & Co.",
  "AbbVie",
  "Roche Holding",
  "Novartis",
  "AstraZeneca",
  "Pfizer",
  "Sanofi",
  "Thermo Fisher Scientific",
  "Bristol Myers Squibb",
  "Saudi Aramco",
  "ExxonMobil",
  "Chevron",
  "Shell",
  "TotalEnergies",
  "PetroChina",
  "BHP Group",
  "Rio Tinto",
  "Linde",
  "Caterpillar",
  "General Electric (GE Aerospace)",
  "Siemens",
  "Schneider Electric",
  "Honeywell",
  "LVMH",
  "Procter & Gamble",
  "L'Oréal",
  "Nestlé",
  "Netflix",
];

export const INVESTOR_COMPANIES: InvestorCompany[] = [
  ...INVESTOR_GREENHOUSE_LIVE,
  ...COMPANY_NAMES.map((name) => ({ name })),
];

export function portalDeployStatus(
  boardId: string | undefined,
  scrapingVerified?: boolean,
): PortalDeployStatus {
  if (!boardId) return "planned";
  if (scrapingVerified) return "live";
  return "registry";
}

/** @deprecated Use portalDeployStatus — kept for callers that only need the verified subset. */
export function isLivePortal(boardId: string | undefined, scrapingVerified?: boolean): boolean {
  return portalDeployStatus(boardId, scrapingVerified) === "live";
}

export function countVerifiedPortals(): number {
  return INVESTOR_PORTALS.filter((p) => p.scrapingVerified).length;
}
