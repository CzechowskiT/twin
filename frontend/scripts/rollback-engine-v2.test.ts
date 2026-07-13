/** Rollback engine v2 — matrix + execute blocked. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  ROLLBACK_MATRIX,
  assertRollbackExecuteBlocked,
  getRollbackDecision,
  runRollbackEngineV2,
} from "./lib/rollback-engine-v2";

test("1 matrix covers 449-455", () => {
  for (const pr of [449, 450, 448, 451, 452, 453, 454, 455]) {
    assert.ok(getRollbackDecision(pr), `missing PR ${pr}`);
  }
});

test("2 no auto downgrade anywhere", () => {
  assert.ok(ROLLBACK_MATRIX.every((d) => d.autoDowngrade === false));
});

test("3 execute permanently blocked", () => {
  const blockers = assertRollbackExecuteBlocked(true);
  assert.equal(blockers.length, 1);
  assert.match(blockers[0]!, /blocked/i);
});

test("4 451 tooling has no migration", () => {
  const d = getRollbackDecision(451);
  assert.equal(d?.migration, null);
  assert.equal(d?.smokeRequired, false);
});

test("5 product PRs require smoke", () => {
  for (const pr of [449, 450, 448, 452, 453, 454, 455]) {
    assert.equal(getRollbackDecision(pr)?.smokeRequired, true);
  }
});

test("6 engine validates rollback doc", () => {
  const report = runRollbackEngineV2();
  assert.equal(report.ok, true, report.blockers.join("; "));
  assert.equal(report.decisions.length, 8);
});

test("7 execute block reported when requested", () => {
  const report = runRollbackEngineV2({ checkExecuteBlocked: true });
  assert.ok(report.blockers.some((b) => /blocked/i.test(b)));
});
