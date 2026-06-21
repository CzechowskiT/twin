/** Compact audit trail count — append-only safe persistence preview. */

import { AUDIT_EVENT_API_PATH } from "@/lib/audit-event-foundation";
import { fetchSafePersistenceList, type SafePersistenceSource } from "@/lib/safe-persistence-api";

export const COMPACT_AUDIT_TRAIL_MARKERS = {
  widget: "compact-audit-trail-widget",
  count: "compact-audit-trail-count",
  source: "compact-audit-trail-source",
} as const;

export async function loadAuditEventCount(): Promise<{
  source: SafePersistenceSource;
  count: number;
}> {
  const result = await fetchSafePersistenceList<{ items?: unknown[] }>(AUDIT_EVENT_API_PATH, { items: [] });
  if (result.source === "live" && Array.isArray(result.data.items)) {
    return { source: "live", count: result.data.items.length };
  }
  return { source: result.source, count: 2 };
}
