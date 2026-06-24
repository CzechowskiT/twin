/** Microsoft Graph busy-read capability contract — merges with calendar-readiness layer. */

import {
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  resolveCalendarReadiness,
} from "@/lib/calendar-readiness";
import {
  deriveMicrosoftFromCalendar,
  type MicrosoftCalendarReadinessRecord,
} from "@/lib/microsoft-calendar-readiness";
import {
  allBusySlotsRedacted,
  getMicrosoftBusyReadDemo,
  isAllowedMicrosoftBusyReadCapabilityStatus,
  isAllowedMicrosoftOAuthConnectionState,
  MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
  MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
  MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
  MICROSOFT_BUSY_READ_STATUS_ALLOWLIST,
  MICROSOFT_OAUTH_CONNECTION_STATE_ALLOWLIST,
  type BusySlotSource,
  type MicrosoftBusyReadCapabilityRecord,
  type MicrosoftBusyReadCapabilityStatus,
  type MicrosoftBusySlotPreview,
  type MicrosoftOAuthConnectionState,
} from "@/lib/microsoft-busy-read-demo-data";
import type { TranslationKey } from "@/lib/i18n";
import {
  MICROSOFT_BUSY_READ_ENABLED,
  MICROSOFT_OAUTH_CONNECT_GATE_ENABLED,
} from "@/lib/features";

export {
  allBusySlotsRedacted,
  getMicrosoftBusyReadDemo,
  isAllowedMicrosoftBusyReadCapabilityStatus,
  isAllowedMicrosoftOAuthConnectionState,
  MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
  MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
  MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
  MICROSOFT_BUSY_READ_STATUS_ALLOWLIST,
  MICROSOFT_OAUTH_CONNECTION_STATE_ALLOWLIST,
};
export type {
  BusySlotSource,
  MicrosoftBusyReadCapabilityRecord,
  MicrosoftBusyReadCapabilityStatus,
  MicrosoftBusySlotPreview,
  MicrosoftOAuthConnectionState,
};

export {
  MICROSOFT_BUSY_READ_ENABLED,
  MICROSOFT_OAUTH_CONNECT_GATE_ENABLED,
};
export const MICROSOFT_BUSY_READ_MARKERS = {
  contract: "microsoft-busy-read-contract",
  slotPreview: "microsoft-busy-slot-preview",
  oauthGate: "microsoft-oauth-connect-ui-gate",
  crossLink: "microsoft-busy-read-cross-link",
  liveDisabled: "microsoft-busy-read-live-disabled",
  stagingStatus: "microsoft-busy-read-staging-status",
} as const;

export const MICROSOFT_BUSY_READ_SOURCE_KEYS: Record<
  "demo" | "live_read_only" | "partial",
  TranslationKey
> = {
  demo: "safePersistence.demoFallback",
  live_read_only: "microsoftBusyRead.sourceLiveReadOnly",
  partial: "liveOperatingState.partialFallback",
};

export function microsoftBusyReadSourceKey(source: BusySlotSource): TranslationKey {
  return MICROSOFT_BUSY_READ_SOURCE_KEYS[source];
}

function mapOauthState(ms: MicrosoftCalendarReadinessRecord): MicrosoftOAuthConnectionState {
  if (ms.oauth_status === "blocked") return "blocked";
  if (ms.oauth_status === "configured" && ms.busy_read === "live_ready") {
    return "read_only_connected_live";
  }
  if (ms.busy_read === "preview_only") return "read_only_connected_demo";
  if (ms.oauth_status === "partial" || ms.oauth_status === "configured") return "connect_available";
  return "not_connected";
}

function mapBusyReadStatus(ms: MicrosoftCalendarReadinessRecord): MicrosoftBusyReadCapabilityStatus {
  if (ms.busy_read === "blocked") return "blocked";
  if (ms.busy_read === "live_ready") return "live_busy_slots_available";
  if (ms.busy_read === "preview_only") return "demo_busy_slots_available";
  if (ms.oauth_status === "partial") return "ready_for_oauth";
  return "not_enabled";
}

function fromCalendarReadiness(
  ms: MicrosoftCalendarReadinessRecord,
  slots: readonly MicrosoftBusySlotPreview[],
): MicrosoftBusyReadCapabilityRecord {
  return {
    provider: "microsoft",
    capability: "busy_read",
    candidate_id: ms.candidate_id,
    oauth_connection_state: mapOauthState(ms),
    required_scopes: MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
    forbidden_scopes: MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
    busy_read_status: mapBusyReadStatus(ms),
    busy_slot_preview: slots,
    blocked_capabilities: ms.blocked_capabilities.map((cap) => ({
      id: cap.id,
      label: cap.label,
      reason: cap.reason,
    })),
    public_health_microsoft_configured: ms.public_health_flag,
    source: ms.source,
    headline: ms.headline,
  };
}

export function resolveMicrosoftBusyRead(candidateId?: string): MicrosoftBusyReadCapabilityRecord | null {
  const trimmed = (candidateId ?? MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID).trim();
  if (!trimmed) return null;
  if (trimmed === MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID) {
    const base = resolveCalendarReadiness(CALENDAR_READINESS_DEMO_CANDIDATE_ID);
    if (base) {
      const ms = deriveMicrosoftFromCalendar(base);
      const demo = getMicrosoftBusyReadDemo();
      return fromCalendarReadiness(ms, demo.busy_slot_preview);
    }
    return getMicrosoftBusyReadDemo();
  }
  return null;
}

export function microsoftBusyReadConnectDisabled(): boolean {
  return !MICROSOFT_OAUTH_CONNECT_GATE_ENABLED;
}

export function microsoftBusyReadLiveEnabled(): boolean {
  return MICROSOFT_BUSY_READ_ENABLED;
}

export function microsoftBusyReadHasForbiddenWriteScope(scopes: readonly string[]): boolean {
  return scopes.some((scope) =>
    (MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES as readonly string[]).includes(scope),
  );
}

export function microsoftBusyReadRequiresCalendarsRead(scopes: readonly string[]): boolean {
  return scopes.includes("Calendars.Read");
}
