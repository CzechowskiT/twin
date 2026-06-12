/**
 * P0 regression: candidate login must not hang on "Logowanie…" when API/proxy is slow or errors.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LOGIN_REQUEST_TIMEOUT_MS,
  loginErrorTranslationKeyFromStatus,
  parseLoginAccessToken,
  resolveLoginErrorKey,
} from "../src/lib/login-error";
import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const formSrc = readFileSync(join(root, "src/components/auth/login-zone-form.tsx"), "utf8");
const proxySrc = readFileSync(join(root, "src/app/api/v1/[[...path]]/route.ts"), "utf8");

test("1: login form uses 10s apiFetch timeoutMs", () => {
  assert.equal(LOGIN_REQUEST_TIMEOUT_MS, 10_000);
  assert.match(formSrc, /timeoutMs:\s*LOGIN_REQUEST_TIMEOUT_MS/);
});

test("2: try/catch/finally always clears loading state", () => {
  assert.match(formSrc, /setLoading\(true\)/);
  assert.match(formSrc, /finally\s*\{[\s\S]*setLoading\(false\)/);
});

test("3: 401/403 invalid credentials map to login.invalidCredentials", () => {
  assert.equal(resolveLoginErrorKey(new Error("401 Unauthorized"), "Invalid credentials"), "login.invalidCredentials");
  assert.equal(
    loginErrorTranslationKeyFromStatus(401, "Invalid credentials"),
    "login.invalidCredentials",
  );
  assert.equal(loginErrorTranslationKeyFromStatus(403, "Forbidden"), "login.invalidCredentials");
});

test("4: 429 rate limit maps to login.rateLimited", () => {
  assert.equal(
    resolveLoginErrorKey(new Error("429 Too Many Requests"), "Too many login attempts. Try again shortly."),
    "login.rateLimited",
  );
  assert.equal(loginErrorTranslationKeyFromStatus(429), "login.rateLimited");
});

test("5: 500/502/503 map to login.temporarilyUnavailable", () => {
  for (const status of [500, 502, 503]) {
    assert.equal(
      loginErrorTranslationKeyFromStatus(status, `${status} error`),
      "login.temporarilyUnavailable",
    );
  }
  assert.equal(
    resolveLoginErrorKey(new Error("502 Bad Gateway"), "Cannot reach API (timeout)"),
    "login.temporarilyUnavailable",
  );
});

test("6: client timeout maps to login.temporarilyUnavailable", () => {
  assert.equal(resolveLoginErrorKey(new Error("Request timed out")), "login.temporarilyUnavailable");
});

test("7: malformed login payload without access_token is rejected", () => {
  assert.equal(parseLoginAccessToken({}), null);
  assert.equal(parseLoginAccessToken({ access_token: "" }), null);
  assert.equal(parseLoginAccessToken({ access_token: "jwt" }), "jwt");
  assert.match(formSrc, /parseLoginAccessToken/);
  assert.match(formSrc, /login\.malformedResponse/);
});

test("8: Polish login error copy matches incident spec", () => {
  assert.equal(pl.login.invalidCredentials, "Nieprawidłowy e-mail lub hasło.");
  assert.equal(pl.login.rateLimited, "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.");
  assert.equal(pl.login.temporarilyUnavailable, "Nie udało się zalogować. Spróbuj ponownie za chwilę.");
});

test("9: auth proxy uses shorter upstream timeout than long-running routes", () => {
  assert.match(proxySrc, /authRoute/);
  assert.match(proxySrc, /authRoute \? 12_000/);
});
