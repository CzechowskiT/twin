/** Provider health + week-event loading helpers for candidate calendar dashboard. */

import type { CalendarProvider, ProviderCalendarEvent } from "@/lib/calendar-week";

export type ProviderHealth = "ok" | "reconnect_required" | "temporary_error" | "error" | "unknown";

export type CalendarProviderStatusSnapshot = {
  connected: boolean;
  health: ProviderHealth;
  message: string | null;
  provider: CalendarProvider;
  email: string | null;
  canReconnect?: boolean;
  canRetry?: boolean;
};

export type ProviderWeekFetchOutcome = {
  provider: CalendarProvider;
  events: ProviderCalendarEvent[];
  failed: boolean;
  reconnectRequired: boolean;
  temporaryError: boolean;
  message: string | null;
};

export type WeekEventsAggregate = {
  events: ProviderCalendarEvent[];
  failedProviders: CalendarProvider[];
  reconnectProviders: CalendarProvider[];
  healthyProviders: CalendarProvider[];
  allHealthyProvidersFailed: boolean;
  anyProviderLoaded: boolean;
  showEmptyWeek: boolean;
  showReconnectPanel: boolean;
  showPartialWarning: boolean;
};

export function isProviderHealthy(status: CalendarProviderStatusSnapshot | null | undefined): boolean {
  return Boolean(status?.connected && status.health === "ok");
}

export function providerNeedsReconnect(status: CalendarProviderStatusSnapshot | null | undefined): boolean {
  return Boolean(status?.connected && status.health === "reconnect_required");
}

export function providerBadgeHealth(
  status: CalendarProviderStatusSnapshot | null | undefined,
): "connected" | "reconnect_required" | "temporary_error" | "not_connected" | "integration_error" {
  if (!status?.connected) return "not_connected";
  if (status.health === "ok") return "connected";
  if (status.health === "reconnect_required") return "reconnect_required";
  if (status.health === "temporary_error") return "temporary_error";
  if (status.health === "error") return "integration_error";
  return "not_connected";
}

export function healthyProvidersToFetch(
  google: CalendarProviderStatusSnapshot | null | undefined,
  microsoft: CalendarProviderStatusSnapshot | null | undefined,
): CalendarProvider[] {
  const out: CalendarProvider[] = [];
  if (isProviderHealthy(google)) out.push("google");
  if (isProviderHealthy(microsoft)) out.push("microsoft");
  return out;
}

export function hasAnyConnectedProvider(
  google: CalendarProviderStatusSnapshot | null | undefined,
  microsoft: CalendarProviderStatusSnapshot | null | undefined,
): boolean {
  return Boolean(google?.connected || microsoft?.connected);
}

export function hasAnyHealthyProvider(
  google: CalendarProviderStatusSnapshot | null | undefined,
  microsoft: CalendarProviderStatusSnapshot | null | undefined,
): boolean {
  return isProviderHealthy(google) || isProviderHealthy(microsoft);
}

export function parseProviderIntegrationError(message: string): {
  reconnectRequired: boolean;
  temporaryError: boolean;
  failed: boolean;
} {
  const lower = message.trim().toLowerCase();
  const temporaryError =
    lower.includes("temporarily unavailable") ||
    lower.includes("try again shortly") ||
    lower.includes('"code": 429') ||
    lower.includes('"code": 503') ||
    lower.includes("503") ||
    lower.includes("429");
  const reconnectRequired =
    !temporaryError &&
    (lower.includes("reconnect google calendar") ||
      lower.includes("reconnect microsoft calendar") ||
      lower.includes("calendar token expired") ||
      lower.includes("microsoft token expired") ||
      lower.includes("insufficient") ||
      lower.includes("invalid_grant") ||
      lower.includes("invalid_credentials") ||
      (lower.includes("calendar list events failed") && (lower.includes("401") || lower.includes("403"))) ||
      (lower.includes("microsoft list events failed") && (lower.includes("401") || lower.includes("403"))));
  return { reconnectRequired, temporaryError, failed: true };
}

/** Connected row exists but token probe or events fetch is not usable. */
export function providerNeedsAttention(
  status: CalendarProviderStatusSnapshot | null | undefined,
): boolean {
  if (!status?.connected) return false;
  return (
    status.health === "reconnect_required" ||
    status.health === "temporary_error" ||
    status.health === "error" ||
    status.health === "unknown"
  );
}

export function aggregateWeekEventOutcomes(
  outcomes: ProviderWeekFetchOutcome[],
  google: CalendarProviderStatusSnapshot | null | undefined,
  microsoft: CalendarProviderStatusSnapshot | null | undefined,
): WeekEventsAggregate {
  const events: ProviderCalendarEvent[] = [];
  const failedProviders: CalendarProvider[] = [];
  const reconnectProviders: CalendarProvider[] = [];
  const healthyProviders = healthyProvidersToFetch(google, microsoft);

  for (const outcome of outcomes) {
    if (!outcome.failed) {
      events.push(...outcome.events);
      continue;
    }
    failedProviders.push(outcome.provider);
    if (outcome.reconnectRequired) reconnectProviders.push(outcome.provider);
  }

  for (const provider of healthyProviders) {
    if (!outcomes.some((o) => o.provider === provider)) {
      failedProviders.push(provider);
    }
  }

  const anyProviderLoaded = outcomes.some((o) => !o.failed);
  const allHealthyProvidersFailed = healthyProviders.length > 0 && !anyProviderLoaded;
  const otherProviderStale =
    (isProviderHealthy(google) && providerNeedsReconnect(microsoft)) ||
    (isProviderHealthy(microsoft) && providerNeedsReconnect(google));
  const needsGuidance = (snap: CalendarProviderStatusSnapshot | null | undefined) =>
    Boolean(snap?.connected && snap.health !== "temporary_error" && snap.health !== "ok" && providerNeedsAttention(snap));
  // Full reconnect banner only for auth/reconnect — not generic 502/503 event failures.
  const showReconnectPanel =
    !anyProviderLoaded &&
    (reconnectProviders.length > 0 ||
      providerNeedsReconnect(google) ||
      providerNeedsReconnect(microsoft) ||
      needsGuidance(google) ||
      needsGuidance(microsoft));
  const showPartialWarning =
    anyProviderLoaded && (failedProviders.length > 0 || otherProviderStale);
  const showEmptyWeek = anyProviderLoaded && events.length === 0 && failedProviders.length === 0;

  return {
    events,
    failedProviders,
    reconnectProviders,
    healthyProviders,
    allHealthyProvidersFailed,
    anyProviderLoaded,
    showEmptyWeek,
    showReconnectPanel,
    showPartialWarning,
  };
}

export function preferredActiveProvider(
  google: CalendarProviderStatusSnapshot | null | undefined,
  microsoft: CalendarProviderStatusSnapshot | null | undefined,
): CalendarProvider | null {
  if (isProviderHealthy(google)) return "google";
  if (isProviderHealthy(microsoft)) return "microsoft";
  if (google?.connected) return "google";
  if (microsoft?.connected) return "microsoft";
  return null;
}

/** Prefer week events fetch outcome over stale status probe for badge/UI consistency. */
export function healthAfterWeekFetch(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcome: ProviderWeekFetchOutcome | undefined,
): ProviderHealth {
  if (!snapshot?.connected) return snapshot?.health ?? "unknown";
  if (outcome?.failed) {
    if (outcome.reconnectRequired) return "reconnect_required";
    if (outcome.temporaryError) return "temporary_error";
    return "error";
  }
  return snapshot.health;
}

export function displayHealthForProvider(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcomes: ProviderWeekFetchOutcome[],
): ProviderHealth | undefined {
  if (!snapshot) return undefined;
  const outcome = outcomes.find((o) => o.provider === snapshot.provider);
  return healthAfterWeekFetch(snapshot, outcome);
}

export function statusSnapshotFromApi(
  provider: CalendarProvider,
  raw: {
    connected: boolean;
    health?: string;
    message?: string | null;
    google_email?: string | null;
    microsoft_email?: string | null;
    can_reconnect?: boolean;
    can_retry?: boolean;
  },
): CalendarProviderStatusSnapshot {
  const healthRaw = raw.health ?? "unknown";
  const health: ProviderHealth =
    healthRaw === "ok" ||
    healthRaw === "reconnect_required" ||
    healthRaw === "temporary_error" ||
    healthRaw === "error" ||
    healthRaw === "unknown"
      ? healthRaw
      : "unknown";
  return {
    connected: raw.connected,
    health,
    message: raw.message ?? null,
    provider,
    email: provider === "google" ? raw.google_email ?? null : raw.microsoft_email ?? null,
    canReconnect: raw.can_reconnect,
    canRetry: raw.can_retry,
  };
}
