/** Candidate export preview bundle — read-only demo JSON download (no backend writes). */

import {
  CANDIDATE_EXPORT_PREVIEW_DEMO_ID,
  CANDIDATE_EXPORT_PREVIEW_FILENAME,
  getCandidateExportPreviewDemo,
  type CandidateExportPreviewBundle,
  type CandidateExportPreviewRecord,
} from "@/lib/candidate-export-preview-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { saveBlobAsFile } from "@/lib/api";

export { CANDIDATE_EXPORT_PREVIEW_DEMO_ID, CANDIDATE_EXPORT_PREVIEW_FILENAME };

export const CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER = "candidate-export-preview-page";

export const CANDIDATE_EXPORT_PREVIEW_MARKERS = {
  page: CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER,
  header: "candidate-export-preview-header",
  bundlePreview: "candidate-export-preview-bundle-preview",
  jsonPanel: "candidate-export-preview-json-panel",
  download: "candidate-export-preview-download",
  auditTimeline: "candidate-export-preview-audit-timeline",
  includedExcluded: "candidate-export-preview-included-excluded",
  boundary: "candidate-export-preview-boundary",
  notFound: "candidate-export-preview-not-found",
  pilotBadge: "candidate-export-preview-pilot-badge",
} as const;

export const CANDIDATE_EXPORT_PREVIEW_ROUTE = "/dashboard/trust/export-preview";
export const CANDIDATE_EXPORT_PREVIEW_PROFILE_ALIAS = "/profile/trust/export-preview";

export const CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  gdprConsent: "/consent/gdpr",
} as const;

export function candidateExportPreviewHref(): string {
  return CANDIDATE_EXPORT_PREVIEW_ROUTE;
}

export function resolveCandidateExportPreview(candidateId?: string): CandidateExportPreviewRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_EXPORT_PREVIEW_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_EXPORT_PREVIEW_DEMO_ID) {
    return getCandidateExportPreviewDemo();
  }
  return null;
}

export function buildExportPreviewJson(record?: CandidateExportPreviewRecord): CandidateExportPreviewBundle {
  return (record ?? getCandidateExportPreviewDemo()).bundle;
}

/** Client-side only — no API route; avoids accidental backend export on pilot. */
export function downloadCandidateExportPreviewJson(record?: CandidateExportPreviewRecord): void {
  const bundle = buildExportPreviewJson(record);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  saveBlobAsFile(blob, CANDIDATE_EXPORT_PREVIEW_FILENAME);
}

export function isCandidateExportPreviewDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_EXPORT_PREVIEW_DEMO_ID;
}
