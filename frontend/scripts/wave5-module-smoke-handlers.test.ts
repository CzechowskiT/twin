/**
 * Unit tests for Wave 5 integrations smoke module selection + fail-closed contract.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseModuleSelection,
  WAVE5_POLICY_HELD_MODULES,
  WAVE5_SMOKEABLE_MODULES,
  wave5SmokeFailClosedReasons,
} from "./lib/wave5-module-smoke-handlers";

test("wave5 smokeable set is sized for calendar/integrations complete", () => {
  assert.equal(WAVE5_SMOKEABLE_MODULES.length, 18);
  assert.ok(WAVE5_SMOKEABLE_MODULES.includes("plat_ics_export"));
  assert.ok(WAVE5_SMOKEABLE_MODULES.includes("plat_integration_inventory"));
  assert.ok(WAVE5_SMOKEABLE_MODULES.includes("plat_webcal_subscribe"));
});

test("policy modules are excluded from selection", () => {
  const selected = parseModuleSelection("all");
  for (const id of WAVE5_POLICY_HELD_MODULES) {
    assert.ok(!selected.includes(id as never), id);
  }
  assert.ok(WAVE5_POLICY_HELD_MODULES.includes("plat_ms_calendar_write"));
  assert.ok(WAVE5_POLICY_HELD_MODULES.includes("plat_ats_live_sync_write"));
  assert.ok(WAVE5_POLICY_HELD_MODULES.includes("plat_stripe_public"));
});

test("parseModuleSelection filters unknown and held ids", () => {
  const selected = parseModuleSelection(
    "plat_ics_export,plat_ms_calendar_write,plat_ats_live_sync_write,unknown",
  );
  assert.deepEqual(selected, ["plat_ics_export"]);
});

test("fail-closed contract rejects missing JWT / metrics / real writes", () => {
  assert.deepEqual(
    wave5SmokeFailClosedReasons({ hasJwt: false, metricsExcluded: true }),
    ["no_jwt"],
  );
  assert.deepEqual(
    wave5SmokeFailClosedReasons({ hasJwt: true, metricsExcluded: false }),
    ["no_metrics_exclusion"],
  );
  const provider = wave5SmokeFailClosedReasons({
    hasJwt: true,
    metricsExcluded: true,
    attemptedProviderWritePath: "/api/v1/calendar/google/events",
    realEmailSend: true,
    realCalendarWrite: true,
    realAtsWrite: true,
  });
  assert.ok(provider.includes("forbidden_provider_write_path:/api/v1/calendar/google/events"));
  assert.ok(provider.includes("real_email_send"));
  assert.ok(provider.includes("real_calendar_write"));
  assert.ok(provider.includes("real_ats_write"));
});
