/** Read-only export request records — preview metadata only. */

import {
  fetchSafePersistenceList,
  postSafePersistence,
  type SafePersistenceSource,
  type SafePersistenceWriteResult,
} from "@/lib/safe-persistence-api";

export type { SafePersistenceSource };

export const EXPORT_REQUESTS_ROUTE = "/dashboard/trust/export-requests";
export const EXPORT_REQUESTS_API_PATH = "/api/v1/export-requests";
export const EXPORT_REQUESTS_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const EXPORT_REQUEST_TYPES = {
  candidateExportPreview: "candidate_export_preview",
  candidateExportIntake: "candidate_export_intake",
  trustAuditPreview: "trust_audit_preview",
  consentReceiptPreview: "consent_receipt_preview",
} as const;

export type ExportRequestType = (typeof EXPORT_REQUEST_TYPES)[keyof typeof EXPORT_REQUEST_TYPES];

export const EXPORT_REQUESTS_PAGE_MARKER = "export-requests-page";

export const EXPORT_REQUESTS_MARKERS = {
  page: EXPORT_REQUESTS_PAGE_MARKER,
  header: "export-requests-header",
  list: "export-requests-list",
  persistenceNote: "export-requests-persistence-note",
  boundary: "export-requests-boundary",
  dataSource: "export-requests-data-source",
  createForm: "export-requests-create-form",
  writeStatus: "export-requests-write-status",
} as const;

export const EXPORT_REQUESTS_FORBIDDEN_PATTERNS: RegExp[] = [
  /export fulfilled/i,
  /legal export completed/i,
  /sent successfully/i,
  /GDPR compliant/i,
];

export type ExportRequestRow = {
  id: string;
  request_type: string;
  candidate_id: string;
  status: string;
};

type ApiExportItem = {
  id: number;
  request_type: string;
  candidate_id: string;
  status: string;
};

function getExportRequestsDemo(): ExportRequestRow[] {
  return [
    {
      id: "er-demo-1",
      request_type: EXPORT_REQUEST_TYPES.candidateExportPreview,
      candidate_id: EXPORT_REQUESTS_DEMO_CANDIDATE_ID,
      status: "draft",
    },
  ];
}

export function resolveExportRequests(): ExportRequestRow[] {
  return getExportRequestsDemo();
}

export async function loadExportRequests(): Promise<{
  source: SafePersistenceSource;
  items: ExportRequestRow[];
}> {
  const demo = getExportRequestsDemo();
  const query = `?candidate_id=${encodeURIComponent(EXPORT_REQUESTS_DEMO_CANDIDATE_ID)}`;
  const result = await fetchSafePersistenceList<{ items: ApiExportItem[] }>(
    `${EXPORT_REQUESTS_API_PATH}${query}`,
    { items: [] },
  );
  if (result.source === "live" && result.data.items.length > 0) {
    return {
      source: "live",
      items: result.data.items.map((row) => ({
        id: String(row.id),
        request_type: row.request_type,
        candidate_id: row.candidate_id,
        status: row.status,
      })),
    };
  }
  return { source: result.source, items: demo };
}

export async function createExportRequestRecord(
  requestType: ExportRequestType,
): Promise<SafePersistenceWriteResult<ApiExportItem>> {
  return postSafePersistence<ApiExportItem>(EXPORT_REQUESTS_API_PATH, {
    request_type: requestType,
    candidate_id: EXPORT_REQUESTS_DEMO_CANDIDATE_ID,
    status: "draft",
  });
}

export function exportRequestsHref(): string {
  return EXPORT_REQUESTS_ROUTE;
}
