/** Fictional employer "About us" demo structure — copy lives in employer-about-messages. */

export const EMPLOYER_ABOUT_PERSONA_IDS = ["candidate", "recruiter", "company", "investor"] as const;
export type EmployerAboutPersonaId = (typeof EMPLOYER_ABOUT_PERSONA_IDS)[number];

export const EMPLOYER_ABOUT_STAT_IDS = [
  "countries",
  "employees",
  "acceptanceRate",
  "timeToFill",
] as const;

export const EMPLOYER_ABOUT_VALUE_IDS = [
  "calendarFirst",
  "builtByPractitioners",
  "signalNotNoise",
  "consentByDesign",
  "globalFromDayOne",
] as const;

export const EMPLOYER_ABOUT_MILESTONE_IDS = [
  "y2018",
  "y2020",
  "y2022",
  "y2024",
  "y2025",
  "y2026",
] as const;

export const EMPLOYER_ABOUT_LEADER_IDS = ["ceo", "chro", "cto", "vpProduct"] as const;

export type EmployerAboutMapPin = {
  id: string;
  region: "EMEA" | "Americas" | "APAC";
  /** CSS grid placement for demo map (col-start / row-start style classes). */
  gridClass: string;
};

export const EMPLOYER_ABOUT_MAP_PINS: EmployerAboutMapPin[] = [
  { id: "warsaw", region: "EMEA", gridClass: "col-start-3 row-start-2" },
  { id: "london", region: "EMEA", gridClass: "col-start-2 row-start-2" },
  { id: "amsterdam", region: "EMEA", gridClass: "col-start-2 row-start-3" },
  { id: "nyc", region: "Americas", gridClass: "col-start-1 row-start-3" },
  { id: "austin", region: "Americas", gridClass: "col-start-1 row-start-4" },
  { id: "singapore", region: "APAC", gridClass: "col-start-4 row-start-4" },
  { id: "tokyo", region: "APAC", gridClass: "col-start-5 row-start-3" },
  { id: "sydney", region: "APAC", gridClass: "col-start-5 row-start-5" },
];

export const EMPLOYER_ABOUT_RELATED_ROLE_IDS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;

export const EMPLOYER_ABOUT_DEMO = {
  personas: EMPLOYER_ABOUT_PERSONA_IDS,
  stats: EMPLOYER_ABOUT_STAT_IDS,
  values: EMPLOYER_ABOUT_VALUE_IDS,
  milestones: EMPLOYER_ABOUT_MILESTONE_IDS,
  leaders: EMPLOYER_ABOUT_LEADER_IDS,
  mapPins: EMPLOYER_ABOUT_MAP_PINS,
  relatedRoles: EMPLOYER_ABOUT_RELATED_ROLE_IDS,
} as const;
