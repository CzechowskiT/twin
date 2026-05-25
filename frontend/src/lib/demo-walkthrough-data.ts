/** Synthetic demo payloads — fictional companies, labeled in UI as demo/synthetic. */

export const DEMO_WALKTHROUGH_BADGE = "demo" as const;

export const DEMO_MARKET_ACTIVE_COUNT = 30;
export const DEMO_MARKET_ROADMAP_COUNT = 50;

export const DEMO_MARKET_SOURCES = [
  "pracuj.pl",
  "rocketjobs.pl",
  "justjoin.it",
  "LinkedIn Jobs",
  "Employer career pages",
  "Greenhouse",
  "Lever",
  "Workday",
  "Teamtailor",
  "eRecruiter",
] as const;

export const DEMO_PL_PRIORITY = [
  "pracuj.pl",
  "rocketjobs.pl",
  "justjoin.it",
  "LinkedIn",
  "Employer pages",
] as const;

export type DemoWalkthroughJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  board: string;
  score: number;
  inTop20: boolean;
};

export const DEMO_WALKTHROUGH_JOBS: DemoWalkthroughJob[] = [
  {
    id: "d1",
    title: "Senior Fullstack Developer Python React",
    company: "SynthRail Logistics SA",
    location: "Warszawa · hybrid",
    board: "pracuj.pl",
    score: 94,
    inTop20: true,
  },
  {
    id: "d2",
    title: "Staff Backend Engineer (FastAPI)",
    company: "Nova Hiring PL (demo)",
    location: "Remote · PL",
    board: "rocketjobs.pl",
    score: 91,
    inTop20: true,
  },
  {
    id: "d3",
    title: "Python Developer — platform",
    company: "Baltic FinTech Studio",
    location: "Gdańsk",
    board: "justjoin.it",
    score: 88,
    inTop20: true,
  },
  {
    id: "d4",
    title: "Lead Engineer — data products",
    company: "Helix Analytics",
    location: "Kraków · remote OK",
    board: "LinkedIn Jobs",
    score: 86,
    inTop20: true,
  },
  {
    id: "d5",
    title: "Fullstack — HR tech",
    company: "PeopleGrid",
    location: "Wrocław",
    board: "Employer page",
    score: 84,
    inTop20: true,
  },
  {
    id: "d6",
    title: "Backend Python — integrations",
    company: "CourierOS",
    location: "Remote EU",
    board: "Greenhouse",
    score: 79,
    inTop20: false,
  },
];

export const DEMO_APPLICATION_STATUSES = [
  { key: "prepared" as const, jobTitle: "Senior Fullstack Developer", company: "SynthRail Logistics SA" },
  { key: "manual" as const, jobTitle: "Staff Backend Engineer", company: "Nova Hiring PL (demo)" },
  { key: "attempted" as const, jobTitle: "Python Developer — platform", company: "Baltic FinTech Studio" },
  { key: "confirmed" as const, jobTitle: "Lead Engineer — data products", company: "Helix Analytics" },
];

export const DEMO_CALENDAR_SLOT = {
  when: "Thu 10:30",
  duration: "45 min",
  title: "Intro with hiring team",
  job: "Senior Fullstack Developer",
  company: "SynthRail Logistics SA",
};

export const DEMO_CV_SKILLS = ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker"];
export const DEMO_CV_TITLES = ["Senior Fullstack Developer", "Python Developer"];
export const DEMO_CV_META = {
  experienceYears: 7,
  salaryPln: "18 000 – 24 000",
  location: "Warszawa",
};
