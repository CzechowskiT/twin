import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_COMPLIANCE_SMOKEABLE_MODULES,
  aiComplianceSmokeFailClosedReasons,
  parseModuleSelection,
} from "./lib/ai-compliance-module-smoke-handlers";

test("ai compliance smokeable set is sized for phase A", () => {
  assert.equal(AI_COMPLIANCE_SMOKEABLE_MODULES.length, 28);
  assert.ok(parseModuleSelection("ai_claim_declared,ai_registry").length === 2);
});

test("fail-closed reasons", () => {
  assert.deepEqual(aiComplianceSmokeFailClosedReasons({ hasJwt: false, metricsExcluded: true }), ["no_jwt"]);
  assert.ok(
    aiComplianceSmokeFailClosedReasons({
      hasJwt: true,
      metricsExcluded: false,
    }).includes("metrics_exclusion_required"),
  );
});
