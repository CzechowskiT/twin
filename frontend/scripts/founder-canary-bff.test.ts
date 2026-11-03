import assert from "node:assert/strict";
import test from "node:test";

import {
  bindCsrfToElevated,
  looksLikeMachineOpsSecret,
  verifyBoundCsrf,
} from "../src/lib/founder-canary-bff.ts";

test("looksLikeMachineOpsSecret matches env OPS token", () => {
  const prev = process.env.OPS_ADMIN_TOKEN;
  process.env.OPS_ADMIN_TOKEN = "ops-secret-for-unit-test-only";
  try {
    assert.equal(looksLikeMachineOpsSecret("ops-secret-for-unit-test-only"), true);
    assert.equal(looksLikeMachineOpsSecret("user-jwt-not-ops"), false);
  } finally {
    if (prev === undefined) delete process.env.OPS_ADMIN_TOKEN;
    else process.env.OPS_ADMIN_TOKEN = prev;
  }
});

test("CSRF bind verifies double-submit", () => {
  const prev = process.env.FOUNDER_CANARY_SESSION_SECRET;
  process.env.FOUNDER_CANARY_SESSION_SECRET = "unit-canary-csrf-secret-32chars!!";
  try {
    const elevated = "1:founder@twin.test:1:nonce:sig";
    const csrf = "csrf:1:1:n:sig";
    const bound = bindCsrfToElevated(elevated, csrf);
    assert.ok(bound.startsWith(csrf));
    assert.equal(verifyBoundCsrf(elevated, bound, bound), true);
    assert.equal(verifyBoundCsrf(elevated, bound, csrf), true);
    assert.equal(verifyBoundCsrf(elevated, bound, "wrong"), false);
  } finally {
    if (prev === undefined) delete process.env.FOUNDER_CANARY_SESSION_SECRET;
    else process.env.FOUNDER_CANARY_SESSION_SECRET = prev;
  }
});

console.log("founder-canary-bff: ok");
