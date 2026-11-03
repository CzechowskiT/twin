import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMutatingCsrf,
  bindCsrfToElevated,
  founderCanaryConfigAudit,
  looksLikeMachineOpsSecret,
  sessionSecret,
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

test("production-like refuses silent SECRET_KEY fallback for sessionSecret", () => {
  const prevSecret = process.env.FOUNDER_CANARY_SESSION_SECRET;
  const prevCmd = process.env.FOUNDER_COMMAND_CSRF_SECRET;
  const prevSk = process.env.SECRET_KEY;
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  const prevEnv = process.env.ENVIRONMENT;
  delete process.env.FOUNDER_CANARY_SESSION_SECRET;
  process.env.SECRET_KEY = "would-be-silent-fallback-secret-key!!!!";
  process.env.FOUNDER_COMMAND_CSRF_SECRET = "also-not-ok-in-prod!!!!!!!!!!!!!!";
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.ENVIRONMENT = "production";
  try {
    assert.equal(sessionSecret(), "");
    const audit = founderCanaryConfigAudit();
    assert.equal(audit.dedicated_session_secret, false);
    assert.equal(audit.production_like, true);
    assert.equal(audit.silent_secret_key_fallback_allowed, false);
  } finally {
    if (prevSecret === undefined) delete process.env.FOUNDER_CANARY_SESSION_SECRET;
    else process.env.FOUNDER_CANARY_SESSION_SECRET = prevSecret;
    if (prevCmd === undefined) delete process.env.FOUNDER_COMMAND_CSRF_SECRET;
    else process.env.FOUNDER_COMMAND_CSRF_SECRET = prevCmd;
    if (prevSk === undefined) delete process.env.SECRET_KEY;
    else process.env.SECRET_KEY = prevSk;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
    if (prevEnv === undefined) delete process.env.ENVIRONMENT;
    else process.env.ENVIRONMENT = prevEnv;
  }
});

console.log("founder-canary-bff: ok");
