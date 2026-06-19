/** Work items — notes and tasks safe persistence. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getWorkItemsDemo,
  type WorkItemRecord,
  type WorkItemRow,
} from "@/lib/work-items-demo-data";
import { fetchSafePersistenceList } from "@/lib/safe-persistence-api";

export type SafePersistenceSource = "live" | "demo";

export { LAUNCH_STANCE };
export type { WorkItemRecord, WorkItemRow };

export const WORK_ITEMS_RECRUITER_ROUTE = "/recruiter/work-items";
export const WORK_ITEMS_COMPANY_ROUTE = "/company/work-items";
export const WORK_ITEMS_API_PATH = "/api/v1/work-items";

export const WORK_ITEMS_PAGE_MARKER = "work-items-page";

export const WORK_ITEMS_MARKERS = {
  page: WORK_ITEMS_PAGE_MARKER,
  header: "work-items-header",
  list: "work-items-list",
  createForm: "work-items-create-form",
  statusPreview: "work-items-status-preview",
  auditTrail: "work-items-audit-trail",
  boundary: "work-items-boundary",
  pilotBadge: "work-items-pilot-badge",
} as const;

export const WORK_ITEMS_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /saved successfully/i,
  /persisted successfully/i,
  /submitted successfully/i,
  /ATS sync/i,
];

export function workItemsRecruiterHref(): string {
  return WORK_ITEMS_RECRUITER_ROUTE;
}

export function workItemsCompanyHref(): string {
  return WORK_ITEMS_COMPANY_ROUTE;
}

export function resolveWorkItems(scope: "recruiter" | "company"): WorkItemRecord {
  return getWorkItemsDemo(scope);
}

type ApiWorkItem = {
  id: number;
  item_type: string;
  title: string;
  description?: string | null;
  status: string;
  owner_label?: string | null;
};

type ApiWorkItemsResponse = { items: ApiWorkItem[] };

function mapApiItems(items: ApiWorkItem[]): WorkItemRow[] {
  return items.map((row) => ({
    id: String(row.id),
    item_type: row.item_type as WorkItemRow["item_type"],
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    owner_label: row.owner_label ?? "—",
    backend_write: true as const,
    external_side_effect: false as const,
  }));
}

export async function loadWorkItems(scope: "recruiter" | "company"): Promise<{
  source: SafePersistenceSource;
  record: WorkItemRecord;
}> {
  const demo = getWorkItemsDemo(scope);
  const query = `?persona_scope=${scope}`;
  const result = await fetchSafePersistenceList<ApiWorkItemsResponse>(
    `${WORK_ITEMS_API_PATH}${query}`,
    { items: demo.items as unknown as ApiWorkItem[] },
  );
  if (result.source === "live" && result.data.items.length > 0) {
    return {
      source: "live",
      record: { ...demo, items: mapApiItems(result.data.items) },
    };
  }
  return { source: result.source, record: demo };
}
