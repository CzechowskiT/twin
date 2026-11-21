import { clearSessionPersona } from "@/lib/session-persona";

const TOKEN_KEY = "twin_access_token";
const REFRESH_KEY = "twin_refresh_token";
const SESSION_CHANGE_EVENT = "twin-session-change";
const AUTH_STORAGES = ["localStorage", "sessionStorage"] as const;

/** Browser-agnostic token storage with localStorage → sessionStorage fallback. */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  for (const storage of AUTH_STORAGES) {
    try {
      const store = window[storage];
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

/** Keep session-dependent UI in sync within this tab and across tabs. */
export function subscribeToAuthSession(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) onChange();
  };
  window.addEventListener(SESSION_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
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

export function getRefreshToken(): string | null {
  const store = getStorage();
  if (!store) return null;
  try {
    return store.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string, refreshToken?: string | null): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(TOKEN_KEY, token);
    if (refreshToken) store.setItem(REFRESH_KEY, refreshToken);
    window.dispatchEvent?.(new Event(SESSION_CHANGE_EVENT));
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  let clearedAccess = false;
  for (const storage of AUTH_STORAGES) {
    try {
      const store = window[storage];
      const hadAccess = store.getItem(TOKEN_KEY) !== null;
      store.removeItem(TOKEN_KEY);
      clearedAccess ||= hadAccess;
      store.removeItem(REFRESH_KEY);
    } catch {
      /* The browser may deny access to one of the storage areas. */
    }
  }
  clearSessionPersona();
  if (clearedAccess) window.dispatchEvent?.(new Event(SESSION_CHANGE_EVENT));
}

/** Clear this browser's session immediately and ask the API to revoke it. */
export async function logoutSession(opts?: {
  everywhere?: boolean;
  stepUpToken?: string;
}): Promise<void> {
  const token = getToken();
  const everywhere = Boolean(opts?.everywhere);
  if (!everywhere) clearToken();
  if (token) {
    try {
      const { apiFetch } = await import("@/lib/api");
      const headers: Record<string, string> = {};
      if (opts?.stepUpToken) headers["X-Twin-Step-Up"] = opts.stepUpToken;
      await apiFetch(
        "/api/v1/auth/logout",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ everywhere }),
          keepalive: !everywhere,
          preserveSessionOnUnauthorized: !everywhere,
          timeoutMs: everywhere ? undefined : 12_000,
        },
        token,
      );
    } catch {
      /* Local sign-out still applies if the API is unavailable. */
    }
  }
  if (everywhere) clearToken();
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
