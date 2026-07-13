/** Stabilization window tooling tests. */
import assert from "node:assert/strict";
import test from "node:test";

import { evaluateStabilizationWindow } from "./lib/stabilization-window";

test("1 Path B blocks product merges", () => {
  const r = evaluateStabilizationWindow({ credentialsSet: false });
  assert.equal(r.productMergesAllowed, false);
  assert.equal(r.hardeningMergesAllowed, true);
});

test("2 Path A allows product merges when credentials SET", () => {
  const r = evaluateStabilizationWindow({ credentialsSet: true, stabilizationActive: false });
  assert.equal(r.productMergesAllowed, true);
});

test("3 stabilization doc referenced", () => {
  const r = evaluateStabilizationWindow({ credentialsSet: false });
  assert.match(r.reason, /Path B|founder smoke/i);
});
