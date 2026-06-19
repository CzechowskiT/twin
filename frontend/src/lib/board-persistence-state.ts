/** Shared board persistence shipped/blocked state — planning markers only. */

import type { TranslationKey } from "@/lib/i18n";

export const BOARD_PERSISTENCE_SHIPPED_MARKER = "board-persistence-shipped-state";
export const BOARD_PERSISTENCE_BLOCKED_MARKER = "board-persistence-blocked-state";

export const BOARD_PERSISTENCE_SHIPPED_KEYS = [
  "boardPersistenceState.shippedAuditEvents",
  "boardPersistenceState.shippedWorkItems",
  "boardPersistenceState.shippedReviewQueue",
  "boardPersistenceState.shippedCompanyFeedback",
  "boardPersistenceState.shippedVisibilityPreferences",
  "boardPersistenceState.shippedExportRequests",
  "boardPersistenceState.shippedRequestIntake",
] as const satisfies readonly TranslationKey[];

export const BOARD_PERSISTENCE_BLOCKED_KEYS = [
  "boardPersistenceState.blockedEmailDraft",
  "boardPersistenceState.blockedAtsWriteback",
  "boardPersistenceState.blockedDeleteRevoke",
  "boardPersistenceState.blockedPublicLaunch",
] as const satisfies readonly TranslationKey[];
