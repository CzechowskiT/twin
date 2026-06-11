/**
 * Google Calendar reconnect-loop stability: transient vs reconnect, session preservation.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateWeekEventOutcomes,
  parseProviderIntegrationError,
  providerBadgeHealth,
  statusSnapshotFromApi,
} from "../src/lib/calendar-provider-health";
import { isCalendarIntegrationFailure, shouldClearSessionOnApiError } from "../src/lib/api";

test("503 calendar events → temporary_error, not reconnect", () => {
  const parsed = parseProviderIntegrationError("503 Calendar provider temporarily unavailable; try again shortly.");
  assert.equal(parsed.temporaryError, true);
  assert.equal(parsed.reconnectRequired, false);
});

test("invalid_grant message → reconnect_required", () => {
  const parsed = parseProviderIntegrationError("Calendar token expired or revoked; reconnect Google Calendar.");
  assert.equal(parsed.reconnectRequired, true);
  assert.equal(parsed.temporaryError, false);
});

test("temporary_error badge without forcing reconnect panel when other provider loaded", () => {
  const googleTemp = statusSnapshotFromApi("google", {
    connected: true,
    health: "temporary_error",
    message: "try again",
    google_email: "a@gmail.com",
  });
  assert.equal(providerBadgeHealth(googleTemp), "temporary_error");
  const aggregate = aggregateWeekEventOutcomes(
    [
      {
        provider: "microsoft",
        events: [{ id: "1", title: "X", start_iso: "2026-06-10T09:00:00Z", end_iso: "2026-06-10T10:00:00Z", all_day: false, html_link: null, source: "provider" }],
        failed: false,
        reconnectRequired: false,
        temporaryError: false,
        message: null,
      },
      {
        provider: "google",
        events: [],
        failed: true,
        reconnectRequired: false,
        temporaryError: true,
        message: "503 temporarily unavailable",
      },
    ],
    googleTemp,
    statusSnapshotFromApi("microsoft", { connected: true, health: "ok", microsoft_email: "b@outlook.com" }),
  );
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.showPartialWarning, true);
  assert.equal(aggregate.anyProviderLoaded, true);
});

test("428 and 503 on calendar routes never clear TWIN session", () => {
  assert.equal(isCalendarIntegrationFailure(428, "reconnect", "/api/v1/calendar/google/events"), true);
  assert.equal(isCalendarIntegrationFailure(503, "temporarily unavailable", "/api/v1/calendar/google/events"), true);
  assert.equal(shouldClearSessionOnApiError(428, "reconnect", "/api/v1/calendar/google/events"), false);
  assert.equal(shouldClearSessionOnApiError(503, "temporarily unavailable", "/api/v1/calendar/google/events"), false);
});

test("status API maps temporary_error health from backend", () => {
  const snap = statusSnapshotFromApi("google", {
    connected: true,
    health: "temporary_error",
    can_retry: true,
    google_email: "a@gmail.com",
  });
  assert.equal(snap.health, "temporary_error");
  assert.equal(snap.canRetry, true);
});
