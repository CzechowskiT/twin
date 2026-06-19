/** Request intake append queue — internal human review only. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import { fetchSafePersistenceList, type SafePersistenceSource } from "@/lib/safe-persistence-api";

export { LAUNCH_STANCE };
export type { SafePersistenceSource };

export const REQUEST_INTAKE_RECRUITER_ROUTE = "/recruiter/request-intake";
export const REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE = "/dashboard/trust/request-intake-preview";
export const REQUEST_INTAKE_API_PATH = "/api/v1/request-intake";

export const REQUEST_INTAKE_PAGE_MARKER = "request-intake-page";

export const REQUEST_INTAKE_MARKERS = {
  page: REQUEST_INTAKE_PAGE_MARKER,
  header: "request-intake-header",
  queue: "request-intake-queue",
  queueCount: "request-intake-queue-count",
  boundary: "request-intake-boundary",
  trustReviewLink: "request-intake-trust-review-link",
  dataSource: "request-intake-data-source",
} as const;

export type RequestIntakeRow = {
  id: string;
  request_type: string;
  status: string;
  subject_ref: string;
};

type ApiIntakeItem = {
  id: number;
  request_type: string;
  status: string;
  subject_ref: string;
};

const DEMO_ROWS: RequestIntakeRow[] = [
  { id: "ri-1", request_type: "correction_preview", status: "open", subject_ref: "demo-subject-001" },
  { id: "ri-2", request_type: "trust_audit_review", status: "triage", subject_ref: "demo-subject-002" },
];

export function resolveRequestIntake(): RequestIntakeRow[] {
  return DEMO_ROWS;
}

export async function loadRequestIntake(): Promise<{
  source: SafePersistenceSource;
  items: RequestIntakeRow[];
  count: number;
}> {
  const demo = DEMO_ROWS;
  const result = await fetchSafePersistenceList<{ items: ApiIntakeItem[] }>(REQUEST_INTAKE_API_PATH, { items: [] });
  if (result.source === "live" && result.data.items.length > 0) {
    const items = result.data.items.map((row) => ({
      id: String(row.id),
      request_type: row.request_type,
      status: row.status,
      subject_ref: row.subject_ref,
    }));
    return { source: "live", items, count: items.length };
  }
  return { source: result.source, items: demo, count: demo.length };
}

export async function loadRequestIntakeCount(): Promise<{ source: SafePersistenceSource; count: number }> {
  const res = await loadRequestIntake();
  return { source: res.source, count: res.count };
}

export function requestIntakeRecruiterHref(): string {
  return REQUEST_INTAKE_RECRUITER_ROUTE;
}

export function requestIntakeCandidatePreviewHref(): string {
  return REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE;
}
