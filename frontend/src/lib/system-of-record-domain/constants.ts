/** Canonical deterministic IDs for the TWIN system-of-record domain kernel (no PII). */

export const TWIN_DEMO_CANDIDATE_PRIMARY_ID = "demo-candidate-001" as const;
export const TWIN_DEMO_ROLE_PRIMARY_ID = "demo-role-001" as const;
export const TWIN_DEMO_ATS_IMPORT_ID = "lever-mapping-pilot" as const;

export const TWIN_DEMO_CANDIDATE_IDS = [
  "demo-candidate-001",
  "demo-candidate-002",
  "demo-candidate-003",
  "demo-candidate-004",
  "demo-candidate-005",
  "demo-candidate-006",
  "demo-candidate-007",
  "demo-candidate-008",
] as const;

export type TwinDemoCandidateId = (typeof TWIN_DEMO_CANDIDATE_IDS)[number];

export function isTwinDemoCandidateId(id: string): id is TwinDemoCandidateId {
  return (TWIN_DEMO_CANDIDATE_IDS as readonly string[]).includes(id.trim());
}

export function isTwinDemoRoleId(id: string): boolean {
  return id.trim() === TWIN_DEMO_ROLE_PRIMARY_ID;
}

export function isTwinDemoAtsImportId(id: string): boolean {
  return id.trim() === TWIN_DEMO_ATS_IMPORT_ID;
}
