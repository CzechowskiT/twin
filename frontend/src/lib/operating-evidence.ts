/** Operating evidence — shared types, source badge, capability status (read-only). */

import type { TranslationKey } from "@/lib/i18n";

export type OperatingEvidenceSource = "demo" | "live" | "partial" | "unavailable";

export type CapabilityStatus = "ready" | "preview" | "blocked" | "unavailable";

export type CapabilityRow = {
  id: string;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  status: CapabilityStatus;
};

export type OperatingEvidenceSnapshot = {
  source: OperatingEvidenceSource;
  last_checked_at: string;
  status_summary_key: TranslationKey;
  status_detail_key: TranslationKey;
};

export const OPERATING_EVIDENCE_MARKERS = {
  panel: "operating-evidence-panel",
  sourceBadge: "evidence-status-badge",
  capabilityMatrix: "read-only-capability-matrix",
  lastChecked: "operating-evidence-last-checked",
  emptyState: "operating-evidence-empty-state",
  crossLinks: "operating-evidence-cross-links",
} as const;

export const OPERATING_EVIDENCE_SOURCE_KEYS: Record<OperatingEvidenceSource, TranslationKey> = {
  demo: "safePersistence.demoFallback",
  live: "safePersistence.liveApi",
  partial: "liveOperatingState.partialFallback",
  unavailable: "operatingEvidence.sourceUnavailable",
};

export const CAPABILITY_STATUS_KEYS: Record<CapabilityStatus, TranslationKey> = {
  ready: "operatingEvidence.capabilityReady",
  preview: "operatingEvidence.capabilityPreview",
  blocked: "operatingEvidence.capabilityBlocked",
  unavailable: "operatingEvidence.capabilityUnavailable",
};

export function operatingEvidenceSourceKey(source: OperatingEvidenceSource): TranslationKey {
  return OPERATING_EVIDENCE_SOURCE_KEYS[source];
}

export function capabilityStatusKey(status: CapabilityStatus): TranslationKey {
  return CAPABILITY_STATUS_KEYS[status];
}

/** Deterministic ISO timestamp for demo/preview bundles — not live clock polling. */
export function operatingEvidenceLastCheckedDemo(): string {
  return "2026-06-23T12:00:00Z";
}
