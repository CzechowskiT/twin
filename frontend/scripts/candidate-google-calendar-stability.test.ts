/**
 * Candidate Google Calendar reconnect-loop stability helpers.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateWeekEventOutcomes,
  canReconnectProvider,
  canRetryProvider,
  parseProviderIntegrationError,
  providerBadgeHealth,
  providerHasTemporaryError,
  statusSnapshotFromApi,
  type CalendarProviderStatusSnapshot,
} from "../src/lib/calendar-provider-health";
import { isCalendarIntegrationFailure, shouldClearSessionOnApiError } from "../src/lib/api";

const googleTemporary: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "temporary_error",
  message: "Google Calendar is temporarily unavailable. Try again shortly.",
  provider: "google",
  email: "a@gmail.com",
  canReconnect: false,
  canRetry: true,
};

const googleReconnect: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "reconnect_required",
  message: "Calendar token expired or revoked; reconnect Google Calendar.",
  provider: "google",
  email: "a@gmail.com",
  canReconnect: true,
  canRetry: false,
};

test("temporary_error badge and retry affordance", () => {
  assert.equal(providerBadgeHealth(googleTemporary), "temporary_error");
  assert.equal(canRetryProvider(googleTemporary), true);
  assert.equal(canReconnectProvider(googleTemporary), false);
});

test("reconnect_required keeps reconnect without disconnect copy path", () => {
  assert.equal(providerBadgeHealth(googleReconnect), "reconnect_required");
  assert.equal(canReconnectProvider(googleReconnect), true);
  assert.equal(providerHasTemporaryError(googleReconnect), false);
});

test("503 calendar integration failure does not clear session", () => {
  assert.equal(
    isCalendarIntegrationFailure(
      503,
      "Google Calendar is temporarily unavailable. Try again shortly.",
      "/api/v1/calendar/google/events",
    ),
    true,
  );
  assert.equal(
    shouldClearSessionOnApiError(
      503,
      "Google Calendar is temporarily unavailable. Try again shortly.",
      "/api/v1/calendar/google/events",
    ),
    false,
  );
});

test("parseProviderIntegrationError distinguishes temporary vs reconnect", () => {
  const temp = parseProviderIntegrationError("503 Google Calendar is temporarily unavailable. Try again shortly.");
  assert.equal(temp.temporaryError, true);
  assert.equal(temp.reconnectRequired, false);
  const reconnect = parseProviderIntegrationError("Calendar token expired or revoked; reconnect Google Calendar.");
  assert.equal(reconnect.temporaryError, false);
  assert.equal(reconnect.reconnectRequired, true);
});

test("aggregateWeekEventOutcomes tracks temporary providers separately", () => {
  const aggregate = aggregateWeekEventOutcomes(
    [
      {
        provider: "google",
        events: [],
        failed: true,
        reconnectRequired: false,
        temporaryError: true,
        message: "503 temporarily unavailable",
      },
    ],
    googleTemporary,
    null,
  );
  assert.deepEqual(aggregate.temporaryErrorProviders, ["google"]);
  assert.equal(aggregate.showReconnectPanel, false);
});

test("status API maps can_reconnect and can_retry", () => {
  const snap = statusSnapshotFromApi("google", {
    connected: true,
    health: "temporary_error",
    message: "Google Calendar is temporarily unavailable. Try again shortly.",
    can_retry: true,
    google_email: "founder@gmail.com",
  });
  assert.equal(snap.canRetry, true);
  assert.equal(snap.health, "temporary_error");
});
