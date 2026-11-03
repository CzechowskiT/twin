/**
 * Unit tests for Wave 4 Investor smoke module selection + fail-closed contract.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseModuleSelection,
  WAVE4_POLICY_HELD_MODULES,
  WAVE4_SMOKEABLE_MODULES,
  wave4SmokeFailClosedReasons,
} from "./lib/wave4-module-smoke-handlers";

test("wave4 smokeable set is sized for investor complete", () => {
  assert.equal(WAVE4_SMOKEABLE_MODULES.length, 12);
  assert.ok(WAVE4_SMOKEABLE_MODULES.includes("investor_data_room"));
  assert.ok(WAVE4_SMOKEABLE_MODULES.includes("investor_nda_acceptance"));
  assert.ok(WAVE4_SMOKEABLE_MODULES.includes("board_implementation_tracker"));
});

test("policy held set empty after pilot closure", () => {
  assert.equal(WAVE4_POLICY_HELD_MODULES.length, 0);
  const selected = parseModuleSelection("all");
  assert.equal(selected.length, WAVE4_SMOKEABLE_MODULES.length);
});

test("parseModuleSelection filters unknown and held ids", () => {
  const selected = parseModuleSelection(
    "investor_nda_acceptance,investor_self_serve_enrollment,unknown",
  );
  assert.deepEqual(selected, ["investor_nda_acceptance"]);
});

test("fail-closed contract rejects missing JWT / metrics / stance flips", () => {
  assert.deepEqual(
    wave4SmokeFailClosedReasons({ hasJwt: false, metricsExcluded: true }),
    ["no_jwt"],
  );
  assert.deepEqual(
    wave4SmokeFailClosedReasons({ hasJwt: true, metricsExcluded: false }),
    ["metrics_exclusion_required"],
  );
  const stance = wave4SmokeFailClosedReasons({
    hasJwt: true,
    metricsExcluded: true,
    enrollmentOn: true,
    launchGo: true,
    gateFOpen: true,
    realInvites: true,
  });
  assert.ok(stance.includes("enrollment_must_stay_off"));
  assert.ok(stance.includes("launch_must_stay_no_go"));
  assert.ok(stance.includes("gate_f_must_stay_pending"));
  assert.ok(stance.includes("real_invites_forbidden"));
});
