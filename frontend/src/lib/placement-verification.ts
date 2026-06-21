/** Placement verification domain — shared types, demo resolver, source badge. */

import {
  getPlacementVerificationDemo,
  isAllowedPlacementStatus,
  isAllowedVerificationStage,
  PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
  PLACEMENT_VERIFICATION_DEMO_ID,
  PLACEMENT_STATUS_ALLOWLIST,
  VERIFICATION_STAGE_ALLOWLIST,
  type PlacementVerificationRecord,
  type PlacementVerificationSource,
} from "@/lib/placement-verification-demo-data";
import type { TranslationKey } from "@/lib/i18n";

export {
  getPlacementVerificationDemo,
  isAllowedPlacementStatus,
  isAllowedVerificationStage,
  PLACEMENT_STATUS_ALLOWLIST,
  VERIFICATION_STAGE_ALLOWLIST,
  PLACEMENT_VERIFICATION_DEMO_ID,
  PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
};
export type { PlacementVerificationRecord, PlacementVerificationSource };

export const PLACEMENT_VERIFICATION_SOURCE_KEYS: Record<
  PlacementVerificationSource,
  TranslationKey
> = {
  demo: "safePersistence.demoFallback",
  live: "safePersistence.liveApi",
  partial: "liveOperatingState.partialFallback",
};

export function placementVerificationSourceKey(
  source: PlacementVerificationSource,
): TranslationKey {
  return PLACEMENT_VERIFICATION_SOURCE_KEYS[source];
}

export function resolvePlacementVerification(
  placementId?: string,
): PlacementVerificationRecord | null {
  const trimmed = (placementId ?? PLACEMENT_VERIFICATION_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === PLACEMENT_VERIFICATION_DEMO_ID) {
    return getPlacementVerificationDemo();
  }
  return null;
}

export function isPlacementVerificationDemoId(placementId: string): boolean {
  return placementId.trim() === PLACEMENT_VERIFICATION_DEMO_ID;
}

export function missingExternalConfirmation(record: PlacementVerificationRecord): boolean {
  return record.evidence_items.some(
    (item) =>
      (item.kind === "work_email_hint" || item.kind === "attestation_link") &&
      item.status === "missing",
  );
}

export function hasHumanReviewRisk(record: PlacementVerificationRecord): boolean {
  return (
    record.verification_stage === "human_review" ||
    record.risk_flags.some((flag) => flag.severity === "critical")
  );
}
