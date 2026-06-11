/** Company roles management — types, routes, quality checklist helpers. */

export type CompanyRoleStatus = "draft" | "active" | "paused" | "closed";
export type CompanyWorkMode = "onsite" | "hybrid" | "remote" | "flexible";

export type CompanyRole = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  work_mode: CompanyWorkMode | null;
  status: CompanyRoleStatus;
  requirements: string | null;
  description: string | null;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  linked_candidates_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export const COMPANY_ROLE_STATUSES: CompanyRoleStatus[] = [
  "draft",
  "active",
  "paused",
  "closed",
];

export const COMPANY_WORK_MODES: CompanyWorkMode[] = [
  "onsite",
  "hybrid",
  "remote",
  "flexible",
];

export const COMPANY_JOBS_VISUAL_MARKERS = {
  panel: "company-roles-panel",
  checklist: "company-role-quality-checklist",
  trustBanner: "company-roles-trust-banner",
} as const;

export type RoleQualityItem = { id: string; done: boolean };

export function companyRolesListRoute(): string {
  return "/company/roles";
}

export function companyRoleDetailRoute(roleId: number): string {
  return `/company/roles/${roleId}`;
}

export function companyRoleNewRoute(): string {
  return "/company/roles/new";
}

export function parseSkillsInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function formatSkillsInput(skills: string[]): string {
  return skills.join("\n");
}

export function computeRoleQualityChecklist(role: Partial<CompanyRole>): RoleQualityItem[] {
  return [
    { id: "title", done: Boolean(role.title?.trim()) },
    { id: "requirements", done: Boolean(role.requirements?.trim() || role.description?.trim()) },
    { id: "mustHave", done: Boolean(role.must_have_skills?.length) },
    { id: "locationOrMode", done: Boolean(role.location?.trim() || role.work_mode) },
    { id: "statusReady", done: role.status === "active" || role.status === "paused" },
  ];
}

export function roleQualityScore(items: RoleQualityItem[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export function companyJobsCopyIsSafe(text: string): boolean {
  const lower = text.toLowerCase();
  const forbidden = [
    "publish to linkedin",
    "post to job boards",
    "external posting",
    "public launch",
    "go live",
    "auto-post",
    "scrape",
  ];
  return !forbidden.some((phrase) => lower.includes(phrase));
}
