/** ATS Import / Connector Readiness — mapping and review only (no live sync). */

import {
  ATS_IMPORT_READINESS_DEMO_CONNECTOR,
  getAtsImportReadinessDemo,
  type AtsImportReadinessRecord,
} from "@/lib/ats-import-readiness-demo-data";

export { ATS_IMPORT_READINESS_DEMO_CONNECTOR, ATS_IMPORT_SAMPLE_CANDIDATE_ID, ATS_IMPORT_SAMPLE_ROLE_ID } from "@/lib/ats-import-readiness-demo-data";

export const ATS_IMPORT_READINESS_PAGE_MARKER = "ats-import-readiness-page";

export const ATS_IMPORT_READINESS_MARKERS = {
  page: ATS_IMPORT_READINESS_PAGE_MARKER,
  header: "ats-import-readiness-header",
  connectorMatrix: "ats-import-readiness-connector-matrix",
  fieldMapping: "ats-import-readiness-field-mapping",
  dedupePreview: "ats-import-readiness-dedupe-preview",
  consentMapping: "ats-import-readiness-consent-mapping",
  validationChecklist: "ats-import-readiness-validation-checklist",
  riskFlags: "ats-import-readiness-risk-flags",
  sampleCandidate: "ats-import-readiness-sample-candidate",
  auditTrail: "ats-import-readiness-audit-trail",
  humanReviewBoundary: "ats-import-readiness-human-review-boundary",
  notFound: "ats-import-readiness-not-found",
  pilotBadge: "ats-import-readiness-pilot-badge",
  noSyncBadge: "ats-import-readiness-no-sync-badge",
  noWritebackBadge: "ats-import-readiness-no-writeback-badge",
} as const;

export const RECRUITER_ATS_INTEGRATIONS_ROUTE = "/recruiter/integrations/ats";
export const COMPANY_ATS_INTEGRATIONS_ROUTE = "/company/integrations/ats";

export type AtsImportReadinessSurface = "recruiter" | "company";

export type AtsImportReadinessView = "import-readiness" | "mapping" | "deduplication";

export const VALID_RECRUITER_ATS_VIEWS: readonly AtsImportReadinessView[] = [
  "import-readiness",
  "mapping",
  "deduplication",
];

export const VALID_COMPANY_ATS_VIEWS: readonly AtsImportReadinessView[] = [
  "import-readiness",
  "mapping",
];

export function atsIntegrationsHref(surface: AtsImportReadinessSurface = "recruiter"): string {
  return surface === "company" ? COMPANY_ATS_INTEGRATIONS_ROUTE : RECRUITER_ATS_INTEGRATIONS_ROUTE;
}

export function atsImportReadinessHref(
  surface: AtsImportReadinessSurface = "recruiter",
  view: AtsImportReadinessView = "import-readiness",
): string {
  const base = atsIntegrationsHref(surface);
  if (view === "import-readiness") return `${base}/import-readiness`;
  return `${base}/${view}`;
}

export function isValidAtsImportView(
  view: string,
  surface: AtsImportReadinessSurface,
): view is AtsImportReadinessView {
  const allowed = surface === "company" ? VALID_COMPANY_ATS_VIEWS : VALID_RECRUITER_ATS_VIEWS;
  return (allowed as readonly string[]).includes(view);
}

export function resolveAtsImportReadiness(_connectorId?: string): AtsImportReadinessRecord | null {
  return getAtsImportReadinessDemo();
}

export function isAtsImportReadinessDemoConnector(connectorId: string): boolean {
  return connectorId.trim() === ATS_IMPORT_READINESS_DEMO_CONNECTOR;
}
