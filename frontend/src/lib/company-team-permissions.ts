/** Company team & permissions MVP — read-only role preview, no invites or fake members. */

import type { TranslationKey } from "@/lib/i18n";

export const COMPANY_TEAM_ROUTE = "/company/team";

export const COMPANY_TEAM_ROLE_IDS = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "viewer",
] as const;

export type CompanyTeamRoleId = (typeof COMPANY_TEAM_ROLE_IDS)[number];

export const COMPANY_TEAM_VISUAL_MARKERS = {
  readinessBanner: "company-team-readiness-banner",
  sessionCard: "company-team-session-card",
  tokensList: "company-team-tokens-list",
  inviteDisabled: "company-team-invite-disabled",
  roleCard: "company-team-role-card",
  panelRoot: "company-team-panel-root",
} as const;

/** Static guardrails — no invitations, escalation, or fabricated teammates. */
export const COMPANY_TEAM_FORBIDDEN_PATTERNS: RegExp[] = [
  /\bsend invite\b/i,
  /\binvite (teammate|colleague|user)\b/i,
  /\bpromote to (owner|admin)\b/i,
  /\bgrant (admin|owner)\b/i,
  /\bfake (team|member|user)/i,
  /\bteam members?\s*:\s*\[/i,
  /member@example\.com/i,
  /\bescalate privileges\b/i,
];

export function companyTeamRoleTitleKey(roleId: CompanyTeamRoleId): TranslationKey {
  return `companyTeam.role_${roleId}_title` as TranslationKey;
}

export function companyTeamRoleLeadKey(roleId: CompanyTeamRoleId): TranslationKey {
  return `companyTeam.role_${roleId}_lead` as TranslationKey;
}

export function companyTeamRolePermKeys(roleId: CompanyTeamRoleId): TranslationKey[] {
  return [
    `companyTeam.role_${roleId}_perm1`,
    `companyTeam.role_${roleId}_perm2`,
    `companyTeam.role_${roleId}_perm3`,
  ] as TranslationKey[];
}

export function companyTeamCopyIsSafe(text: string): boolean {
  return !COMPANY_TEAM_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}
