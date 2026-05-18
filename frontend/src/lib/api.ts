/**
 * Browser JSON calls default to same-origin `/api/v1/...` → proxied by `app/api/v1/[[...path]]/route.ts`.
 * When `NEXT_PUBLIC_API_URL` is set, **authenticated** browser calls go straight to FastAPI so scraping
 * and dashboard survive Vercel proxy timeouts / misconfigured server-only env; Railway must list the
 * frontend origin in `CORS_ORIGINS`. Login/register without a token still use the proxy.
 *
 * If a direct authenticated call fails with a **browser network error** (e.g. CORS, preview protection,
 * DNS), we **retry once** via the same-origin proxy so actions like auto-apply still work without
 * manual env surgery on every preview URL.
 * Multipart uploads use the public API origin when set to reduce Vercel function body limits on proxies.
 */

import { getPublicApiBase } from "@/lib/public-api-base";

/** Same-origin relative path (SSR and unauthenticated browser calls). */
export const API_URL = "";

/** JSON `fetch` from the browser: same-origin unless we can hit the public API base with a bearer token. */
export function clientApiOriginForRequest(authenticated: boolean): string {
  if (typeof window === "undefined") return "";
  const base = getPublicApiBase();
  if (authenticated && base) return base;
  return "";
}

/** Multipart uploads: when authenticated + `NEXT_PUBLIC_API_URL` is set, hit the API host directly. */
export function clientUploadApiOrigin(hasAuth: boolean): string {
  if (typeof window === "undefined") return "";
  const base = getPublicApiBase();
  if (!base || !hasAuth) return "";
  return base;
}

export type ApiError = { detail?: string | { msg: string }[]; message?: string };

/** True when the browser failed before a normal HTTP response (CORS, blocked preview, offline, etc.). */
export function isLikelyBrowserNetworkFailureMessage(message: string): boolean {
  const m = message.trim();
  return (
    m === "Failed to fetch" ||
    m === "Load failed" ||
    m.startsWith("NetworkError") ||
    m.includes("fetch resource")
  );
}

function isLikelyBrowserNetworkFailure(err: unknown): boolean {
  return err instanceof Error && isLikelyBrowserNetworkFailureMessage(err.message);
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join(", ");
    if (typeof body.message === "string") return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText ? `${res.status} ${res.statusText}` : `HTTP ${res.status}`;
}

/** When the server echoes a request id, append it for support correlation (single line for inline UI). */
export function formatApiErrorMessageWithResponseId(message: string, res: Response): string {
  const trimmed = message.trim();
  const rid = res.headers.get("X-Request-ID")?.trim();
  if (!rid) return trimmed;
  return `${trimmed} Request ID: ${rid}`;
}

function ensureTraceHeaders(headers: Headers): void {
  if (headers.has("X-Request-ID")) return;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `twin-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  headers.set("X-Request-ID", id);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  ensureTraceHeaders(headers);
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  const hasAuth = Boolean(token);
  if (hasAuth) {
    const bearer = `Bearer ${token}`;
    headers.set("Authorization", bearer);
    headers.set("X-Twin-Authorization", bearer);
  }

  const directOrigin = clientApiOriginForRequest(hasAuth);
  const fetchOpts: RequestInit = {
    ...options,
    cache: options.cache ?? "no-store",
    headers,
  };

  let res: Response;
  try {
    res = await fetch(`${directOrigin}${path}`, fetchOpts);
  } catch (err) {
    if (hasAuth && directOrigin && isLikelyBrowserNetworkFailure(err)) {
      res = await fetch(`${API_URL}${path}`, fetchOpts);
    } else {
      throw err;
    }
  }
  if (!res.ok) throw new Error(formatApiErrorMessageWithResponseId(await parseError(res), res));
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (e) {
    const base = e instanceof Error ? e.message : String(e);
    throw new Error(formatApiErrorMessageWithResponseId(base, res));
  }
}

/** Authenticated GET (or other method) returning a non-JSON body (e.g. `.ics`). */
export async function apiFetchBlob(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<Blob> {
  const headers = new Headers(options.headers);
  ensureTraceHeaders(headers);
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  const hasAuth = Boolean(token);
  if (hasAuth) {
    const bearer = `Bearer ${token}`;
    headers.set("Authorization", bearer);
    headers.set("X-Twin-Authorization", bearer);
  }

  const directOrigin = clientApiOriginForRequest(hasAuth);
  const fetchOpts: RequestInit = {
    ...options,
    cache: options.cache ?? "no-store",
    headers,
  };

  let res: Response;
  try {
    res = await fetch(`${directOrigin}${path}`, fetchOpts);
  } catch (err) {
    if (hasAuth && directOrigin && isLikelyBrowserNetworkFailure(err)) {
      res = await fetch(`${API_URL}${path}`, fetchOpts);
    } else {
      throw err;
    }
  }
  if (!res.ok) throw new Error(formatApiErrorMessageWithResponseId(await parseError(res), res));
  try {
    return await res.blob();
  } catch (e) {
    const base = e instanceof Error ? e.message : String(e);
    throw new Error(formatApiErrorMessageWithResponseId(base, res));
  }
}

/** Trigger a browser download for a Blob (e.g. `.ics` from the API). */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string | null,
  extraFields?: Record<string, string>,
): Promise<T> {
  const headers = new Headers();
  ensureTraceHeaders(headers);
  const hasAuth = Boolean(token);
  if (hasAuth) {
    const bearer = `Bearer ${token}`;
    headers.set("Authorization", bearer);
    headers.set("X-Twin-Authorization", bearer);
  }

  const body = new FormData();
  body.append("file", file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      body.append(k, v);
    }
  }

  const directOrigin = clientUploadApiOrigin(hasAuth);
  const uploadOpts: RequestInit = {
    method: "POST",
    cache: "no-store",
    headers,
    body,
  };

  let res: Response;
  try {
    res = await fetch(`${directOrigin}${path}`, uploadOpts);
  } catch (err) {
    if (hasAuth && directOrigin && isLikelyBrowserNetworkFailure(err)) {
      res = await fetch(`${API_URL}${path}`, uploadOpts);
    } else {
      throw err;
    }
  }
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}
