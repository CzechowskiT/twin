/**
 * Login OAuth rows render immediately (checking state) — no wait for public-health.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DEFAULT_LOGIN_PROVIDERS,
  OAUTH_STATUS_FETCH_TIMEOUT_MS,
} from "../src/lib/oauth-auth";
import { en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 DEFAULT_LOGIN_PROVIDERS renders google/github/microsoft in checking state", () => {
  assert.equal(DEFAULT_LOGIN_PROVIDERS.length, 3);
  for (const provider of ["google", "github", "microsoft"] as const) {
    const row = DEFAULT_LOGIN_PROVIDERS.find((r) => r.provider === provider);
    assert.ok(row, provider);
    assert.equal(row.loading, true);
    assert.equal(row.available, false);
    assert.equal(row.reason, "loading");
  }
});

test("2 login form always renders OAuthWebButtons (not gated on loaded only)", () => {
  const form = read("src/components/auth/login-zone-form.tsx");
  assert.match(form, /<OAuthWebButtons/);
  assert.doesNotMatch(
    form,
    /!oauthStatusLoaded\s*\?\s*\([\s\S]*?<\/p>\s*\)\s*:\s*\(\s*<OAuthWebButtons/,
  );
});

test("3 login orContinue heading visible when alt section expanded", () => {
  const form = read("src/components/auth/login-zone-form.tsx");
  assert.match(form, /login\.orContinue/);
  assert.equal(pl.login.orContinue, "lub kontynuuj przez");
  assert.equal(en.login.orContinue, "or continue with");
});

test("4 availability helper copy is supplementary, not replacing buttons", () => {
  const form = read("src/components/auth/login-zone-form.tsx");
  assert.match(form, /login\.oauthStatusLoading/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /availabilities=\{oauthAvailabilities\}/);
});

test("5 oauth hook seeds DEFAULT_LOGIN_PROVIDERS before fetch settles", () => {
  const hook = read("src/lib/use-oauth-provider-status.ts");
  assert.match(hook, /DEFAULT_LOGIN_PROVIDERS/);
  assert.match(hook, /loaded\s*\?/);
});

test("6 public-health deduper used for oauth flags (no login polling)", () => {
  const oauth = read("src/lib/oauth-auth.ts");
  const form = read("src/components/auth/login-zone-form.tsx");
  assert.match(oauth, /fetchPublicHealthJson/);
  assert.match(oauth, /createRequestDeduper/);
  assert.doesNotMatch(form, /setInterval/);
  assert.doesNotMatch(form, /useBackgroundAware/);
});

test("7 config fetch failure shows banner but keeps oauth rows", () => {
  const form = read("src/components/auth/login-zone-form.tsx");
  assert.match(form, /configFetchFailed/);
  assert.match(form, /login\.oauthRefreshFailed/);
});

test("8 i18n PL+EN for checking, disabled reason, refresh failed", () => {
  assert.equal(pl.login.oauthStatusLoading, "Sprawdzamy dostępność logowania…");
  assert.equal(en.login.oauthStatusLoading, "Checking sign-in availability…");
  assert.equal(pl.login.oauthDisabledReason, "Nieskonfigurowane w tym wdrożeniu");
  assert.equal(en.login.oauthDisabledReason, "Not configured on this deployment");
  assert.match(pl.login.oauthRefreshFailed, /Logowanie e-mailem nadal działa/);
  assert.match(en.login.oauthRefreshFailed, /Email login still works/);
});

test("9 oauth rows map config_fetch_failed to refresh failed label", () => {
  const buttons = read("src/components/oauth-web-buttons.tsx");
  assert.match(buttons, /refreshFailedLabel/);
  assert.match(buttons, /config_fetch_failed/);
});

test("10 register form uses same instant-render pattern", () => {
  const reg = read("src/components/auth/register-zone-form.tsx");
  assert.match(reg, /<OAuthWebButtons/);
  assert.doesNotMatch(
    reg,
    /!oauthStatusLoaded\s*\?\s*\([\s\S]*?<\/p>\s*\)\s*:\s*\(\s*<OAuthWebButtons/,
  );
});

test("11 apple stays hidden until configured (no instant apple row)", () => {
  const buttons = read("src/components/oauth-web-buttons.tsx");
  assert.match(buttons, /OAUTH_WEB_PROVIDERS = \["google", "github", "microsoft"\]/);
  assert.doesNotMatch(buttons, /apple/);
});

test("12 oauth status fetch uses short timeout, does not block first paint", () => {
  assert.equal(OAUTH_STATUS_FETCH_TIMEOUT_MS, 10_000);
  const oauth = read("src/lib/oauth-auth.ts");
  assert.match(oauth, /AbortSignal\.timeout\(OAUTH_STATUS_FETCH_TIMEOUT_MS\)/);
  const hook = read("src/lib/use-oauth-provider-status.ts");
  assert.match(hook, /useEffect/);
  assert.doesNotMatch(hook, /await fetchOAuthProviderStatus/);
});
