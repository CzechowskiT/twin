/** Recruiter scorecard — internal notes per application (not audit trail). */

export type RecruiterScorecardPayload = {
  application_id: number;
  company_slug: string;
  rating: number | null;
  note: string | null;
  updated_at: string | null;
};

export function recruiterScorecardQuery(token: string, companySlug: string): string {
  return new URLSearchParams({ token, company_slug: companySlug }).toString();
}
