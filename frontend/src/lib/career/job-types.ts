export type JobListing = {
  id: string;
  jobBoard: string;
  title: string;
  company: string;
  location: string | null;
  city?: string | null;
  workFormat?: string;
  seniority?: string;
  department?: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: "monthly" | "yearly" | "hourly";
  skills: string[];
  description?: string | null;
  requirements?: string | null;
  redFlags?: string[];
  url: string;
  scrapedAt?: string;
  isValidated?: boolean;
  matchScore?: number | null;
  matchBand?: string | null;
};

export type JobSearchFilters = {
  q: string;
  location: string;
  jobBoard: string;
  minSalary: string;
  department: string;
  workFormat: string;
  seniority: string;
  skills: string;
  sort: "newest" | "salary" | "match" | "company";
};

export const defaultJobSearchFilters: JobSearchFilters = {
  q: "",
  location: "",
  jobBoard: "",
  minSalary: "",
  department: "",
  workFormat: "",
  seniority: "",
  skills: "",
  sort: "newest",
};

export type WorkFormat = "remote" | "hybrid" | "onsite" | "flexible";
export type Seniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager"
  | "director";
