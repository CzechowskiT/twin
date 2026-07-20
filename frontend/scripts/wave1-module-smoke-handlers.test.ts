/**
 * Unit tests for Wave 1 module smoke selection helpers (no network).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseModuleSelection,
  WAVE1_SMOKEABLE_MODULES,
} from "./lib/wave1-module-smoke-handlers";

test("parseModuleSelection defaults to all smokeable modules", () => {
  assert.deepEqual(parseModuleSelection(undefined), [...WAVE1_SMOKEABLE_MODULES]);
  assert.deepEqual(parseModuleSelection("all"), [...WAVE1_SMOKEABLE_MODULES]);
  assert.deepEqual(parseModuleSelection("pending"), [...WAVE1_SMOKEABLE_MODULES]);
});

test("parseModuleSelection accepts comma list", () => {
  assert.deepEqual(parseModuleSelection("cand_notifications,cand_preferences"), [
    "cand_notifications",
    "cand_preferences",
  ]);
});

test("smokeable set covers export + identity + four cand_* (CV held)", () => {
  assert.ok(WAVE1_SMOKEABLE_MODULES.includes("candidate_export_preview"));
  assert.ok(WAVE1_SMOKEABLE_MODULES.includes("candidate_identity_verification"));
  assert.ok(!WAVE1_SMOKEABLE_MODULES.includes("cand_cv_import"));
  assert.equal(WAVE1_SMOKEABLE_MODULES.length, 6);
});
