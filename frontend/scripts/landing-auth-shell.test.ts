/**
 * Landing auth-shell — unauthenticated visitors must see login, not logout chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { hasActiveSession } from "../src/lib/auth";
import { headerAccountLinks } from "../src/lib/persona-access";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `aaa.${b64url(payload)}.bbb`;
}

function withMockStorage(
  run: (storage: {
    store: Record<string, string>;
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
    removeItem: (k: string) => void;
  }) => void,
): void {
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
    run(storage);
  } finally {
    if (prevWindow === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", { value: prevWindow, configurable: true });
    }
  }
}

test("unauthenticated marketing chrome exposes login and register, not logout", () => {
  const links = headerAccountLinks("candidate", false, { marketingChrome: true });
  assert.equal(links.length, 2);
  assert.equal(links[0]?.labelKey, "nav.login");
  assert.equal(links[0]?.href, "/login");
  assert.equal(links[1]?.labelKey, "nav.register");
  assert.ok(!links.some((l) => l.isLogout));
});

test("authenticated marketing chrome exposes panel and logout", () => {
  const links = headerAccountLinks("candidate", true, { marketingChrome: true });
  assert.equal(links.length, 2);
  assert.equal(links[0]?.labelKey, "nav.dashboard");
  assert.equal(links[1]?.labelKey, "dashboard.logout");
  assert.equal(links[1]?.isLogout, true);
});

test("chrome header picks marketing shell on landing without active session", () => {
  const chrome = read("src/components/chrome-header.tsx");
  assert.match(chrome, /hasActiveSession/);
  assert.match(chrome, /MarketingHeader/);
  assert.match(chrome, /if \(hasSession \|\| isWorkspacePath\(pathname\)\)/);
  assert.doesNotMatch(chrome, /Boolean\(getToken\(\)\)/);
});

test("site header syncs session via hasActiveSession, not raw token presence", () => {
  const marketing = read("src/components/site-header-bar.tsx");
  const workspace = read("src/components/workspace-site-header-bar.tsx");
  assert.match(marketing, /setHasSession\(hasActiveSession\(\)\)/);
  assert.match(workspace, /setHasSession\(hasActiveSession\(\)\)/);
  assert.match(marketing, /hasSession \? "hidden md:inline-flex" : "inline-flex"/);
});

test("expired JWT on landing is cleared and treated as logged out", () => {
  withMockStorage((storage) => {
    storage.setItem("twin_access_token", fakeJwt({ exp: 1 }));
    assert.equal(hasActiveSession(), false);
    assert.equal(storage.getItem("twin_access_token"), null);
    const links = headerAccountLinks("candidate", hasActiveSession(), { marketingChrome: true });
    assert.equal(links[0]?.labelKey, "nav.login");
  });
});

test("valid JWT keeps authenticated landing account links", () => {
  withMockStorage((storage) => {
    storage.setItem(
      "twin_access_token",
      fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    assert.equal(hasActiveSession(), true);
    const links = headerAccountLinks("candidate", hasActiveSession(), { marketingChrome: true });
    assert.equal(links[1]?.isLogout, true);
  });
});
