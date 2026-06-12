/**
 * P0: week panel events loading — deterministic terminal phases, no infinite loading.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  aggregateWeekEventOutcomes,
  CALENDAR_FETCH_TIMEOUT_MS,
  connectionHealthForProvider,
  eventsPhaseFromFlags,
  parseProviderIntegrationError,
  providerBadgeHealth,
  type CalendarProviderStatusSnapshot,
} from "../src/lib/calendar-provider-health";
import { isFetchTimeoutError, shouldClearSessionOnApiError } from "../src/lib/api";
import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "src/app/dashboard/calendar/page.tsx"), "utf8");
const weekSrc = readFileSync(join(root, "src/components/calendar/calendar-week-view.tsx"), "utf8");

const googleOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "google",
  email: "a@gmail.com",
};

const microsoftOk: CalendarProviderStatusSnapshot = {
  connected: true,
  health: "ok",
  message: null,
  provider: "microsoft",
  email: "b@work.com",
};

test("1: both connected + both events empty → empty, not loading", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: false,
      reconnectRequired: false,
      temporaryError: false,
      timedOut: false,
      message: null,
    },
    {
      provider: "microsoft" as const,
      events: [],
      failed: false,
      reconnectRequired: false,
      temporaryError: false,
      timedOut: false,
      message: null,
    },
  ];
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
  assert.equal(aggregate.showEmptyWeek, true);
  assert.equal(
    eventsPhaseFromFlags({
      loading: false,
      loadError: false,
      showReconnectPanel: false,
      showEmptyWeek: true,
      hasEvents: false,
      showPartialWarning: false,
      anyTemporaryFailure: false,
      anyTimeout: false,
    }),
    "empty",
  );
});

test("2: Google ok + Microsoft timeout → partial_error with events, not loading", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [
        {
          id: "1",
          title: "Meet",
          start_iso: "2026-06-10T09:00:00Z",
          end_iso: "2026-06-10T10:00:00Z",
          all_day: false,
          html_link: null,
          source: "provider" as const,
        },
      ],
      failed: false,
      reconnectRequired: false,
      temporaryError: false,
      timedOut: false,
      message: null,
    },
    {
      provider: "microsoft" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      timedOut: true,
      message: "Request timed out",
    },
  ];
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
  assert.equal(aggregate.showPartialWarning, true);
  assert.equal(aggregate.events.length, 1);
  assert.equal(
    eventsPhaseFromFlags({
      loading: false,
      loadError: false,
      showReconnectPanel: false,
      showEmptyWeek: false,
      hasEvents: true,
      showPartialWarning: true,
      anyTemporaryFailure: true,
      anyTimeout: true,
    }),
    "partial_error",
  );
});

test("3: both providers timeout → timeout/error + retry, not loading", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      timedOut: true,
      message: "Request timed out",
    },
    {
      provider: "microsoft" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      timedOut: true,
      message: "Request timed out",
    },
  ];
  const aggregate = aggregateWeekEventOutcomes(outcomes, googleOk, microsoftOk);
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
      anyTimeout: true,
    }),
    "timeout",
  );
});

test("4: /me/interviews non-blocking — timeout on interviews fetch in page", () => {
  assert.match(pageSrc, /fetchInterviewRows[\s\S]*timeoutMs: CALENDAR_FETCH_TIMEOUT_MS/);
  assert.match(pageSrc, /void fetchInterviewRows\(token\)\.catch/);
  assert.doesNotMatch(pageSrc, /await fetchInterviewRows[\s\S]*fetchCalendarWeekEvents/);
});

test("5: 502/503/504 → error, not reconnect", () => {
  for (const code of ["502", "503", "504"]) {
    const parsed = parseProviderIntegrationError(`${code} upstream`);
    assert.equal(parsed.temporaryError, true);
    assert.equal(parsed.reconnectRequired, false);
  }
});

test("6: Microsoft unsupported personal → partial/error, not global loading forever", () => {
  const msg = "personal microsoft account not supported";
  const parsed = parseProviderIntegrationError(msg);
  assert.equal(parsed.reconnectRequired, false);
  assert.match(weekSrc, /calendarPartialFailure|partial_error/);
});

test("7: parse failure → terminal error phase helper", () => {
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

test("8: useEffect rerender — stable fetch deps (no snapshot objects in callback deps)", () => {
  assert.match(pageSrc, /googleSnapshotRef/);
  assert.match(pageSrc, /microsoftSnapshotRef/);
  assert.match(pageSrc, /useMemo\([\s\S]*statusSnapshotFromApi\("google"/);
  const fetchBlock = pageSrc.slice(
    pageSrc.indexOf("const fetchCalendarWeekEvents = useCallback"),
    pageSrc.indexOf("}, [statusBootstrapComplete, isCalendarConnected, fetchCalendarWeekEvents]"),
  );
  assert.match(fetchBlock, /googleSnapshotRef\.current/);
  assert.doesNotMatch(fetchBlock, /}, \[weekStart, interviews, googleSnapshot/);
  assert.match(fetchBlock, /}, \[weekStart, interviews\]\);/);
});

test("9: stale request guard — latest requestId clears loading", () => {
  assert.match(pageSrc, /eventsRequestIdRef/);
  assert.match(pageSrc, /isLatest\(\)/);
  assert.match(pageSrc, /requestId === eventsRequestIdRef\.current[\s\S]*setEventsLoading\(false\)/);
});

test("10: retry restarts load — week panel retry handler wired", () => {
  assert.match(weekSrc, /onRetryEvents/);
  assert.match(weekSrc, /partial_error|calendarPartialFailure/);
  assert.match(weekSrc, /calendarRetry/);
  assert.match(pageSrc, /onRetryEvents=\{[\s\S]*fetchCalendarWeekEvents/);
});

test("11: provider badges POŁĄCZONO when status ok and only events failed", () => {
  const outcomes = [
    {
      provider: "google" as const,
      events: [],
      failed: true,
      reconnectRequired: false,
      temporaryError: true,
      timedOut: false,
      message: "502",
    },
  ];
  assert.equal(connectionHealthForProvider(googleOk, outcomes), "ok");
  assert.equal(providerBadgeHealth({ ...googleOk, health: "ok" }), "connected");
});

test("12: no TWIN session clear on calendar events failure", () => {
  assert.match(pageSrc, /preserveSessionOnUnauthorized:\s*true/);
  assert.equal(
    shouldClearSessionOnApiError(503, "temporarily unavailable", "/api/v1/calendar/google/events", {
      preserveSessionOnUnauthorized: true,
    }),
    false,
  );
});

test("PL copy for week events terminal states", () => {
  assert.equal(pl.dashboard.calendarViewLoading, "Ładowanie wydarzeń…");
  assert.equal(pl.dashboard.calendarViewEmpty, "Brak wydarzeń w tym tygodniu.");
  assert.equal(pl.dashboard.calendarEventsReadError, "Nie udało się wczytać wydarzeń z kalendarza.");
  assert.equal(pl.dashboard.calendarPartialFailure, "Nie udało się wczytać części wydarzeń. Spróbuj ponownie.");
  assert.equal(pl.dashboard.calendarEventsReadTimeout, "Ładowanie wydarzeń trwa zbyt długo.");
  assert.equal(pl.dashboard.calendarRetry, "Spróbuj ponownie");
  assert.match(pl.dashboard.calendarEventsReadSessionSafeHint, /nie logowania/);
});

test("Promise.allSettled per provider + client timeout bound", () => {
  assert.match(pageSrc, /Promise\.allSettled/);
  assert.ok(CALENDAR_FETCH_TIMEOUT_MS >= 8000);
  assert.ok(CALENDAR_FETCH_TIMEOUT_MS <= 10000);
});
