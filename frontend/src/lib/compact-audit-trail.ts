/** Compact audit trail — append-only safe persistence preview. */

import { getAuditEventFoundationDemo, type AuditEventSample } from "@/lib/audit-event-foundation-demo-data";
import { AUDIT_EVENT_API_PATH } from "@/lib/audit-event-foundation";
import { fetchSafePersistenceList, type SafePersistenceSource } from "@/lib/safe-persistence-api";

export const COMPACT_AUDIT_TRAIL_MARKERS = {
  widget: "compact-audit-trail-widget",
  count: "compact-audit-trail-count",
  source: "compact-audit-trail-source",
  records: "compact-audit-trail-records",
  recordRow: "compact-audit-trail-record-row",
} as const;

export const COMPACT_AUDIT_TRAIL_MAX_RECORDS = 5;

export type CompactAuditRecord = Pick<
  AuditEventSample,
  "event_type" | "actor_persona" | "target_type" | "target_id" | "created_at"
>;

type AuditListPayload = { items?: AuditEventSample[] };

function normalizeRecord(raw: Record<string, unknown>): CompactAuditRecord | null {
  const event_type = typeof raw.event_type === "string" ? raw.event_type : null;
  const actor_persona = typeof raw.actor_persona === "string" ? raw.actor_persona : null;
  const target_type = typeof raw.target_type === "string" ? raw.target_type : null;
  const target_id = typeof raw.target_id === "string" ? raw.target_id : null;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  if (!event_type || !actor_persona || !target_type || !target_id || !created_at) return null;
  return { event_type, actor_persona, target_type, target_id, created_at };
}

function demoRecords(): CompactAuditRecord[] {
  return getAuditEventFoundationDemo()
    .sample_events.slice(0, COMPACT_AUDIT_TRAIL_MAX_RECORDS)
    .map(({ event_type, actor_persona, target_type, target_id, created_at }) => ({
      event_type,
      actor_persona,
      target_type,
      target_id,
      created_at,
    }));
}

export async function loadAuditEventCount(): Promise<{
  source: SafePersistenceSource;
  count: number;
}> {
  const result = await loadAuditEventRecords();
  return { source: result.source, count: result.count };
}

export async function loadAuditEventRecords(): Promise<{
  source: SafePersistenceSource;
  count: number;
  records: CompactAuditRecord[];
}> {
  const result = await fetchSafePersistenceList<AuditListPayload>(AUDIT_EVENT_API_PATH, { items: [] });
  if (result.source === "live" && Array.isArray(result.data.items)) {
    const records = result.data.items
      .map((item) => normalizeRecord(item as unknown as Record<string, unknown>))
      .filter((row): row is CompactAuditRecord => row !== null)
      .slice(0, COMPACT_AUDIT_TRAIL_MAX_RECORDS);
    return { source: "live", count: result.data.items.length, records };
  }
  const records = demoRecords();
  return { source: result.source, count: records.length, records };
}
