/**
 * Merge orchestrator — 20+ negative scenarios (dry-run only).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExecuteBlocked,
  buildMergePlan,
  detectHeadDrift,
  formatMergePlan,
  type PrState,
} from "./lib/merge-orchestrator-core";

function pr(
  num: number,
  overrides?: Partial<PrState>,
): PrState {
  const defaults: Record<number, Partial<PrState>> = {
    449: { headSha: "905a660c7d627b389dedc6a41a6346997b0398b3", branch: "feat/c1" },
    450: { headSha: "cda7a2060faab5597274b1bb9751c5ecdfeeb79a", branch: "feat/c2" },
    448: { headSha: "5c3c48257903cbb34ebc7270c6de3f1292267a31", branch: "feat/b3" },
  };
  return {
    number: num,
    headSha: defaults[num]!.headSha!,
    state: "OPEN",
    mergeable: true,
    ciGreen: true,
    smokePassDoc: false,
    branch: defaults[num]!.branch!,
    ...overrides,
  };
}

test("1 --execute always blocked", () => {
  assert.ok(assertExecuteBlocked(true).length > 0);
  assert.equal(assertExecuteBlocked(false).length, 0);
});

test("2 all blocked without smoke PASS", () => {
  const plan = buildMergePlan([pr(449), pr(450), pr(448)]);
  assert.equal(plan.blocked, true);
  assert.ok(plan.blockers.some((b) => b.includes("smoke")));
});

test("3 drift detected wrong 449 head", () => {
  const drift = detectHeadDrift([pr(449, { headSha: "deadbeef" })]);
  assert.ok(drift.some((d) => d.includes("#449")));
});

test("4 drift detected wrong 450 head", () => {
  const drift = detectHeadDrift([pr(450, { headSha: "00000000" })]);
  assert.ok(drift.some((d) => d.includes("#450")));
});

test("5 drift detected wrong 448 head", () => {
  const drift = detectHeadDrift([pr(448, { headSha: "11111111" })]);
  assert.ok(drift.some((d) => d.includes("#448")));
});

test("6 no drift when heads match", () => {
  assert.equal(detectHeadDrift([pr(449), pr(450), pr(448)]).length, 0);
});

test("7 blocked when CI not green on 449", () => {
  const plan = buildMergePlan([pr(449, { ciGreen: false }), pr(450), pr(448)]);
  assert.ok(plan.blockers.some((b) => b.includes("#449") && b.includes("CI")));
});

test("8 blocked when not mergeable", () => {
  const plan = buildMergePlan([pr(449, { mergeable: false }), pr(450), pr(448)]);
  assert.ok(plan.blockers.some((b) => b.includes("not mergeable")));
});

test("9 blocked when PR closed", () => {
  const plan = buildMergePlan([pr(449, { state: "CLOSED" }), pr(450), pr(448)]);
  assert.ok(plan.blockers.some((b) => b.includes("#449")));
});

test("10 blocked when PR merged but smoke missing", () => {
  const plan = buildMergePlan([
    pr(449, { state: "MERGED", smokePassDoc: true }),
    pr(450),
    pr(448),
  ]);
  assert.equal(plan.blocked, true);
});

test("11 scaffold drift blocks", () => {
  const plan = buildMergePlan([pr(449), pr(450), pr(448)], { scaffoldAligned: false });
  assert.ok(plan.blockers.some((b) => b.includes("scaffold")));
});

test("12 450 requires 449 even with smoke", () => {
  const plan = buildMergePlan([
    pr(449, { smokePassDoc: true }),
    pr(450, { smokePassDoc: true }),
    pr(448, { smokePassDoc: true }),
  ]);
  const step450 = plan.steps.find((s) => s.pr === 450);
  assert.ok(step450?.dependsOn.includes(449));
});

test("13 448 requires 449 and 450", () => {
  const plan = buildMergePlan([pr(449), pr(450), pr(448)]);
  const step448 = plan.steps.find((s) => s.pr === 448);
  assert.deepEqual(step448?.dependsOn, [449, 450]);
});

test("14 format includes NEVER execute", () => {
  const out = formatMergePlan(buildMergePlan([pr(449)]));
  assert.match(out, /NEVER/);
});

test("15 missing PR in list blocked", () => {
  const plan = buildMergePlan([pr(449)]);
  assert.ok(plan.blockers.some((b) => b.includes("not found")));
});

test("16 smoke on 449 alone insufficient for full plan", () => {
  const plan = buildMergePlan([
    pr(449, { smokePassDoc: true }),
    pr(450),
    pr(448),
  ]);
  assert.equal(plan.blocked, true);
});

test("17 all smoke PASS still blocked on drift", () => {
  const plan = buildMergePlan(
    [
      pr(449, { smokePassDoc: true, headSha: "bad000" }),
      pr(450, { smokePassDoc: true }),
      pr(448, { smokePassDoc: true }),
    ],
    { scaffoldAligned: true },
  );
  assert.ok(plan.driftDetected);
});

test("18 449 step is merge not rebase", () => {
  const plan = buildMergePlan([pr(449, { smokePassDoc: true }), pr(450), pr(448)]);
  const s = plan.steps.find((x) => x.pr === 449);
  assert.equal(s?.action, "merge");
});

test("19 450 step is rebase_then_merge when smoke present", () => {
  const plan = buildMergePlan([
    pr(449, { smokePassDoc: true }),
    pr(450, { smokePassDoc: true }),
    pr(448),
  ]);
  const s = plan.steps.find((x) => x.pr === 450);
  assert.equal(s?.action, "rebase_then_merge");
});

test("20 448 step is rebase_then_merge when smoke present", () => {
  const plan = buildMergePlan([
    pr(449, { smokePassDoc: true }),
    pr(450, { smokePassDoc: true }),
    pr(448, { smokePassDoc: true }),
  ]);
  const s = plan.steps.find((x) => x.pr === 448);
  assert.equal(s?.action, "rebase_then_merge");
});

test("21 plan order is 449 450 448", () => {
  const plan = buildMergePlan([pr(448), pr(449), pr(450)]);
  assert.deepEqual(
    plan.steps.map((s) => s.pr),
    [449, 450, 448],
  );
});

test("22 CI failure on 450 blocks", () => {
  const plan = buildMergePlan([pr(449), pr(450, { ciGreen: false }), pr(448)]);
  assert.ok(plan.blockers.some((b) => b.includes("#450")));
});

test("23 smoke failure on 448 blocks", () => {
  const plan = buildMergePlan([
    pr(449, { smokePassDoc: true }),
    pr(450, { smokePassDoc: true }),
    pr(448, { smokePassDoc: false }),
  ]);
  assert.ok(plan.blockers.some((b) => b.includes("#448")));
});

test("24 hypothetical all gates pass still says blocked without smoke", () => {
  const plan = buildMergePlan([pr(449), pr(450), pr(448)]);
  assert.equal(plan.blocked, true);
});

test("25 npm script registered", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pkg = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf8",
  );
  assert.match(pkg, /plan:merge-pr448-449-450/);
});
