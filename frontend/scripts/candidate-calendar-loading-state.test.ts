/**
 * Candidate calendar loading state: per-provider timeout, no infinite loading, session safe.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CALENDAR_FETCH_TIMEOUT_MS,
  aggregateWeekEventOutcomes,
  parseProviderIntegrationError,
  providerCardShowsConnectAction,
  providerStatusBootstrapComplete,
} from "../src/lib/calendar-provider-health";
import { isFetchTimeoutError, shouldClearSessionOnApiError } from "../src/lib/api";
import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "src/app/dashboard/calendar/page.tsx"), "utf8");
const panelSrc = readFileSync(join(root, "src/components/calendar/calendar-connections-panel.tsx"), "utf8");
const apiSrc = readFileSync(join(root, "src/lib/api.ts"), "utf8");

test("status fetch timeout constant is within 8–10 seconds", () => {
  assert.ok(CALENDAR_FETCH_TIMEOUT_MS >= 8000);
  assert.ok(CALENDAR_FETCH_TIMEOUT_MS <= 10000);
});

test("not-connected ready state shows connect action, not indefinite loading body", () => {
  assert.equal(
    providerCardShowsConnectAction("ready", { connected: false, health: "unknown" }, true),
    true,
  );
  assert.equal(
    providerCardShowsConnectAction("loading", { connected: false, health: "unknown" }, true),
    false,
  );
  assert.match(panelSrc, /statusPhase === "loading"/);
  assert.match(panelSrc, /statusPhase === "ready"/);
  assert.doesNotMatch(panelSrc, /loading \?[\s\S]*calendarConnectionsLoading[\s\S]*: provider\.connected/);
});

test("status timeout maps to temporary_error + retry UI hooks", () => {
  assert.equal(isFetchTimeoutError(new Error("Request timed out")), true);
  const parsed = parseProviderIntegrationError("Request timed out");
  assert.equal(parsed.temporaryError, true);
  assert.equal(parsed.reconnectRequired, false);
  assert.match(panelSrc, /calendarStatusTimeout/);
  assert.match(panelSrc, /dashboard\.calendarRetry/);
});

test("Google status timeout does not block Microsoft bootstrap", () => {
  assert.match(pageSrc, /loadGoogleStatus\(\)/);
  assert.match(pageSrc, /loadMicrosoftStatus\(\)/);
  assert.match(pageSrc, /Promise\.all\([\s\S]*loadGoogleStatus[\s\S]*loadMicrosoftStatus/);
  assert.equal(providerStatusBootstrapComplete("timeout", "ready"), true);
  assert.equal(providerStatusBootstrapComplete("loading", "ready"), false);
});

test("events timeout does not force reconnect banner", () => {
  const aggregate = aggregateWeekEventOutcomes(
    [
      {
        provider: "google",
        events: [],
        failed: true,
        reconnectRequired: false,
        temporaryError: true,
        message: "Request timed out",
      },
    ],
    {
      connected: true,
      health: "ok",
      message: null,
      provider: "google",
      email: "a@gmail.com",
    },
    null,
  );
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.allHealthyProvidersFailed, true);
});

test("reconnect_required panel uses reconnect label, not disconnect-first", () => {
  assert.match(panelSrc, /provider\.health === "reconnect_required"[\s\S]*dashboard\.calendarReconnect/);
  assert.match(panelSrc, /provider\.health === "reconnect_required"[\s\S]*onClick=\{onConnect\}/);
});

test("calendar provider failures never clear TWIN session", () => {
  assert.match(pageSrc, /preserveSessionOnUnauthorized:\s*true/);
  assert.equal(
    shouldClearSessionOnApiError(503, "temporarily unavailable", "/api/v1/calendar/google/status", {
      preserveSessionOnUnauthorized: true,
    }),
    false,
  );
});

test("calendar_connected=1 refetch guarded against infinite loop", () => {
  assert.match(pageSrc, /calendarConnectedQueryRef/);
  assert.match(pageSrc, /calendarConnectedQueryRef\.current === queryKey/);
});

test("apiFetch supports timeoutMs via AbortController", () => {
  assert.match(apiSrc, /timeoutMs/);
  assert.match(apiSrc, /isFetchTimeoutError/);
});

test("PL copy for terminal loading / timeout states", () => {
  assert.equal(pl.dashboard.calendarStatusLoading, "Ładowanie statusu…");
  assert.equal(pl.dashboard.calendarNotConnected, "Nie połączono");
  assert.equal(pl.dashboard.calendarConnectGoogle, "Połącz Google Calendar");
  assert.equal(pl.dashboard.calendarConnectMicrosoft365, "Połącz Microsoft 365");
  assert.equal(pl.dashboard.calendarReconnect, "Połącz ponownie");
  assert.equal(pl.dashboard.calendarRetry, "Spróbuj ponownie");
  assert.equal(pl.dashboard.calendarStatusTimeout, "Nie udało się pobrać statusu kalendarza");
  assert.match(pl.dashboard.calendarSessionSafeHint, /TWIN nie wyloguje/);
});
