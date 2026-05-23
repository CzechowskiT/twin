/** Fictional employer hub demo data (tabs, contact, partners). */

export type JobEmployerTabId =
  | "overview"
  | "about"
  | "media"
  | "partners"
  | "howItWorks"
  | "roles"
  | "contact"
  | "faq"
  | "caseStudies"
  | "pricing";

export const JOB_EMPLOYER_TAB_ORDER: JobEmployerTabId[] = [
  "overview",
  "about",
  "howItWorks",
  "media",
  "partners",
  "roles",
  "contact",
  "faq",
  "caseStudies",
  "pricing",
];

export function employerDisplayName(company: string): string {
  const trimmed = company.trim();
  return trimmed || "Global employer (demo)";
}

export * from "./job-employer-partners-demo";
export * from "./job-employer-case-studies-demo";
export { EMPLOYER_ABOUT_DEMO } from "./employer-about-demo";

/** @deprecated Use JobEmployerTabId — kept for legacy tab shell imports. */
export type EmployerTabId = JobEmployerTabId;
/** @deprecated Use JOB_EMPLOYER_TAB_ORDER */
export const EMPLOYER_TAB_ORDER = JOB_EMPLOYER_TAB_ORDER;

export type EmployerOffice = {
  id: string;
  region: "EMEA" | "Americas" | "APAC";
  city: string;
  address: string;
  timezone: string;
  phone: string;
  isHq?: boolean;
};

export type EmployerDepartment = {
  id: string;
  labelKey:
    | "deptRecruiting"
    | "deptHr"
    | "deptCampus"
    | "deptExecSearch"
    | "deptSupport"
    | "deptAccessibility"
    | "deptPress"
    | "deptPartnerships";
  email: string;
  responseSla: string;
};

export type EmployerNamedContact = {
  id: string;
  name: string;
  role: string;
  region: string;
  languages: string;
  email: string;
};

export type EmployerOpenRole = {
  id: string;
  title: string;
  location: string;
  team: string;
  isCurrentJob?: boolean;
};

export type EmployerContactDemo = {
  globalStats: { countries: number; offices: number; employeesLabel: string };
  offices: EmployerOffice[];
  departments: EmployerDepartment[];
  namedContacts: EmployerNamedContact[];
  openRoles: EmployerOpenRole[];
  social: { linkedIn: string; careers: string; glassdoor: string };
  candidateSla: string;
  businessHours: string;
  whistleblowerPhone: string;
  whistleblowerEmail: string;
};

function slugifyCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "employer";
}

export function buildEmployerContactDemo(company: string, currentJobTitle?: string): EmployerContactDemo {
  const slug = slugifyCompany(company);
  const domain = `${slug}.careers-demo.invalid`;

  const openRoles: EmployerOpenRole[] = [
    {
      id: "r1",
      title: currentJobTitle ?? "Senior Platform Engineer",
      location: "Warsaw · Hybrid",
      team: "Core product",
      isCurrentJob: Boolean(currentJobTitle),
    },
    {
      id: "r2",
      title: "Staff Data Engineer",
      location: "London · Remote (EU)",
      team: "Data platform",
    },
    {
      id: "r3",
      title: "Director, Talent Acquisition — EMEA",
      location: "Amsterdam",
      team: "People",
    },
    {
      id: "r4",
      title: "Principal Product Manager, Growth",
      location: "New York · Hybrid",
      team: "Product",
    },
  ];

  return {
    globalStats: { countries: 12, offices: 40, employeesLabel: "4,200+" },
    offices: [
      {
        id: "hq",
        region: "EMEA",
        city: "Warsaw",
        address: "Plac Europejski 1, 00-844 Warsaw, Poland",
        timezone: "CET (UTC+1)",
        phone: "+48 22 000 10 00",
        isHq: true,
      },
      {
        id: "lon",
        region: "EMEA",
        city: "London",
        address: "25 Old Broad Street, London EC2N 1HQ, UK",
        timezone: "GMT (UTC+0)",
        phone: "+44 20 0000 2100",
      },
      {
        id: "ams",
        region: "EMEA",
        city: "Amsterdam",
        address: "Gustav Mahlerplein 102, 1082 MA Amsterdam, NL",
        timezone: "CET (UTC+1)",
        phone: "+31 20 000 3100",
      },
      {
        id: "nyc",
        region: "Americas",
        city: "New York",
        address: "350 Fifth Avenue, New York, NY 10118, USA",
        timezone: "EST (UTC-5)",
        phone: "+1 212 000 4100",
      },
      {
        id: "sf",
        region: "Americas",
        city: "San Francisco",
        address: "535 Mission Street, San Francisco, CA 94105, USA",
        timezone: "PST (UTC-8)",
        phone: "+1 415 000 5100",
      },
      {
        id: "sg",
        region: "APAC",
        city: "Singapore",
        address: "8 Marina View, Asia Square Tower 1, Singapore 018960",
        timezone: "SGT (UTC+8)",
        phone: "+65 6000 6100",
      },
      {
        id: "tky",
        region: "APAC",
        city: "Tokyo",
        address: "2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005, Japan",
        timezone: "JST (UTC+9)",
        phone: "+81 3 0000 7100",
      },
    ],
    departments: [
      { id: "rec", labelKey: "deptRecruiting", email: `talent@${domain}`, responseSla: "2 business days" },
      { id: "hr", labelKey: "deptHr", email: `people-ops@${domain}`, responseSla: "3 business days" },
      { id: "campus", labelKey: "deptCampus", email: `campus@${domain}`, responseSla: "5 business days" },
      { id: "exec", labelKey: "deptExecSearch", email: `executive-search@${domain}`, responseSla: "By appointment" },
      { id: "support", labelKey: "deptSupport", email: `candidate-support@${domain}`, responseSla: "24 hours" },
      { id: "a11y", labelKey: "deptAccessibility", email: `accessibility@${domain}`, responseSla: "1 business day" },
      { id: "press", labelKey: "deptPress", email: `press@${domain}`, responseSla: "2 business days" },
      { id: "partners", labelKey: "deptPartnerships", email: `alliances@${domain}`, responseSla: "5 business days" },
    ],
    namedContacts: [
      {
        id: "c1",
        name: "Elena Kowalska",
        role: "Director, Global Talent Acquisition",
        region: "EMEA",
        languages: "PL, EN, DE",
        email: `elena.kowalska@${domain}`,
      },
      {
        id: "c2",
        name: "Marcus Chen",
        role: "Head of Technical Recruiting",
        region: "Americas",
        languages: "EN, Mandarin",
        email: `marcus.chen@${domain}`,
      },
      {
        id: "c3",
        name: "Priya Nair",
        role: "Campus & Early Careers Lead",
        region: "APAC",
        languages: "EN, Hindi",
        email: `priya.nair@${domain}`,
      },
      {
        id: "c4",
        name: "James Okonkwo",
        role: "Executive Search Partner",
        region: "Global",
        languages: "EN, FR",
        email: `james.okonkwo@${domain}`,
      },
    ],
    openRoles,
    social: {
      linkedIn: `https://www.linkedin.com/company/${slug}-careers-demo`,
      careers: `https://${domain}`,
      glassdoor: `https://www.glassdoor.com/overview/demo-${slug}`,
    },
    candidateSla: "First human response within 2 business days for active applications",
    businessHours: "Mon–Fri 09:00–18:00 in your local recruiting hub timezone",
    whistleblowerPhone: "+1 800 000 9000 (24/7, confidential)",
    whistleblowerEmail: `ethics-hotline@${domain}`,
  };
}

/** Hero metrics on employer FAQ tab (fictional). */
export const EMPLOYER_FAQ_GLOBAL_STATS = [
  { id: "countries", value: "38", labelKey: "faqStatCountries" },
  { id: "timeToHire", valueMessageKey: "faqStatTimeToHireValue", labelKey: "faqStatTimeToHire" },
  { id: "openRoles", value: "214", labelKey: "faqStatOpenRoles" },
] as const;
