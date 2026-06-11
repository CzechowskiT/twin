/** Candidate skill evidence vault — types for /dashboard/evidence. */

export type EvidenceType =
  | "cv"
  | "project"
  | "certificate"
  | "github"
  | "case_study"
  | "language_test"
  | "assessment";

export type EvidenceVaultItem = {
  id: number;
  skill_name: string;
  evidence_type: EvidenceType;
  title: string | null;
  note: string | null;
  source_url: string | null;
  privacy_class: string;
  created_at: string;
  updated_at: string;
};

export const CANDIDATE_EVIDENCE_ROUTE = "/dashboard/evidence";

export const EVIDENCE_TYPE_KEYS: EvidenceType[] = [
  "cv",
  "project",
  "certificate",
  "github",
  "case_study",
  "language_test",
  "assessment",
];
