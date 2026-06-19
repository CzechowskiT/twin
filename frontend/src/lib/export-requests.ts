/** Read-only export request records — preview metadata only. */

export const EXPORT_REQUESTS_ROUTE = "/dashboard/trust/export-requests";
export const EXPORT_REQUESTS_API_PATH = "/api/v1/export-requests";

export const EXPORT_REQUESTS_PAGE_MARKER = "export-requests-page";

export const EXPORT_REQUESTS_MARKERS = {
  page: EXPORT_REQUESTS_PAGE_MARKER,
  header: "export-requests-header",
  list: "export-requests-list",
  persistenceNote: "export-requests-persistence-note",
  boundary: "export-requests-boundary",
} as const;

export const EXPORT_REQUESTS_FORBIDDEN_PATTERNS: RegExp[] = [
  /export fulfilled/i,
  /legal export completed/i,
  /sent successfully/i,
  /GDPR compliant/i,
];

export function exportRequestsHref(): string {
  return EXPORT_REQUESTS_ROUTE;
}
