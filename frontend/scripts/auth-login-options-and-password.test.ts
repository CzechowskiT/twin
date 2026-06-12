/**
 * P0: login options visibility + password login timeout/error mapping.
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
import { OAUTH_STATUS_FETCH_TIMEOUT_MS } from "../src/lib/oauth-auth";
import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const formSrc = readFileSync(join(root, "src/components/auth/login-zone-form.tsx"), "utf8");
const oauthButtonsSrc = readFileSync(join(root, "src/components/oauth-web-buttons.tsx"), "utf8");
const oauthAuthSrc = readFileSync(join(root, "src/lib/oauth-auth.ts"), "utf8");
const linkedInSrc = readFileSync(join(root, "src/components/linkedin-login-section.tsx"), "utf8");

test("1: password login uses 10s client timeout", () => {
  assert.equal(LOGIN_REQUEST_TIMEOUT_MS, 10_000);
  assert.match(formSrc, /timeoutMs:\s*LOGIN_REQUEST_TIMEOUT_MS/);
});

test("2: loading clears in finally after password submit", () => {
  assert.match(formSrc, /finally\s*\{[\s\S]*setLoading\(false\)/);
});

test("3: show-all-login-options expand control exists", () => {
  assert.match(formSrc, /login\.showAllLoginOptions/);
  assert.match(formSrc, /setUserAltLoginExpanded\(true\)/);
  assert.equal(pl.login.showAllLoginOptions, "Pokaż wszystkie opcje logowania");
});

test("4: OAuth rows render when unconfigured (disabled, not hidden)", () => {
  assert.match(oauthButtonsSrc, /aria-disabled="true"/);
  assert.match(oauthButtonsSrc, /availability\.available/);
});

test("5: OAuth status fetch has 10s timeout and public-health fallback", () => {
  assert.equal(OAUTH_STATUS_FETCH_TIMEOUT_MS, 10_000);
  assert.match(oauthAuthSrc, /AbortSignal\.timeout\(OAUTH_STATUS_FETCH_TIMEOUT_MS\)/);
  assert.match(oauthAuthSrc, /\/api\/public-health/);
});

test("6: LinkedIn section fetch has 10s timeout", () => {
  assert.match(linkedInSrc, /AbortSignal\.timeout\(10_000\)/);
});

test("7: 401 invalid credentials → Polish copy", () => {
  assert.equal(resolveLoginErrorKey(new Error("401"), "Invalid credentials"), "login.invalidCredentials");
  assert.equal(pl.login.invalidCredentials, "Nieprawidłowy e-mail lub hasło.");
});

test("8: 429 rate limit → Polish copy", () => {
  assert.equal(loginErrorTranslationKeyFromStatus(429), "login.rateLimited");
  assert.equal(pl.login.rateLimited, "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.");
});

test("9: timeout / 502 → temporarily unavailable Polish copy", () => {
  assert.equal(resolveLoginErrorKey(new Error("Request timed out")), "login.temporarilyUnavailable");
  assert.equal(loginErrorTranslationKeyFromStatus(502), "login.temporarilyUnavailable");
  assert.equal(pl.login.temporarilyUnavailable, "Nie udało się zalogować. Spróbuj ponownie za chwilę.");
});

test("10: malformed token rejected before redirect", () => {
  assert.equal(parseLoginAccessToken({ access_token: "" }), null);
  assert.match(formSrc, /parseLoginAccessToken/);
  assert.match(formSrc, /login\.malformedResponse/);
});
