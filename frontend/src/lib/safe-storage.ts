/**
 * localStorage with graceful degradation (private mode, strict IT policies).
 * Falls back to an in-memory map so the app keeps working without console spam.
 */

const memory = new Map<string, string>();

function probeLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "__twin_storage_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

class SafeStorage {
  private localOk: boolean | null = null;

  private isLocalAvailable(): boolean {
    if (this.localOk === false) return false;
    if (this.localOk === true) return true;
    this.localOk = probeLocalStorage();
    return this.localOk;
  }

  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    if (this.isLocalAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        this.localOk = false;
      }
    }
    return memory.has(key) ? memory.get(key)! : null;
  }

  setItem(key: string, value: string): boolean {
    memory.set(key, value);
    if (typeof window === "undefined") return false;
    if (!this.isLocalAvailable()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      this.localOk = false;
      return false;
    }
  }

  removeItem(key: string): void {
    memory.delete(key);
    if (typeof window === "undefined") return;
    if (!this.isLocalAvailable()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      this.localOk = false;
    }
  }

  clear(): void {
    memory.clear();
    if (typeof window === "undefined") return;
    if (!this.isLocalAvailable()) return;
    try {
      window.localStorage.clear();
    } catch {
      this.localOk = false;
    }
  }
}

export const safeStorage = new SafeStorage();

export function getJSON<T>(key: string, defaultValue: T): T {
  const raw = safeStorage.getItem(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setJSON(key: string, value: unknown): boolean {
  try {
    return safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
