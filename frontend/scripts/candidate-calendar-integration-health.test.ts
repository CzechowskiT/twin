/**
 * Candidate calendar provider health: badges, partial failure, empty week, session preservation.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateWeekEventOutcomes,
  connectionHealthForProvider,
  displayHealthForProvider,
  hasAnyHealthyProvider,
  healthAfterWeekFetch,
  healthyProvidersToFetch,
  isProviderHealthy,
  parseProviderIntegrationError,
  preferredActiveProvider,
  providerBadgeHealth,
  providerNeedsAttention,
  providerNeedsReconnect,
  statusSnapshotFromApi,
  type CalendarProviderStatusSnapshot,
} from "../src/lib/calendar-provider-health";
import { isCalendarIntegrationFailure, shouldClearSessionOnApiError } from "../src/lib/api";

const googleOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "google",
  email: "a@gmail.com",
};

const googleReconnect: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "reconnect_required",
  message: "Calendar token expired or revoked; reconnect Google Calendar.",
  provider: "google",
  email: "a@gmail.com",
};

const microsoftOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "microsoft",
  email: "b@outlook.com",
};

const microsoftReconnect: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "reconnect_required",
  message: "Microsoft token expired or revoked; reconnect Microsoft Calendar.",
  provider: "microsoft",
  email: "b@outlook.com",
};

test("scenario 1: Google ok + Microsoft ok → both healthy, calendar can load", () => {
  assert.equal(isProviderHealthy(googleOk), true);
  assert.equal(isProviderHealthy(microsoftOk), true);
  assert.deepEqual(healthyProvidersToFetch(googleOk, microsoftOk), ["google", "microsoft"]);
  assert.equal(providerBadgeHealth(googleOk), "connected");
  assert.equal(providerBadgeHealth(microsoftOk), "connected");
  const aggregate = aggregateWeekEventOutcomes(
    [
      { provider: "google", events: [{ id: "1", title: "A", start_iso: "2026-06-10T09:00:00Z", end_iso: "2026-06-10T10:00:00Z", all_day: false, html_link: null, source: "provider" }], failed: false, reconnectRequired: false, temporaryError: false, message: null },
      { provider: "microsoft", events: [], failed: false, reconnectRequired: false, temporaryError: false, message: null },
    ],
    googleOk,
    microsoftOk,
  );
  assert.equal(aggregate.showPartialWarning, false);
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.anyProviderLoaded, true);
});

test("scenario 2: Google reconnect_required + Microsoft ok → partial path, no full fail", () => {
  assert.equal(hasAnyHealthyProvider(googleReconnect, microsoftOk), true);
  assert.deepEqual(healthyProvidersToFetch(googleReconnect, microsoftOk), ["microsoft"]);
  assert.equal(providerBadgeHealth(googleReconnect), "reconnect_required");
  const aggregate = aggregateWeekEventOutcomes(
    [{ provider: "microsoft", events: [], failed: false, reconnectRequired: false, temporaryError: false, message: null }],
    googleReconnect,
    microsoftOk,
  );
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.showEmptyWeek, true);
  assert.equal(providerNeedsReconnect(googleReconnect), true);
});

test("scenario 3: Google ok + Microsoft reconnect_required → partial warning", () => {
  const aggregate = aggregateWeekEventOutcomes(
    [{ provider: "google", events: [], failed: false, reconnectRequired: false, temporaryError: false, message: null }],
    googleOk,
    microsoftReconnect,
  );
  assert.equal(aggregate.showPartialWarning, true);
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.anyProviderLoaded, true);
});

test("scenario 4: both reconnect_required → page-level reconnect guidance", () => {
  const aggregate = aggregateWeekEventOutcomes([], googleReconnect, microsoftReconnect);
  assert.equal(aggregate.showReconnectPanel, true);
  assert.equal(aggregate.anyProviderLoaded, false);
  assert.equal(healthyProvidersToFetch(googleReconnect, microsoftReconnect).length, 0);
});

test("scenario 5: both ok but no events → empty week, not error", () => {
  const aggregate = aggregateWeekEventOutcomes(
    [
      { provider: "google", events: [], failed: false, reconnectRequired: false, temporaryError: false, message: null },
      { provider: "microsoft", events: [], failed: false, reconnectRequired: false, temporaryError: false, message: null },
    ],
    googleOk,
    microsoftOk,
  );
  assert.equal(aggregate.showEmptyWeek, true);
  assert.equal(aggregate.allHealthyProvidersFailed, false);
  assert.equal(aggregate.showReconnectPanel, false);
});

test("scenario 6: calendar event fetch integration error → token not cleared", () => {
  assert.equal(
    isCalendarIntegrationFailure(
      428,
      "Calendar token expired or revoked; reconnect Google Calendar.",
      "/api/v1/calendar/google/events",
    ),
    true,
  );
  assert.equal(
    shouldClearSessionOnApiError(
      428,
      "Calendar token expired or revoked; reconnect Google Calendar.",
      "/api/v1/calendar/google/events",
    ),
    false,
  );
  const parsed = parseProviderIntegrationError("Calendar token expired or revoked; reconnect Google Calendar.");
  assert.equal(parsed.reconnectRequired, true);
});

test("scenario 7: generic app auth invalid → still redirects to login", () => {
  assert.equal(shouldClearSessionOnApiError(401, "Invalid token", "/api/v1/auth/me"), true);
  assert.equal(shouldClearSessionOnApiError(401, "Inactive user", "/api/v1/calendar/me/interviews"), true);
});

test("scenario 8: healthy provider events fail with 502 → week error only, card stays connected", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      message: "502 Calendar list events failed",
    },
  ];
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, null);
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.allHealthyProvidersFailed, true);
  assert.equal(connectionHealthForProvider(googleOk, outcomes), "ok");
  assert.equal(providerBadgeHealth({ ...googleOk, health: "ok" }), "connected");
});

test("scenario 10: status ok but events reconnect → panel and merged badge health", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: true,
      temporaryError: false,
      message: "428 reconnect Google Calendar",
    },
    {
      provider: "microsoft" as const,
      events: [],
      failed: true,
      reconnectRequired: true,
      temporaryError: false,
      message: "428 reconnect Microsoft Calendar",
    },
  ];
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
  assert.equal(aggregate.showReconnectPanel, true);
  assert.equal(healthAfterWeekFetch(googleOk, outcomes[0]), "reconnect_required");
  assert.equal(
    providerBadgeHealth({ ...googleOk, health: displayHealthForProvider(googleOk, outcomes) ?? "ok" }),
    "reconnect_required",
  );
});

test("scenario 9: connected unknown health → attention + reconnect guidance", () => {
  const googleUnknown: CalendarProviderStatusSnapshot = {
    connected: true,
    health: "unknown",
    message: null,
    provider: "google",
    email: "a@gmail.com",
  };
  assert.equal(providerNeedsAttention(googleUnknown), true);
  assert.equal(providerBadgeHealth(googleUnknown), "not_connected");
  const aggregate = aggregateWeekEventOutcomes([], googleUnknown, null);
  assert.equal(aggregate.showReconnectPanel, true);
});

test("parseProviderIntegrationError detects upstream auth failures in list events", () => {
  const parsed = parseProviderIntegrationError('401 {"error":"invalid_grant"} Calendar list events failed');
  assert.equal(parsed.reconnectRequired, true);
});

test("status API maps health fields for frontend badges", () => {
  const snap = statusSnapshotFromApi("google", {
    connected: true,
    health: "reconnect_required",
    message: "Calendar token expired or revoked; reconnect Google Calendar.",
    google_email: "founder@gmail.com",
  });
  assert.equal(snap.health, "reconnect_required");
  assert.equal(preferredActiveProvider(snap, microsoftOk), "microsoft");
});
