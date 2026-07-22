/**
 * Unit tests for Wave 3 company smoke module selection (fail-closed filters).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseModuleSelection,
  WAVE3_DEMO_ONLY_MODULES,
  WAVE3_POLICY_HELD_MODULES,
  WAVE3_SMOKEABLE_MODULES,
} from "./lib/wave3-module-smoke-handlers";

test("wave3 smokeable set is sized for company complete", () => {
  assert.equal(WAVE3_SMOKEABLE_MODULES.length, 16);
  assert.ok(WAVE3_SMOKEABLE_MODULES.includes("company_org_settings"));
  assert.ok(WAVE3_SMOKEABLE_MODULES.includes("company_scorecards"));
});

test("policy and demo modules are excluded from selection", () => {
  const selected = parseModuleSelection("all");
  for (const id of WAVE3_POLICY_HELD_MODULES) {
    assert.ok(!selected.includes(id as never), id);
  }
  for (const id of WAVE3_DEMO_ONLY_MODULES) {
    assert.ok(!selected.includes(id as never), id);
  }
});

test("parseModuleSelection filters unknown and held ids", () => {
  const selected = parseModuleSelection(
    "company_dashboard,company_integrations,company_demo_pipeline,unknown",
  );
  assert.deepEqual(selected, ["company_dashboard"]);
});
