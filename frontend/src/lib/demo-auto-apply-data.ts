/**
 * Synthetic demo payloads shaped like `candidate_to_dict` / `job_to_dict` in
 * `backend/app/services/matching_service.py`. Match score verified against
 * `calculate_match_score` in `backend/app/matching/matcher.py` (Python):
 * `python3 -c "from app.matching.matcher import calculate_match_score; ..."` → 100.0
 */

export const DEMO_MATCH_SCORE = 100 as const;

/** Matcher input — mirrors backend dicts (no PII; fictional profile). */
export const DEMO_MATCH_CANDIDATE = {
  skills: ["python", "react"],
  preferred_job_titles: ["senior fullstack developer", "python developer"],
  experience_years: 7,
  desired_salary: 20000,
  location: "warszawa",
  cv_text:
    "Jan Kowalski — software engineer. Python FastAPI microservices, React TypeScript frontends, PostgreSQL, Docker, Warsaw-based. Built APIs and dashboards for logistics platform.",
} as const;

export const DEMO_MATCH_JOB = {
  title: "Senior Fullstack Developer Python React",
  requirements:
    "Wymagania: Python 4+ lat, FastAPI lub Django, React TypeScript, PostgreSQL. Wynagrodzenie 18000–24000 PLN brutto. Warszawa lub zdalnie.",
  description:
    "Budujemy platformę HR Tech. Stack: Python, FastAPI, React. Mile widziane doświadczenie z mikroserwisami i Docker.",
  salary_min: 18000,
  salary_max: 24000,
  location: "Warszawa / remote",
} as const;

/** Display-only fields for the marketing demo (not sent to the matcher). */
export const DEMO_JOB_CARD = {
  company: "SynthRail Logistics SA",
  board: "pracuj.pl",
  salaryLabel: "18 000 – 24 000 PLN brutto",
} as const;
