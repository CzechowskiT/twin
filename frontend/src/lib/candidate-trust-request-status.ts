/** Candidate trust live request status — export + intake safe persistence counts. */

import { AUDIT_EVENT_API_PATH } from "@/lib/audit-event-foundation";
import { CANDIDATE_VISIBILITY_PREFERENCES_API_PATH } from "@/lib/candidate-visibility-preferences";
import { EXPORT_REQUESTS_API_PATH, type SafePersistenceSource } from "@/lib/export-requests";
import { fetchSafePersistenceList } from "@/lib/safe-persistence-api";
import { REQUEST_INTAKE_API_PATH } from "@/lib/request-intake";

export type TrustRequestStatus = {
  aggregateSource: "live" | "demo" | "partial";
  sourceKey: "safePersistence.liveApi" | "safePersistence.demoFallback" | "liveOperatingState.partialFallback";
  visibilityCount: number;
  visibilitySource: SafePersistenceSource;
  exportCount: number;
  exportSource: SafePersistenceSource;
  intakeCount: number;
  intakeSource: SafePersistenceSource;
  auditCount: number;
  auditSource: SafePersistenceSource;
};

export const CANDIDATE_TRUST_REQUEST_STATUS_MARKERS = {
  panel: "candidate-trust-request-status-panel",
  sourceBadge: "candidate-trust-request-status-source",
  visibilityCount: "candidate-trust-request-status-visibility-count",
  exportCount: "candidate-trust-request-status-export-count",
  intakeCount: "candidate-trust-request-status-intake-count",
  auditCount: "candidate-trust-request-status-audit-count",
} as const;

type ListPayload = { items?: unknown[] };

async function fetchCount(apiPath: string, demoCount: number): Promise<{ source: SafePersistenceSource; count: number }> {
  const result = await fetchSafePersistenceList<ListPayload>(apiPath, { items: [] });
  if (result.source === "live" && Array.isArray(result.data.items)) {
    return { source: "live", count: result.data.items.length };
  }
  return { source: result.source, count: demoCount };
}

export async function loadTrustRequestStatus(): Promise<TrustRequestStatus> {
  const [visibility, exports, intake, audit] = await Promise.all([
    fetchCount(CANDIDATE_VISIBILITY_PREFERENCES_API_PATH, 1),
    fetchCount(EXPORT_REQUESTS_API_PATH, 1),
    fetchCount(REQUEST_INTAKE_API_PATH, 2),
    fetchCount(AUDIT_EVENT_API_PATH, 2),
  ]);
  const sources = [visibility.source, exports.source, intake.source, audit.source];
  const liveCount = sources.filter((s) => s === "live").length;
  const aggregateSource = liveCount === 0 ? "demo" : liveCount === sources.length ? "live" : "partial";
  const sourceKey =
    aggregateSource === "live"
      ? "safePersistence.liveApi"
      : aggregateSource === "partial"
        ? "liveOperatingState.partialFallback"
        : "safePersistence.demoFallback";
  return {
    aggregateSource,
    sourceKey,
    visibilityCount: visibility.count,
    visibilitySource: visibility.source,
    exportCount: exports.count,
    exportSource: exports.source,
    intakeCount: intake.count,
    intakeSource: intake.source,
    auditCount: audit.count,
    auditSource: audit.source,
  };
}
