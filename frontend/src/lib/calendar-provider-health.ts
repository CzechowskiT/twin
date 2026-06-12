/** Provider health + week-event loading helpers for candidate calendar dashboard. */

import type { CalendarProvider, ProviderCalendarEvent } from "@/lib/calendar-week";

/** Max wait for provider status / week events before showing retry UI (never infinite loading). */
export const CALENDAR_FETCH_TIMEOUT_MS = 9000;

/** Per-provider status bootstrap phase (maps to UI badge + card body). */
export type ProviderStatusPhase = "loading" | "ready" | "timeout" | "error";

/** Explicit provider terminal/readout for card body derivation. */
export type ProviderPhase =
  | "idle"
  | "loading_status"
  | "not_connected"
  | "connected"
  | "reconnect_required"
  | "temporary_error"
  | "timeout";

/** Week events fetch lifecycle — never blocks provider status terminal state. */
export type WeekEventsPhase =
  | "idle"
  | "loading"
  | "loaded"
  | "empty"
  | "partial_error"
  | "error"
  | "timeout"
  | "reconnect_required";

/** @deprecated Prefer WeekEventsPhase */
export type EventsPhase = WeekEventsPhase;

export function providerPhaseFromStatus(
  statusPhase: ProviderStatusPhase,
  provider: Pick<CalendarProviderStatusSnapshot, "connected" | "health">,
): ProviderPhase {
  if (statusPhase === "loading") return "loading_status";
  if (statusPhase === "timeout") return "timeout";
  if (statusPhase === "error") return "temporary_error";
  if (!provider.connected) return "not_connected";
  if (provider.health === "reconnect_required") return "reconnect_required";
  if (provider.health === "temporary_error") return "temporary_error";
  if (provider.health === "ok") return "connected";
  return "not_connected";
}

export function eventsPhaseFromFlags(flags: {
  loading: boolean;
  loadError: boolean;
  showReconnectPanel: boolean;
  showEmptyWeek: boolean;
  hasEvents: boolean;
  showPartialWarning: boolean;
  anyTemporaryFailure: boolean;
  anyTimeout: boolean;
}): WeekEventsPhase {
  if (flags.loading) return "loading";
  if (flags.showReconnectPanel) return "reconnect_required";
  if (flags.showPartialWarning) return "partial_error";
  if (flags.anyTimeout && flags.loadError && !flags.hasEvents) return "timeout";
  if (flags.loadError || flags.anyTemporaryFailure) return "error";
  if (flags.showEmptyWeek || !flags.hasEvents) return flags.hasEvents ? "loaded" : "empty";
  return "loaded";
}

/** Internal diagnostics for calendar ops — no tokens, emails, or PII. */
export type CalendarOperationDiagnostic = {
  provider: CalendarProvider;
  operation: "status" | "events_read" | "action_write" | "oauth";
  errorCode: string | null;
  httpStatus: number | null;
  isAuthFailure: boolean;
  isTemporary: boolean;
  requiresReconnect: boolean;
};

/** Production-safe calendar state transitions (no PII). Guard with NEXT_PUBLIC_DEBUG_CALENDAR=true. */
export function debugCalendarLog(event: string, detail?: Record<string, string | boolean | number>): void {
  if (typeof process === "undefined" || process.env.NEXT_PUBLIC_DEBUG_CALENDAR !== "true") return;
  if (typeof console !== "undefined") {
    console.info("[calendar-debug]", event, detail ?? {});
  }
}

export function logCalendarOperationDiagnostic(diag: CalendarOperationDiagnostic): void {
  debugCalendarLog("operation_diagnostic", {
    provider: diag.provider,
    operation: diag.operation,
    errorCode: diag.errorCode ?? "none",
    httpStatus: diag.httpStatus ?? 0,
    isAuthFailure: diag.isAuthFailure,
    isTemporary: diag.isTemporary,
    requiresReconnect: diag.requiresReconnect,
  });
}

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
  timedOut?: boolean;
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
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("abort") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("try again shortly") ||
    lower.includes('"code": 429') ||
    lower.includes('"code": 503') ||
    lower.includes('"code": 502') ||
    lower.includes('"code": 504') ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504") ||
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

export function diagnosticFromErrorMessage(
  provider: CalendarProvider,
  operation: CalendarOperationDiagnostic["operation"],
  message: string,
): CalendarOperationDiagnostic {
  const parsed = parseProviderIntegrationError(message);
  const lower = message.toLowerCase();
  const httpMatch = lower.match(/\b(401|403|428|429|502|503|504)\b/);
  return {
    provider,
    operation,
    errorCode: parsed.reconnectRequired ? "auth_failure" : parsed.temporaryError ? "temporary" : "provider_error",
    httpStatus: httpMatch ? Number(httpMatch[1]) : null,
    isAuthFailure: parsed.reconnectRequired,
    isTemporary: parsed.temporaryError,
    requiresReconnect: parsed.reconnectRequired,
  };
}

export function isMicrosoftUnsupportedAccountMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("mailboxnotenabledforrestapi") ||
    lower.includes("personal microsoft account") ||
    lower.includes("consumer account") ||
    lower.includes("not a work or school account") ||
    lower.includes("unsupported microsoft")
  );
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

/**
 * Provider card badge health: connection status from /status endpoint only.
 * Events read failures (502/timeout) must NOT downgrade a connected card to integration error.
 * Only auth failures from events read may escalate to reconnect_required on that provider.
 */
export function connectionHealthForProviderCard(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcome: ProviderWeekFetchOutcome | undefined,
): ProviderHealth | undefined {
  if (!snapshot) return undefined;
  if (!snapshot.connected) return snapshot.health;
  if (snapshot.health === "reconnect_required" || snapshot.health === "temporary_error" || snapshot.health === "error") {
    return snapshot.health;
  }
  if (outcome?.failed && outcome.reconnectRequired) return "reconnect_required";
  return snapshot.health;
}

export function connectionHealthForProvider(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcomes: ProviderWeekFetchOutcome[],
): ProviderHealth | undefined {
  if (!snapshot) return undefined;
  const outcome = outcomes.find((o) => o.provider === snapshot.provider);
  return connectionHealthForProviderCard(snapshot, outcome);
}

/** @deprecated Use connectionHealthForProviderCard — events must not set integration_error on cards. */
export function healthAfterWeekFetch(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcome: ProviderWeekFetchOutcome | undefined,
): ProviderHealth {
  return connectionHealthForProviderCard(snapshot, outcome) ?? "unknown";
}

/** @deprecated Use connectionHealthForProvider */
export function displayHealthForProvider(
  snapshot: CalendarProviderStatusSnapshot | null | undefined,
  outcomes: ProviderWeekFetchOutcome[],
): ProviderHealth | undefined {
  return connectionHealthForProvider(snapshot, outcomes);
}

export function providerStatusBootstrapComplete(
  googlePhase: ProviderStatusPhase,
  microsoftPhase: ProviderStatusPhase,
): boolean {
  return googlePhase !== "loading" && microsoftPhase !== "loading";
}

/** Provider card body must not show indefinite loading when badge is terminal not_connected. */
export function providerCardShowsConnectAction(
  phase: ProviderStatusPhase,
  provider: Pick<CalendarProviderStatusSnapshot, "connected" | "health">,
  oauthConfigured: boolean,
): boolean {
  if (phase === "loading") return false;
  if (phase === "timeout" || phase === "error") return oauthConfigured;
  if (provider.connected && provider.health === "reconnect_required") return true;
  if (provider.connected && provider.health === "temporary_error") return false;
  if (provider.connected) return false;
  return oauthConfigured;
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
