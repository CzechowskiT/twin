/** Candidate trust audit export bundle — read-only demo JSON download (no backend writes). */

import {
  CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID,
  CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME,
  getCandidateTrustAuditExportDemo,
  type CandidateTrustAuditExportBundle,
  type CandidateTrustAuditExportRecord,
} from "@/lib/candidate-trust-audit-export-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { saveBlobAsFile } from "@/lib/api";

export { CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID, CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME };

export const CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER = "candidate-trust-audit-export-page";

export const CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS = {
  page: CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER,
  header: "candidate-trust-audit-export-header",
  exportSummary: "candidate-trust-audit-export-summary",
  timelineCoverage: "candidate-trust-audit-export-timeline-coverage",
  jsonPanel: "candidate-trust-audit-export-json-panel",
  download: "candidate-trust-audit-export-download",
  includedExcludedScope: "candidate-trust-audit-export-included-excluded-scope",
  linkedModules: "candidate-trust-audit-export-linked-modules",
  boundary: "candidate-trust-audit-export-boundary",
  notFound: "candidate-trust-audit-export-not-found",
  pilotBadge: "candidate-trust-audit-export-pilot-badge",
} as const;

export const CANDIDATE_TRUST_AUDIT_EXPORT_ROUTE = "/dashboard/trust/audit-export";
export const CANDIDATE_TRUST_AUDIT_EXPORT_PROFILE_ALIAS = "/profile/trust/audit-export";

export const CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  exportPreview: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
  corrections: CANDIDATE_CANONICAL_ROUTES.trustCorrections,
  portability: CANDIDATE_CANONICAL_ROUTES.trustPortability,
  revokeDelete: CANDIDATE_CANONICAL_ROUTES.trustRevokeDelete,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
} as const;

export function candidateTrustAuditExportHref(): string {
  return CANDIDATE_TRUST_AUDIT_EXPORT_ROUTE;
}

export function resolveCandidateTrustAuditExport(
  candidateId?: string,
): CandidateTrustAuditExportRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID) {
    return getCandidateTrustAuditExportDemo();
  }
  return null;
}

export function buildTrustAuditExportJson(
  record?: CandidateTrustAuditExportRecord,
): CandidateTrustAuditExportBundle {
  return (record ?? getCandidateTrustAuditExportDemo()).bundle;
}

/** Client-side only — no API route; avoids accidental backend export on pilot. */
export function downloadCandidateTrustAuditExportJson(record?: CandidateTrustAuditExportRecord): void {
  const bundle = buildTrustAuditExportJson(record);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  saveBlobAsFile(blob, CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME);
}

export function isCandidateTrustAuditExportDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID;
}
