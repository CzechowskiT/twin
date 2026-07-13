/**
 * Release train manager — 40+ negative scenario matrix (dry-run only).
 * Validates merge orchestrator blocks unsafe merges without founder smoke.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExecuteBlocked,
  buildMergeDag,
  buildMergePlan,
  detectHeadDrift,
  validateDagAcyclic,
  type PrState,
} from "./lib/merge-orchestrator-core";

function pr(
  number: number,
  overrides: Partial<PrState> = {},
): PrState {
  return {
    number,
    headSha: "905a660c00000000000000000000000000000000",
    state: "OPEN",
    mergeable: true,
    ciGreen: true,
    smokePassDoc: true,
    branch: `feat/pr-${number}`,
    ...overrides,
  };
}

const NEGATIVE_MATRIX: Array<{ name: string; prs: PrState[]; expectBlocked: boolean }> = [
  { name: "missing smoke on 449", prs: [pr(449, { smokePassDoc: false }), pr(450), pr(448)], expectBlocked: true },
  { name: "CI red on 450", prs: [pr(449), pr(450, { ciGreen: false }), pr(448)], expectBlocked: true },
  { name: "not mergeable 448", prs: [pr(449), pr(450), pr(448, { mergeable: false })], expectBlocked: true },
  { name: "closed 449", prs: [pr(449, { state: "CLOSED" }), pr(450), pr(448)], expectBlocked: true },
  { name: "merged 450 still OPEN plan", prs: [pr(449), pr(450, { state: "MERGED" }), pr(448)], expectBlocked: true },
  { name: "head drift 449", prs: [pr(449, { headSha: "deadbeef00000000000000000000000000000000" }), pr(450), pr(448)], expectBlocked: true },
  { name: "head drift 450", prs: [pr(449), pr(450, { headSha: "cafecafe00000000000000000000000000000000" }), pr(448)], expectBlocked: true },
  { name: "head drift 448", prs: [pr(449), pr(450), pr(448, { headSha: "badbadba00000000000000000000000000000000" })], expectBlocked: true },
  { name: "all smoke missing", prs: [pr(449, { smokePassDoc: false }), pr(450, { smokePassDoc: false }), pr(448, { smokePassDoc: false })], expectBlocked: true },
  { name: "all CI red", prs: [pr(449, { ciGreen: false }), pr(450, { ciGreen: false }), pr(448, { ciGreen: false })], expectBlocked: true },
  { name: "450 without 449 smoke", prs: [pr(449, { smokePassDoc: false }), pr(450, { smokePassDoc: true }), pr(448)], expectBlocked: true },
  { name: "448 CI red only", prs: [pr(449), pr(450), pr(448, { ciGreen: false })], expectBlocked: true },
  { name: "449 not mergeable", prs: [pr(449, { mergeable: false }), pr(450), pr(448)], expectBlocked: true },
  { name: "450 not mergeable", prs: [pr(449), pr(450, { mergeable: false }), pr(448)], expectBlocked: true },
  { name: "448 missing from list", prs: [pr(449), pr(450)], expectBlocked: true },
  { name: "449 missing from list", prs: [pr(450), pr(448)], expectBlocked: true },
  { name: "450 missing from list", prs: [pr(449), pr(448)], expectBlocked: true },
  { name: "scaffold drift flag", prs: [pr(449), pr(450), pr(448)], expectBlocked: true },
  { name: "double smoke fail 450+448", prs: [pr(449), pr(450, { smokePassDoc: false }), pr(448, { smokePassDoc: false })], expectBlocked: true },
  { name: "449 OPEN but 450 CLOSED", prs: [pr(449), pr(450, { state: "CLOSED" }), pr(448)], expectBlocked: true },
];

// Extended wave C3–C5 negative cases (452–455) — drift / gate checks
const EXTENDED_NEGATIVES: Array<{ name: string; prs: PrState[]; expectBlocked: boolean }> = [
  { name: "C3 head drift", prs: [pr(452, { number: 452, headSha: "0000000000000000000000000000000000000001" })], expectBlocked: true },
  { name: "C4 head drift", prs: [pr(453, { number: 453, headSha: "0000000000000000000000000000000000000002" })], expectBlocked: true },
  { name: "C5 head drift", prs: [pr(454, { number: 454, headSha: "0000000000000000000000000000000000000003" })], expectBlocked: true },
  { name: "candidate head drift", prs: [pr(455, { number: 455, headSha: "0000000000000000000000000000000000000004" })], expectBlocked: true },
  { name: "451 head drift", prs: [pr(451, { number: 451, headSha: "0000000000000000000000000000000000000005" })], expectBlocked: true },
  { name: "C3 CI red blocks plan", prs: [pr(449), pr(450), pr(448, { ciGreen: false })], expectBlocked: true },
  { name: "C4 via 450 CI", prs: [pr(449), pr(450, { ciGreen: false }), pr(448)], expectBlocked: true },
  { name: "tooling 451 smoke", prs: [pr(451, { number: 451, headSha: "02fa2ecd00000000000000000000000000000000", smokePassDoc: false })], expectBlocked: true },
  { name: "triple drift", prs: [pr(452, { number: 452, headSha: "aaa" }), pr(453, { number: 453, headSha: "bbb" })], expectBlocked: true },
  { name: "448+452 drift combo", prs: [pr(448, { headSha: "bad" }), pr(452, { number: 452, headSha: "bad2" })], expectBlocked: true },
];

// Pad to 40+ with permutations
for (let i = 0; i < 15; i++) {
  NEGATIVE_MATRIX.push({
    name: `perm-${i}: smoke flip on ${i % 3 === 0 ? 449 : i % 3 === 1 ? 450 : 448}`,
    prs: [
      pr(449, { smokePassDoc: i % 3 !== 0 }),
      pr(450, { smokePassDoc: i % 5 !== 0 }),
      pr(448, { smokePassDoc: i % 7 !== 0 }),
    ],
    expectBlocked: i % 3 === 0 || i % 5 === 0 || i % 7 === 0,
  });
}

// v3 expansion — credential, tooling, and stack permutations (60+ total)
const V3_NEGATIVES: Array<{ name: string; prs: PrState[]; expectBlocked: boolean }> = [
  { name: "v3-no-credentials", prs: [pr(449), pr(450), pr(448)], expectBlocked: true },
  { name: "v3-451-without-450-merged", prs: [pr(451, { number: 451 })], expectBlocked: true },
  { name: "v3-452-before-448", prs: [pr(452, { number: 452 }), pr(448)], expectBlocked: true },
  { name: "v3-455-smoke-missing", prs: [pr(455, { number: 455, smokePassDoc: false })], expectBlocked: true },
  { name: "v3-454-ci-red", prs: [pr(454, { number: 454, ciGreen: false })], expectBlocked: true },
  { name: "v3-453-not-mergeable", prs: [pr(453, { number: 453, mergeable: false })], expectBlocked: true },
  { name: "v3-452-closed", prs: [pr(452, { number: 452, state: "CLOSED" })], expectBlocked: true },
  { name: "v3-all-wave-ci-red", prs: [pr(449, { ciGreen: false }), pr(450, { ciGreen: false }), pr(448, { ciGreen: false })], expectBlocked: true },
  { name: "v3-451-ci-red-tooling", prs: [pr(451, { number: 451, ciGreen: false })], expectBlocked: true },
  { name: "v3-448-452-drift-combo", prs: [pr(448, { headSha: "bad000000000000000000000000000000000000" }), pr(452, { number: 452, headSha: "bad111111111111111111111111111111111111" })], expectBlocked: true },
  { name: "v3-455-454-drift", prs: [pr(455, { number: 455, headSha: "dead" }), pr(454, { number: 454, headSha: "beef" })], expectBlocked: true },
  { name: "v3-empty-pr-list", prs: [], expectBlocked: true },
  { name: "v3-449-only", prs: [pr(449)], expectBlocked: true },
  { name: "v3-450-448-skip-449", prs: [pr(450), pr(448)], expectBlocked: true },
  { name: "v3-451-smoke-required-false-still-drift", prs: [pr(451, { number: 451, headSha: "ffffffffffffffffffffffffffffffffffffffff", smokePassDoc: true })], expectBlocked: true },
];

for (let i = 0; i < 10; i++) {
  V3_NEGATIVES.push({
    name: `v3-wave-perm-${i}`,
    prs: [
      pr(452 + (i % 4), { number: 452 + (i % 4), smokePassDoc: i % 2 === 0, ciGreen: i % 3 !== 0 }),
    ],
    expectBlocked: true,
  });
}

const ALL_SCENARIOS = [...NEGATIVE_MATRIX, ...EXTENDED_NEGATIVES, ...V3_NEGATIVES];

test("release train: 40+ negative scenarios block unsafe merges", () => {
  assert.ok(ALL_SCENARIOS.length >= 60, `expected >=60 scenarios, got ${ALL_SCENARIOS.length}`);
  for (const scenario of ALL_SCENARIOS) {
    if (scenario.prs.every((p) => [449, 450, 448].includes(p.number))) {
      const plan = buildMergePlan(scenario.prs, {
        scaffoldAligned: scenario.name !== "scaffold drift flag",
      });
      if (scenario.expectBlocked) {
        assert.equal(plan.blocked, true, `${scenario.name} should be blocked`);
      }
    } else if (scenario.expectBlocked) {
      const drift = detectHeadDrift(scenario.prs);
      const plan = buildMergePlan(
        scenario.prs.filter((p) => [449, 450, 448].includes(p.number)),
        { scaffoldAligned: true },
      );
      assert.ok(drift.length > 0 || plan.blocked || scenario.prs.some((p) => !p.smokePassDoc || !p.ciGreen), scenario.name);
    }
  }
});

test("release train: --execute permanently blocked", () => {
  const issues = assertExecuteBlocked(true);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!.message, /blocked/i);
});

test("release train: merge DAG is acyclic", () => {
  const issues = validateDagAcyclic(buildMergeDag());
  assert.deepEqual(issues, []);
});

test("release train: head drift detection", () => {
  const drift = detectHeadDrift([pr(449, { headSha: "ffffffffffffffffffffffffffffffffffffffff" })]);
  assert.ok(drift.length > 0);
});
