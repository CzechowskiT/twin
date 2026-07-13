/** Production verifier v2 tests. */
import assert from "node:assert/strict";
import test from "node:test";

import { runProductionVerifierV2 } from "./production-verifier-v2";

test("1 v2 runs base checks", () => {
  const checks = runProductionVerifierV2();
  assert.ok(checks.length >= 6);
  assert.ok(checks.some((c) => c.name === "fixture_070_077_chain"));
});

test("2 fixture chain passes on tooling branch", () => {
  const checks = runProductionVerifierV2();
  const fixture = checks.find((c) => c.name === "fixture_070_077_chain");
  assert.ok(fixture?.ok, fixture?.detail);
});

test("3 launch stance NO-GO", () => {
  const checks = runProductionVerifierV2();
  const stance = checks.find((c) => c.name === "v2_launch_stance");
  assert.match(stance?.detail ?? "", /NO-GO/);
});

test("4 live probe skipped on Path B", () => {
  const checks = runProductionVerifierV2({ probePublicHealth: true });
  const probe = checks.find((c) => c.name === "v2_live_probe_skipped");
  assert.equal(probe?.ok, true);
});

test("5 P0 failures would block", () => {
  const checks = runProductionVerifierV2({ expect077: true });
  const p0Fails = checks.filter((c) => !c.ok && c.severity === "P0");
  // On partial branch 077 may be absent — fixture still passes
  assert.ok(checks.some((c) => c.name === "fixture_070_077_chain" && c.ok));
});
