/** Microsoft Graph busy-read — live API wiring with demo/401/partial fallback. */

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { CalendarReadinessSource } from "@/lib/calendar-readiness-demo-data";
import {
  getMicrosoftBusyReadDemo,
  MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
  type MicrosoftBusyReadCapabilityRecord,
  type MicrosoftBusyReadCapabilityStatus,
  type MicrosoftBusySlotPreview,
  type MicrosoftOAuthConnectionState,
} from "@/lib/microsoft-busy-read-demo-data";
import { resolveMicrosoftBusyRead } from "@/lib/microsoft-busy-read";

export const MICROSOFT_BUSY_READ_READINESS_PATH = "/api/v1/calendar/microsoft/busy-read/readiness";
export const MICROSOFT_BUSY_READ_PREVIEW_PATH = "/api/v1/calendar/microsoft/busy-read/preview";

export type MicrosoftBusyReadApiSource = "live" | "demo" | "partial";

export type MicrosoftBusyReadReadinessApi = {
  provider: "microsoft";
  capability: "busy_read";
  oauth_connection_state: MicrosoftOAuthConnectionState;
  required_scopes: string[];
  forbidden_scopes: string[];
  busy_read_status: MicrosoftBusyReadCapabilityStatus;
  blocked_capabilities: MicrosoftBusyReadCapabilityRecord["blocked_capabilities"];
  public_health_microsoft_configured: boolean;
  product_gate_enabled: boolean;
  oauth_connect_gate_enabled: boolean;
  source: CalendarReadinessSource;
  headline: string;
};

export type MicrosoftBusyReadPreviewApi = {
  provider: "microsoft";
  capability: "busy_read";
  preview_mode: "demo" | "not_connected" | "live_read_only" | "partial";
  busy_slot_preview: MicrosoftBusySlotPreview[];
  source: CalendarReadinessSource;
  headline: string;
  live_graph_stub?: boolean;
};

function mapPreviewSlotSource(
  slot: MicrosoftBusySlotPreview,
  previewMode: MicrosoftBusyReadPreviewApi["preview_mode"],
): MicrosoftBusySlotPreview["source"] {
  if (slot.source !== "demo") return slot.source;
  if (previewMode === "live_read_only") return "live_read_only";
  if (previewMode === "partial") return "partial";
  return "demo";
}

export function mergeMicrosoftBusyReadApi(
  readiness: MicrosoftBusyReadReadinessApi,
  preview: MicrosoftBusyReadPreviewApi,
  candidateId: string,
): MicrosoftBusyReadCapabilityRecord {
  const slots = preview.busy_slot_preview.map((slot) => ({
    ...slot,
    source: mapPreviewSlotSource(slot, preview.preview_mode),
    event_subject_redacted: true as const,
  }));

  const source: CalendarReadinessSource =
    readiness.source === "live" || preview.source === "live"
      ? "live"
      : readiness.source === "partial" || preview.source === "partial"
        ? "partial"
        : "demo";

  return {
    provider: "microsoft",
    capability: "busy_read",
    candidate_id: candidateId,
    oauth_connection_state: readiness.oauth_connection_state,
    required_scopes: readiness.required_scopes,
    forbidden_scopes: readiness.forbidden_scopes,
    busy_read_status: readiness.busy_read_status,
    busy_slot_preview: slots,
    blocked_capabilities: readiness.blocked_capabilities,
    public_health_microsoft_configured: readiness.public_health_microsoft_configured,
    source,
    headline: readiness.headline || preview.headline,
  };
}

export async function fetchMicrosoftBusyReadBundle(
  candidateId: string = MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
  token?: string | null,
): Promise<{ record: MicrosoftBusyReadCapabilityRecord; apiSource: MicrosoftBusyReadApiSource }> {
  const resolvedToken = token ?? getToken();
  const fetchOpts = { preserveSessionOnUnauthorized: true as const };

  const [readiness, preview] = await Promise.all([
    apiFetch<MicrosoftBusyReadReadinessApi>(MICROSOFT_BUSY_READ_READINESS_PATH, fetchOpts, resolvedToken),
    apiFetch<MicrosoftBusyReadPreviewApi>(MICROSOFT_BUSY_READ_PREVIEW_PATH, fetchOpts, resolvedToken),
  ]);

  const record = mergeMicrosoftBusyReadApi(readiness, preview, candidateId);
  const apiSource: MicrosoftBusyReadApiSource =
    record.source === "live" ? "live" : record.source === "partial" ? "partial" : "demo";

  return { record, apiSource };
}

export function resolveMicrosoftBusyReadWithFallback(
  candidateId?: string,
): MicrosoftBusyReadCapabilityRecord {
  return resolveMicrosoftBusyRead(candidateId) ?? getMicrosoftBusyReadDemo();
}
