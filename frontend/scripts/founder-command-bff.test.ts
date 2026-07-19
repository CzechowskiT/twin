/**
 * Unit tests for Founder Command Center BFF helpers (no secrets printed).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  extractBearerToken,
  isEmailInAllowlist,
  parseFounderAllowlist,
} from "../src/lib/founder-command-bff.ts";

test("parseFounderAllowlist splits mixed separators and lowercases", () => {
  const set = parseFounderAllowlist("Contact@Twin.care, demo@twin.career; ops@example.com");
  assert.equal(set.size, 3);
  assert.ok(set.has("contact@twin.care"));
  assert.ok(set.has("demo@twin.career"));
  assert.ok(set.has("ops@example.com"));
});

test("parseFounderAllowlist ignores empty and non-email tokens", () => {
  assert.equal(parseFounderAllowlist("").size, 0);
  assert.equal(parseFounderAllowlist("not-an-email,,,  ").size, 0);
});

test("extractBearerToken accepts Bearer prefix case-insensitively", () => {
  assert.equal(extractBearerToken("Bearer abc.def"), "abc.def");
  assert.equal(extractBearerToken("bearer xyz"), "xyz");
  assert.equal(extractBearerToken(null), null);
  assert.equal(extractBearerToken("Token abc"), null);
});

test("isEmailInAllowlist is case-insensitive", () => {
  const allow = parseFounderAllowlist("founder@twin.care");
  assert.equal(isEmailInAllowlist("Founder@Twin.Care", allow), true);
  assert.equal(isEmailInAllowlist("other@twin.care", allow), false);
});
