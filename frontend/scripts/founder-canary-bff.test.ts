import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMutatingCsrf,
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
    const elevated = "v2|1|founder@twin.test|-|-|fp|1|nonce";
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

test("mutating CSRF requires explicit header — cookie alone is 403", () => {
  const prev = process.env.FOUNDER_CANARY_SESSION_SECRET;
  process.env.FOUNDER_CANARY_SESSION_SECRET = "unit-canary-csrf-secret-32chars!!";
  try {
    const elevated = "v2|1|founder@twin.test|-|-|fp|1|nonce";
    const csrf = "csrf:1:1:n:sig";
    const bound = bindCsrfToElevated(elevated, csrf);

    const missingHeader = assertMutatingCsrf({
      elevated,
      csrfCookie: bound,
      csrfHeader: null,
    });
    assert.equal(missingHeader.ok, false);
    if (!missingHeader.ok) {
      assert.equal(missingHeader.status, 403);
      assert.match(missingHeader.detail, /CSRF header required/i);
    }

    const wrongHeader = assertMutatingCsrf({
      elevated,
      csrfCookie: bound,
      csrfHeader: "totally-wrong",
    });
    assert.equal(wrongHeader.ok, false);
    if (!wrongHeader.ok) assert.equal(wrongHeader.status, 403);

    const mismatched = assertMutatingCsrf({
      elevated,
      csrfCookie: bound,
      csrfHeader: bindCsrfToElevated(elevated, "csrf:9:1:other:sig"),
    });
    assert.equal(mismatched.ok, false);

    const crossOriginNoCookies = assertMutatingCsrf({
      elevated: null,
      csrfCookie: null,
      csrfHeader: null,
    });
    assert.equal(crossOriginNoCookies.ok, false);
    if (!crossOriginNoCookies.ok) assert.equal(crossOriginNoCookies.status, 403);

    const ok = assertMutatingCsrf({
      elevated,
      csrfCookie: bound,
      csrfHeader: bound,
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.rawCsrf, csrf);
  } finally {
    if (prev === undefined) delete process.env.FOUNDER_CANARY_SESSION_SECRET;
    else process.env.FOUNDER_CANARY_SESSION_SECRET = prev;
  }
});

console.log("founder-canary-bff: ok");
