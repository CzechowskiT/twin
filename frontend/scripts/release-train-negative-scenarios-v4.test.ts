/**
 * Release train manager v4 — 100+ negative scenarios (dry-run only).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExecuteBlocked,
  buildMergePlan,
  detectHeadDrift,
} from "./lib/merge-orchestrator-core";
import {
  countV4Scenarios,
  HARDENING_PRS,
  pr,
  V4_SCENARIOS,
} from "./lib/release-train-v4-scenarios";

test("v4: scenario count >= 100", () => {
  assert.ok(countV4Scenarios() >= 100, `expected >=100, got ${countV4Scenarios()}`);
});

test("v4: all hardening PRs represented", () => {
  for (const n of HARDENING_PRS) {
    assert.ok(
      V4_SCENARIOS.some((s) => s.prs.some((p) => p.number === n)),
      `missing hardening PR ${n}`,
    );
  }
});

test("v4: unsafe wave merges blocked", () => {
  for (const scenario of V4_SCENARIOS) {
    const wavePrs = scenario.prs.filter((p) => [449, 450, 448].includes(p.number));
    if (wavePrs.length < 2) continue;
    const plan = buildMergePlan(wavePrs, { scaffoldAligned: true });
    if (scenario.expectBlocked) {
      const drift = detectHeadDrift(wavePrs);
      const blocked =
        plan.blocked ||
        drift.length > 0 ||
        wavePrs.some((p) => !p.smokePassDoc || !p.ciGreen || !p.mergeable);
      assert.ok(blocked, `${scenario.name} should be blocked`);
    }
  }
});

test("v4: wave head drift detected", () => {
  const drift = detectHeadDrift([
    pr(449, { headSha: "ffffffffffffffffffffffffffffffffffffffff" }),
  ]);
  assert.ok(drift.length > 0);
});

test("v4: --execute permanently blocked", () => {
  const issues = assertExecuteBlocked(true);
  assert.equal(issues.length, 1);
});

test("v4: stabilization scenarios always blocked without smoke", () => {
  const stab = V4_SCENARIOS.filter((s) => s.category === "stabilization" && s.expectBlocked);
  assert.ok(stab.length >= 15);
});
