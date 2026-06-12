/**
 * P0/P1 candidate calendar integration incident — connected + integration error terminal states.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  aggregateWeekEventOutcomes,
  connectionHealthForProvider,
  connectionHealthForProviderCard,
  diagnosticFromErrorMessage,
  eventsPhaseFromFlags,
  isMicrosoftUnsupportedAccountMessage,
  parseProviderIntegrationError,
  providerBadgeHealth,
  type CalendarProviderStatusSnapshot,
} from "../src/lib/calendar-provider-health";
import { shouldClearSessionOnApiError } from "../src/lib/api";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "src/app/dashboard/calendar/page.tsx"), "utf8");
const weekSrc = readFileSync(join(root, "src/components/calendar/calendar-week-view.tsx"), "utf8");
const panelSrc = readFileSync(join(root, "src/components/calendar/calendar-connections-panel.tsx"), "utf8");
const i18nSrc = readFileSync(join(root, "src/lib/i18n.ts"), "utf8");

const googleOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "google",
  email: "myczechowscy@gmail.com",
};

const microsoftOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "microsoft",
  email: "czechowski@protonmail.ch",
};

test("1: connected status ok — provider cards independent", () => {
  assert.equal(providerBadgeHealth(googleOk), "connected");
  assert.equal(providerBadgeHealth(microsoftOk), "connected");
  assert.equal(connectionHealthForProvider(googleOk, []), "ok");
  assert.equal(connectionHealthForProvider(microsoftOk, []), "ok");
});

test("2: events 502 on Google only — Google card stays connected, not integration_error", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      message: "502 Calendar list events failed",
    },
    {
      provider: "microsoft" as const,
      events: [{ id: "1", title: "A", start_iso: "2026-06-10T09:00:00Z", end_iso: "2026-06-10T10:00:00Z", all_day: false, html_link: null, source: "provider" as const }],
      failed: false,
      reconnectRequired: false,
      temporaryError: false,
      message: null,
    },
  ];
  const googleHealth = connectionHealthForProvider(googleOk, outcomes);
  const msHealth = connectionHealthForProvider(microsoftOk, outcomes);
  assert.equal(googleHealth, "ok");
  assert.equal(msHealth, "ok");
  assert.equal(providerBadgeHealth({ ...googleOk, health: googleHealth ?? "ok" }), "connected");
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
  assert.equal(aggregate.showPartialWarning, true);
  assert.equal(aggregate.showReconnectPanel, false);
});

test("3: both events 502 — week error, cards stay connected", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      message: "502",
    },
    {
      provider: "microsoft" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      message: "504",
    },
  ];
  assert.equal(connectionHealthForProviderCard(googleOk, outcomes[0]), "ok");
  assert.equal(connectionHealthForProviderCard(microsoftOk, outcomes[1]), "ok");
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(aggregate.allHealthyProvidersFailed, true);
  assert.equal(
    eventsPhaseFromFlags({
      loading: false,
      loadError: true,
      showReconnectPanel: false,
      showEmptyWeek: false,
      hasEvents: false,
      showPartialWarning: false,
      anyTemporaryFailure: true,
      anyTimeout: false,
    }),
    "error",
  );
});

test("4: events auth failure on Microsoft only — Microsoft card reconnect, Google connected", () => {
  const msOutcome = {
    provider: "microsoft" as const,
    events: [],
    failed: true,
    reconnectRequired: true,
    temporaryError: false,
    message: "428 Microsoft token expired",
  };
  assert.equal(connectionHealthForProviderCard(microsoftOk, msOutcome), "reconnect_required");
  assert.equal(connectionHealthForProviderCard(googleOk, undefined), "ok");
  assert.equal(
    providerBadgeHealth({ ...microsoftOk, health: "reconnect_required" }),
    "reconnect_required",
  );
});

test("5: week panel uses events-read copy, not disconnect/reconnect loop", () => {
  assert.match(weekSrc, /calendarEventsReadError/);
  assert.match(weekSrc, /calendarEventsReadSessionSafeHint/);
  assert.doesNotMatch(weekSrc, /calendarErrorGeneric/);
  assert.doesNotMatch(i18nSrc, /Spróbuj odłączyć i połączyć ponownie/);
  assert.doesNotMatch(i18nSrc, /Try disconnecting and connecting again/);
});

test("6: action failures use friendly retry copy without disconnect", () => {
  assert.match(pageSrc, /calendarActionFailedRetry/);
  assert.match(pageSrc, /\{actionError \?[\s\S]{0,400}calendarActionFailedRetry/);
});

test("7: diagnostics logged without PII fields", () => {
  assert.match(pageSrc, /logCalendarOperationDiagnostic/);
  assert.match(pageSrc, /diagnosticFromErrorMessage/);
  const diag = diagnosticFromErrorMessage("google", "events_read", "502 Bad Gateway");
  assert.equal(diag.isTemporary, true);
  assert.equal(diag.requiresReconnect, false);
  assert.equal(diag.provider, "google");
});

test("8: Microsoft unsupported account message detected", () => {
  assert.equal(
    isMicrosoftUnsupportedAccountMessage("MailboxNotEnabledForRESTAPI unsupported microsoft"),
    true,
  );
  assert.match(panelSrc, /calendarMicrosoftUnsupportedAccount/);
});

test("9: provider session never cleared on calendar integration failures", () => {
  assert.equal(
    shouldClearSessionOnApiError(428, "reconnect Microsoft Calendar", "/api/v1/calendar/microsoft/events"),
    false,
  );
  assert.match(pageSrc, /preserveSessionOnUnauthorized:\s*true/);
});

test("10: status reconnect_required from probe — card shows reconnect, not integration_error", () => {
  const googleReconnect: CalendarProviderStatusSnapshot = {
    connected: true,
    health: "reconnect_required",
    message: "Calendar token expired",
    provider: "google",
    email: "a@gmail.com",
  };
  assert.equal(providerBadgeHealth(googleReconnect), "reconnect_required");
  assert.match(panelSrc, /calendarProviderGoogleReconnect/);
  const parsed = parseProviderIntegrationError("invalid_grant token revoked");
  assert.equal(parsed.reconnectRequired, true);
});
