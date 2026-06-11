/** Company roles MVP — internal queues only, no external posting. */
export const COMPANY_ROLES_ROUTE = "/company/roles";
export type CompanyRoleStatus = "draft" | "active" | "paused" | "closed";
export type CompanyWorkMode = "onsite" | "hybrid" | "remote" | "flexible";
export type CompanyRole = {
  id: number; title: string; company: string; location: string | null;
  work_mode: CompanyWorkMode | null; status: CompanyRoleStatus;
  requirements: string | null; description: string | null;
  must_have_skills: string[]; nice_to_have_skills: string[];
  salary_min: number | null; salary_max: number | null;
  linked_candidates_count: number; created_at: string | null; updated_at: string | null;
};
export const COMPANY_ROLE_STATUSES: CompanyRoleStatus[] = ["draft","active","paused","closed"];
export const COMPANY_WORK_MODES: CompanyWorkMode[] = ["onsite","hybrid","remote","flexible"];
export const COMPANY_JOBS_FORBIDDEN_PATTERNS: RegExp[] = [
  /post to linkedin/i,/publish externally/i,/job board syndication/i,/scrape/i,/public launch go/i,/indeed|pracuj\.pl|rocketjobs/i,
];
export type QualityCheckId = "title"|"requirements"|"mustHaveSkills"|"locationOrMode"|"readyStatus";
export function companyRoleQualityChecks(role: Partial<CompanyRole>) {
  return [
    { id: "title" as const, done: Boolean(role.title?.trim()) },
    { id: "requirements" as const, done: Boolean(role.requirements?.trim() || role.description?.trim()) },
    { id: "mustHaveSkills" as const, done: (role.must_have_skills?.length ?? 0) > 0 },
    { id: "locationOrMode" as const, done: Boolean(role.location?.trim() || role.work_mode) },
    { id: "readyStatus" as const, done: role.status === "active" || role.status === "paused" },
  ];
}
export function companyRoleQualityPercent(role: Partial<CompanyRole>) {
  const c = companyRoleQualityChecks(role);
  return Math.round((c.filter((x) => x.done).length / c.length) * 100);
}
export const companyRoleDetailHref = (id: number) => `${COMPANY_ROLES_ROUTE}/${id}`;
export const companyRoleNewHref = () => `${COMPANY_ROLES_ROUTE}/new`;
export const parseSkillsInput = (raw: string) => raw.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
export const formatSkillsInput = (skills?: string[]) => (skills ?? []).join("\n");
