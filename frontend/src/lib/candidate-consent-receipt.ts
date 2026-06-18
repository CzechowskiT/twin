/** Candidate trust consent receipt bundle — read-only demo JSON download (no backend writes). */

import {
  CANDIDATE_CONSENT_RECEIPT_DEMO_ID,
  CANDIDATE_CONSENT_RECEIPT_FILENAME,
  getCandidateConsentReceiptDemo,
  type CandidateConsentReceiptBundle,
  type CandidateConsentReceiptRecord,
} from "@/lib/candidate-consent-receipt-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { saveBlobAsFile } from "@/lib/api";

export { CANDIDATE_CONSENT_RECEIPT_DEMO_ID, CANDIDATE_CONSENT_RECEIPT_FILENAME };

export const CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER = "candidate-consent-receipt-page";

export const CANDIDATE_CONSENT_RECEIPT_MARKERS = {
  page: CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER,
  header: "candidate-consent-receipt-header",
  receiptSummary: "candidate-consent-receipt-summary",
  consentCoverage: "candidate-consent-receipt-consent-coverage",
  jsonPanel: "candidate-consent-receipt-json-panel",
  download: "candidate-consent-receipt-download",
  coveredExcludedScope: "candidate-consent-receipt-covered-excluded-scope",
  linkedModules: "candidate-consent-receipt-linked-modules",
  boundary: "candidate-consent-receipt-boundary",
  notFound: "candidate-consent-receipt-not-found",
  pilotBadge: "candidate-consent-receipt-pilot-badge",
} as const;

export const CANDIDATE_CONSENT_RECEIPT_ROUTE = "/dashboard/trust/consent-receipt";
export const CANDIDATE_CONSENT_RECEIPT_PROFILE_ALIAS = "/profile/trust/consent-receipt";

export const CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  auditExport: CANDIDATE_CANONICAL_ROUTES.trustAuditExport,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  profile: "/profile",
} as const;

export function candidateConsentReceiptHref(): string {
  return CANDIDATE_CONSENT_RECEIPT_ROUTE;
}

export function resolveCandidateConsentReceipt(
  candidateId?: string,
): CandidateConsentReceiptRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_CONSENT_RECEIPT_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_CONSENT_RECEIPT_DEMO_ID) {
    return getCandidateConsentReceiptDemo();
  }
  return null;
}

export function buildConsentReceiptJson(record?: CandidateConsentReceiptRecord): CandidateConsentReceiptBundle {
  return (record ?? getCandidateConsentReceiptDemo()).bundle;
}

/** Client-side only — no API route; avoids accidental backend export on pilot. */
export function downloadCandidateConsentReceiptJson(record?: CandidateConsentReceiptRecord): void {
  const bundle = buildConsentReceiptJson(record);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  saveBlobAsFile(blob, CANDIDATE_CONSENT_RECEIPT_FILENAME);
}

export function isCandidateConsentReceiptDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_CONSENT_RECEIPT_DEMO_ID;
}
