/** Types and helpers for candidate career compass persistence API. */

export type SeniorityLevel = "junior" | "mid" | "senior" | "lead" | "director" | "executive";
export type WorkMode = "remote" | "hybrid" | "onsite" | "flexible";
export type SalaryCurrency = "PLN" | "EUR" | "USD" | "GBP";

export type CareerCompassData = {
  configured: boolean;
  target_role: string | null;
  target_seniority: SeniorityLevel | null;
  preferred_industries: string[];
  preferred_locations: string[];
  work_mode: WorkMode | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_currency: SalaryCurrency;
  career_priorities: string[];
  skill_gaps: string[];
  strengths: string[];
  next_steps: string[];
  learning_actions: string[];
  notes: string | null;
  completion_status: "draft" | "partial" | "complete";
  completion_percent: number;
  missing_fields: string[];
  readiness_complete: boolean;
  updated_at: string | null;
};

export const CAREER_COMPASS_API_PATH = "/api/v1/candidates/me/career-compass";

export const SENIORITY_OPTIONS: SeniorityLevel[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "director",
  "executive",
];

export const WORK_MODE_OPTIONS: WorkMode[] = ["remote", "hybrid", "onsite", "flexible"];

export const CURRENCY_OPTIONS: SalaryCurrency[] = ["PLN", "EUR", "USD", "GBP"];

export function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function joinCsv(items: string[] | null | undefined): string {
  return (items ?? []).join(", ");
}

export function compassToForm(data: CareerCompassData) {
  return {
    targetRole: data.target_role ?? "",
    targetSeniority: data.target_seniority ?? "",
    preferredIndustries: joinCsv(data.preferred_industries),
    preferredLocations: joinCsv(data.preferred_locations),
    workMode: data.work_mode ?? "",
    salaryMin: data.salary_expectation_min != null ? String(data.salary_expectation_min) : "",
    salaryMax: data.salary_expectation_max != null ? String(data.salary_expectation_max) : "",
    salaryCurrency: data.salary_currency ?? "PLN",
    careerPriorities: joinCsv(data.career_priorities),
    skillGaps: joinCsv(data.skill_gaps),
    strengths: joinCsv(data.strengths),
    nextSteps: joinCsv(data.next_steps),
    learningActions: joinCsv(data.learning_actions),
    notes: data.notes ?? "",
  };
}

export function formToPayload(form: ReturnType<typeof compassToForm>) {
  const salaryMin = form.salaryMin.trim() ? Number(form.salaryMin) : null;
  const salaryMax = form.salaryMax.trim() ? Number(form.salaryMax) : null;
  return {
    target_role: form.targetRole.trim() || null,
    target_seniority: form.targetSeniority || null,
    preferred_industries: splitCsv(form.preferredIndustries),
    preferred_locations: splitCsv(form.preferredLocations),
    work_mode: form.workMode || null,
    salary_expectation_min: Number.isFinite(salaryMin) ? salaryMin : null,
    salary_expectation_max: Number.isFinite(salaryMax) ? salaryMax : null,
    salary_currency: form.salaryCurrency,
    career_priorities: splitCsv(form.careerPriorities),
    skill_gaps: splitCsv(form.skillGaps),
    strengths: splitCsv(form.strengths),
    next_steps: splitCsv(form.nextSteps),
    learning_actions: splitCsv(form.learningActions),
    notes: form.notes.trim() || null,
  };
}

export function formsEqual(
  a: ReturnType<typeof compassToForm>,
  b: ReturnType<typeof compassToForm>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function validateForm(form: ReturnType<typeof compassToForm>): string | null {
  if (form.salaryMin.trim() && form.salaryMax.trim()) {
    const min = Number(form.salaryMin);
    const max = Number(form.salaryMax);
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      return "salary_min_gt_max";
    }
  }
  if (form.targetRole.trim() && !form.targetSeniority) {
    return "seniority_required_with_role";
  }
  return null;
}
