/**
 * P0: normal-browser login regression — stale session must not block password login or OAuth rows.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isCredentialExchangePath } from "../src/lib/api";
import {
  buildOAuthProviderAvailabilities,
  OAUTH_LOGIN_BUTTONS_INITIAL,
} from "../src/lib/oauth-auth";
import { isStoredTokenStale, hasActiveSession, prepareForCredentialLogin } from "../src/lib/auth";
import {
  resolveLoginDiagnosticCode,
  resolveLoginErrorKey,
} from "../src/lib/login-error";
import { pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const formSrc = readFileSync(join(root, "src/components/auth/login-zone-form.tsx"), "utf8");
const proxySrc = readFileSync(join(root, "src/app/api/v1/[[...path]]/route.ts"), "utf8");
const oauthAuthSrc = readFileSync(join(root, "src/lib/oauth-auth.ts"), "utf8");
const oauthButtonsSrc = readFileSync(join(root, "src/components/oauth-web-buttons.tsx"), "utf8");
const apiSrc = readFileSync(join(root, "src/lib/api.ts"), "utf8");

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `aaa.${b64url(payload)}.bbb`;
}

test("1: credential exchange paths never attach stored bearer", () => {
  assert.equal(isCredentialExchangePath("/api/v1/auth/login/json"), true);
  assert.equal(isCredentialExchangePath("/api/v1/auth/login"), true);
  assert.equal(isCredentialExchangePath("/api/v1/auth/register"), true);
  assert.equal(isCredentialExchangePath("/api/v1/auth/me"), false);
  assert.match(apiSrc, /isCredentialExchangePath/);
});

test("2: login form forces unauthenticated apiFetch (null token)", () => {
  assert.match(formSrc, /apiFetch<TokenResponse>\([\s\S]*null,\s*\)/);
  assert.match(formSrc, /preserveSessionOnUnauthorized:\s*true/);
});

test("3: proxy strips Authorization on POST login/register", () => {
  assert.match(proxySrc, /credentialExchange/);
  assert.match(proxySrc, /auth\/login\/json/);
  assert.match(proxySrc, /headers\.delete\("authorization"\)/);
});

test("4: prepareForCredentialLogin clears expired JWT only", () => {
  const key = "twin_access_token";
  const storage = {
    store: {} as Record<string, string>,
    getItem(k: string) {
      return this.store[k] ?? null;
    },
    setItem(k: string, v: string) {
      this.store[k] = v;
    },
    removeItem(k: string) {
      delete this.store[k];
    },
  };
  const prevWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage, sessionStorage: storage },
    configurable: true,
  });
  try {
    const expired = fakeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    storage.setItem(key, expired);
    prepareForCredentialLogin();
    assert.equal(storage.getItem(key), null);

    const fresh = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    storage.setItem(key, fresh);
    prepareForCredentialLogin();
    assert.equal(storage.getItem(key), fresh);
  } finally {
    if (prevWindow === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", { value: prevWindow, configurable: true });
    }
  }
});

test("5: isStoredTokenStale detects malformed and expired tokens", () => {
  assert.equal(isStoredTokenStale("not-a-jwt"), true);
  const expired = fakeJwt({ exp: 1 });
  assert.equal(isStoredTokenStale(expired), true);
  const fresh = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 600 });
  assert.equal(isStoredTokenStale(fresh), false);
});

test("6: oauth fetch falls back to public-health", () => {
  assert.match(oauthAuthSrc, /fetchPublicHealthJson/);
  assert.match(oauthAuthSrc, /fetchHealthOpsFlags/);
});

test("7: AuthProviderAvailability active when configured with href", () => {
  const rows = buildOAuthProviderAvailabilities(
    { ...OAUTH_LOGIN_BUTTONS_INITIAL, google: true, github: true, microsoft: true },
    true,
    false,
  );
  for (const row of rows) {
    assert.equal(row.available, true, row.provider);
    assert.match(row.href ?? "", /\/api\/v1\/auth\//);
  }
});

test("8: public-health fallback marks providers available when configured", () => {
  const rows = buildOAuthProviderAvailabilities(
    { ...OAUTH_LOGIN_BUTTONS_INITIAL, google: true },
    true,
    true,
  );
  const google = rows.find((r) => r.provider === "google");
  assert.ok(google?.available && google.href);
});

test("9: login diagnostic codes map to incident set", () => {
  assert.equal(resolveLoginDiagnosticCode(new Error("Request timed out")), "AUTH_TIMEOUT");
  assert.equal(
    resolveLoginDiagnosticCode(new Error("401"), "Invalid credentials"),
    "AUTH_INVALID_CREDENTIALS",
  );
  assert.equal(resolveLoginDiagnosticCode(new Error("429"), "Too many attempts"), "AUTH_RATE_LIMITED");
  assert.equal(resolveLoginErrorKey(new Error("401"), "Invalid credentials"), "login.invalidCredentials");
  assert.equal(pl.login.invalidCredentials, "Nieprawidłowy e-mail lub hasło.");
});

test("10: OAuth rows disabled only for not_configured / loading — active uses link", () => {
  assert.match(oauthButtonsSrc, /availability\.available && Boolean\(availability\.href\)/);
  assert.match(oauthButtonsSrc, /disabledReason === "not_configured"/);
  assert.match(formSrc, /prepareForCredentialLogin/);
  assert.match(formSrc, /clearToken\(\)/);
});

test("11: chrome headers use hasActiveSession so stale JWT shows login", () => {
  const chrome = readFileSync(join(root, "src/components/chrome-header.tsx"), "utf8");
  const marketing = readFileSync(join(root, "src/components/site-header-bar.tsx"), "utf8");
  const workspace = readFileSync(join(root, "src/components/workspace-site-header-bar.tsx"), "utf8");
  assert.match(chrome, /hasActiveSession/);
  assert.match(marketing, /hasActiveSession/);
  assert.match(workspace, /hasActiveSession/);
  assert.match(workspace, /hasSession \? "hidden md:inline-flex" : "inline-flex"/);

  const key = "twin_access_token";
  const storage = {
    store: {} as Record<string, string>,
    getItem(k: string) {
      return this.store[k] ?? null;
    },
    setItem(k: string, v: string) {
      this.store[k] = v;
    },
    removeItem(k: string) {
      delete this.store[k];
    },
  };
  const prevWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage, sessionStorage: storage },
    configurable: true,
  });
  try {
    storage.setItem(key, fakeJwt({ exp: 1 }));
    assert.equal(hasActiveSession(), false);
    assert.equal(storage.getItem(key), null);
    storage.setItem(key, fakeJwt({ exp: Math.floor(Date.now() / 1000) + 600 }));
    assert.equal(hasActiveSession(), true);
  } finally {
    if (prevWindow === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", { value: prevWindow, configurable: true });
    }
  }
});
