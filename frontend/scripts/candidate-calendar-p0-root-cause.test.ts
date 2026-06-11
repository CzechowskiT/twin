/**
 * P0 root-cause regression: deterministic provider/events terminal states.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CALENDAR_FETCH_TIMEOUT_MS,
  aggregateWeekEventOutcomes,
  eventsPhaseFromFlags,
  parseProviderIntegrationError,
  providerCardShowsConnectAction,
  providerPhaseFromStatus,
  providerStatusBootstrapComplete,
} from "../src/lib/calendar-provider-health";
import { isFetchTimeoutError, shouldClearSessionOnApiError } from "../src/lib/api";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "src/app/dashboard/calendar/page.tsx"), "utf8");
const panelSrc = readFileSync(join(root, "src/components/calendar/calendar-connections-panel.tsx"), "utf8");
const opsSrc = readFileSync(join(root, "src/lib/ops-health.ts"), "utf8");

test("1: status hang → timeout terminal + retry hooks (no infinite loading)", () => {
  assert.equal(isFetchTimeoutError(new Error("Request timed out")), true);
  assert.match(panelSrc, /statusPhase === "timeout"/);
  assert.match(pageSrc, /setGoogleStatusPhase\(timedOut \? "timeout" : "error"\)/);
  assert.match(pageSrc, /loadRequestIdRef/);
});

test("2: not_connected → connect action, no event fetch for healthy list", () => {
  assert.equal(
    providerCardShowsConnectAction("ready", { connected: false, health: "unknown" }, true),
    true,
  );
  assert.equal(providerPhaseFromStatus("ready", { connected: false, health: "unknown" }), "not_connected");
  assert.match(pageSrc, /healthyProvidersToFetch/);
  assert.match(pageSrc, /events_skip_not_connected|!providers\.length/);
});

test("3: connected status + events hang → provider stays connected, events temporary", () => {
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
    { connected: true, health: "ok", message: null, provider: "google", email: "a@gmail.com" },
    null,
  );
  assert.equal(aggregate.showReconnectPanel, false);
  assert.equal(
    eventsPhaseFromFlags({
      loading: false,
      loadError: true,
      showReconnectPanel: false,
      showEmptyWeek: false,
      hasEvents: false,
      anyTemporaryFailure: true,
    }),
    "temporary_error",
  );
});

test("4: events reconnect_required → consistent reconnect panel", () => {
  const aggregate = aggregateWeekEventOutcomes(
    [
      {
        provider: "google",
        events: [],
        failed: true,
        reconnectRequired: true,
        temporaryError: false,
        message: "reconnect",
      },
    ],
    { connected: true, health: "ok", message: null, provider: "google", email: "a@gmail.com" },
    null,
  );
  assert.equal(aggregate.showReconnectPanel, true);
  assert.equal(
    eventsPhaseFromFlags({
      loading: false,
      loadError: false,
      showReconnectPanel: true,
      showEmptyWeek: false,
      hasEvents: false,
      anyTemporaryFailure: false,
    }),
    "reconnect_required",
  );
});

test("5: Google hang does not block Microsoft bootstrap phases", () => {
  assert.equal(providerStatusBootstrapComplete("timeout", "ready"), true);
  assert.equal(providerStatusBootstrapComplete("loading", "ready"), false);
  assert.match(pageSrc, /setGoogleStatusPhase\(timedOut \? "timeout" : "error"\)/);
  assert.match(pageSrc, /setMicrosoftStatusPhase\(timedOut \? "timeout" : "error"\)/);
});

test("6: calendar_connected=1 refetch guarded (no loop)", () => {
  assert.match(pageSrc, /calendarConnectedQueryRef/);
  assert.match(pageSrc, /calendarConnectedQueryRef\.current === queryKey/);
});

test("7: stale load/events responses discarded via requestId refs", () => {
  assert.match(pageSrc, /loadRequestIdRef/);
  assert.match(pageSrc, /eventsRequestIdRef/);
  assert.match(pageSrc, /load_stale_discarded|isStale\(\)/);
  assert.match(pageSrc, /events_stale_discarded/);
});

test("8: Vercel proxy 502 → temporary_error, not reconnect_required", () => {
  const parsed = parseProviderIntegrationError("502 Bad Gateway");
  assert.equal(parsed.temporaryError, true);
  assert.equal(parsed.reconnectRequired, false);
});

test("9: backend 504/timeout → timeout/retry path", () => {
  const parsed = parseProviderIntegrationError("504 Gateway Timeout");
  assert.equal(parsed.temporaryError, true);
  assert.match(pageSrc, /timeoutMs: CALENDAR_FETCH_TIMEOUT_MS/);
  assert.ok(CALENDAR_FETCH_TIMEOUT_MS <= 10000);
  assert.match(opsSrc, /fetchOpsHealth\(timeoutMs/);
  assert.match(pageSrc, /\/api\/v1\/auth\/me[\s\S]*timeoutMs: CALENDAR_FETCH_TIMEOUT_MS/);
});

test("10: provider failures never clear TWIN session", () => {
  assert.match(pageSrc, /preserveSessionOnUnauthorized:\s*true/);
  assert.equal(
    shouldClearSessionOnApiError(503, "temporarily unavailable", "/api/v1/calendar/google/status", {
      preserveSessionOnUnauthorized: true,
    }),
    false,
  );
  assert.match(panelSrc, /statusPhase === "error"/);
});
