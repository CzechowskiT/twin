import { clearSessionPersona } from "@/lib/session-persona";

const TOKEN_KEY = "twin_access_token";

/** Browser-agnostic token storage with localStorage → sessionStorage fallback. */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const probe = "__twin_storage_test__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch {
      continue;
    }
  }
  return null;
}

export function getToken(): string | null {
  const store = getStorage();
  if (!store) return null;
  try {
    return store.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearToken(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  clearSessionPersona();
}

export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

/** Decode JWT payload without verification — used only to detect expired/malformed session blobs. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when stored token is missing, malformed, or past `exp` (with 30s skew). */
export function isStoredTokenStale(token: string | null): boolean {
  if (!token?.trim()) return false;
  const payload = decodeJwtPayload(token.trim());
  if (!payload) return true;
  const exp = payload.exp;
  if (typeof exp !== "number") return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp <= nowSec + 30;
}

/** Drop expired/malformed JWT before password/OAuth credential exchange (keeps locale keys). */
export function prepareForCredentialLogin(): void {
  const token = getToken();
  if (token && isStoredTokenStale(token)) {
    clearToken();
  }
}

/** True when a valid JWT is stored; clears expired/malformed blobs so chrome shows login. */
export function hasActiveSession(): boolean {
  const token = getToken();
  if (!token) return false;
  if (isStoredTokenStale(token)) {
    clearToken();
    return false;
  }
  return true;
}
