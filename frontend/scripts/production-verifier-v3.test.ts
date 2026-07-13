/** Production verifier v3 tests. */
import assert from "node:assert/strict";
import test from "node:test";

import { runProductionVerifierV3 } from "./production-verifier-v3";

test("1 v3 extends v2 checks", () => {
  const checks = runProductionVerifierV3();
  assert.ok(checks.length >= 12);
  assert.ok(checks.some((c) => c.name === "fixture_070_077_chain"));
});

test("2 hardening docs present", () => {
  const checks = runProductionVerifierV3();
  for (const pr of [456, 457, 458, 459, 460]) {
    const doc = checks.find((c) => c.name === `v3_hardening_pr${pr}_doc`);
    assert.equal(doc?.ok, true, doc?.detail);
  }
});

test("3 stabilization window active on Path B", () => {
  const checks = runProductionVerifierV3({ credentialsSet: false });
  const stab = checks.find((c) => c.name === "v3_stabilization_window");
  assert.equal(stab?.ok, true);
  assert.match(stab?.detail ?? "", /ACTIVE/);
});

test("4 launch stance NO-GO", () => {
  const checks = runProductionVerifierV3();
  const stance = checks.find((c) => c.name === "v3_launch_stance");
  assert.match(stance?.detail ?? "", /NO-GO/);
});
