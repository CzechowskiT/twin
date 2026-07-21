/**
 * Unit tests for Wave 2 module selection + policy exclusions.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseModuleSelection,
  WAVE2_DEMO_ONLY_MODULES,
  WAVE2_POLICY_HELD_MODULES,
  WAVE2_SMOKEABLE_MODULES,
} from "./lib/wave2-module-smoke-handlers";

test("parseModuleSelection defaults to all smokeable", () => {
  assert.deepEqual(parseModuleSelection(undefined), [...WAVE2_SMOKEABLE_MODULES]);
  assert.deepEqual(parseModuleSelection("all"), [...WAVE2_SMOKEABLE_MODULES]);
  assert.deepEqual(parseModuleSelection("pending"), [...WAVE2_SMOKEABLE_MODULES]);
});

test("parseModuleSelection filters unknown and policy-held", () => {
  const selected = parseModuleSelection("recruiter_talent_radar,recruiter_calendar,bogus");
  assert.deepEqual(selected, ["recruiter_talent_radar"]);
});

test("smokeable excludes policy and demo", () => {
  assert.ok(WAVE2_SMOKEABLE_MODULES.includes("rec_notes"));
  assert.ok(WAVE2_SMOKEABLE_MODULES.includes("recruiter_talent_radar"));
  assert.ok(!WAVE2_SMOKEABLE_MODULES.includes("recruiter_calendar"));
  assert.ok(!WAVE2_SMOKEABLE_MODULES.includes("recruiter_demo_pipeline"));
  assert.ok(WAVE2_POLICY_HELD_MODULES.includes("recruiter_integrations"));
  assert.ok(WAVE2_DEMO_ONLY_MODULES.includes("rec_candidate_comms"));
  assert.equal(WAVE2_SMOKEABLE_MODULES.length, 20);
});
