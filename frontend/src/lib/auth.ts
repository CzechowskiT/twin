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
}

export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}
