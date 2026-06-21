/** Candidate trust live request status — export + intake safe persistence counts. */

import { EXPORT_REQUESTS_API_PATH, type SafePersistenceSource } from "@/lib/export-requests";
import { fetchSafePersistenceList } from "@/lib/safe-persistence-api";
import { REQUEST_INTAKE_API_PATH } from "@/lib/request-intake";

export type TrustRequestStatus = {
  aggregateSource: "live" | "demo" | "partial";
  sourceKey: "safePersistence.liveApi" | "safePersistence.demoFallback" | "liveOperatingState.partialFallback";
  exportCount: number;
  exportSource: SafePersistenceSource;
  intakeCount: number;
  intakeSource: SafePersistenceSource;
};

export const CANDIDATE_TRUST_REQUEST_STATUS_MARKERS = {
  panel: "candidate-trust-request-status-panel",
  sourceBadge: "candidate-trust-request-status-source",
  exportCount: "candidate-trust-request-status-export-count",
  intakeCount: "candidate-trust-request-status-intake-count",
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
  const [exports, intake] = await Promise.all([
    fetchCount(EXPORT_REQUESTS_API_PATH, 1),
    fetchCount(REQUEST_INTAKE_API_PATH, 2),
  ]);
  const liveCount = [exports.source, intake.source].filter((s) => s === "live").length;
  const aggregateSource = liveCount === 0 ? "demo" : liveCount === 2 ? "live" : "partial";
  const sourceKey =
    aggregateSource === "live"
      ? "safePersistence.liveApi"
      : aggregateSource === "partial"
        ? "liveOperatingState.partialFallback"
        : "safePersistence.demoFallback";
  return {
    aggregateSource,
    sourceKey,
    exportCount: exports.count,
    exportSource: exports.source,
    intakeCount: intake.count,
    intakeSource: intake.source,
  };
}
