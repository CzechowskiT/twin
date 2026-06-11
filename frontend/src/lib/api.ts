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
 *
 * When the third `token` argument is omitted, the browser reads `twin_access_token` from storage so
 * modals and forms do not need to thread `getToken()` on every call.
 */

import { getClientApiLocale } from "@/lib/api-locale";
import { clearToken, getToken } from "@/lib/auth";
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

const REQUEST_ID_IN_MESSAGE = /\s*request\s*id:\s*[\w-]+/gi;

/** Strip support correlation ids from strings shown to users (toasts, inline errors). */
export function stripRequestIdFromUserMessage(message: string): string {
  return message.replace(REQUEST_ID_IN_MESSAGE, "").trim();
}

/** Log request id for support; never append it to user-facing copy. */
export function formatApiErrorMessageWithResponseId(message: string, res: Response): string {
  const trimmed = stripRequestIdFromUserMessage(message);
  const rid = res.headers.get("X-Request-ID")?.trim();
  if (rid && typeof console !== "undefined") {
    console.warn("[TWIN API]", trimmed, { requestId: rid });
  }
  return trimmed;
}

function ensureLocaleHeader(headers: Headers, locale?: string | null): void {
  const loc = (locale ?? getClientApiLocale())?.trim();
  if (loc) {
    headers.set("X-Locale", loc);
  }
}

function ensureTraceHeaders(headers: Headers): void {
  if (headers.has("X-Request-ID")) return;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `twin-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  headers.set("X-Request-ID", id);
}

/** `undefined` → browser storage; `null` → force unauthenticated; string → explicit bearer. */
function resolveAuthToken(token?: string | null): string | null {
  if (token === undefined) {
    return typeof window !== "undefined" ? getToken() : null;
  }
  return token;
}

function isAuthFailureMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return (
    lower.includes("401") ||
    lower.includes("invalid token") ||
    lower.includes("inactive user") ||
    lower.includes("not authenticated") ||
    lower.includes("could not validate credentials")
  );
}

/** Provider OAuth token issues on calendar routes — not a TWIN session failure. */
export function isCalendarIntegrationFailure(status: number, message: string, apiPath?: string): boolean {
  const path = apiPath?.trim() ?? "";
  if (!path.includes("/api/v1/calendar/")) return false;
  const lower = message.trim().toLowerCase();
  if (
    lower.includes("reconnect google calendar") ||
    lower.includes("reconnect microsoft calendar") ||
    lower.includes("calendar token expired") ||
    lower.includes("microsoft token expired")
  ) {
    return true;
  }
  if (status === 428) return true;
  if (status === 503) return true;
  if (status === 400 && (lower.includes("google calendar is not connected") || lower.includes("microsoft calendar is not connected"))) {
    return true;
  }
  return false;
}

/** True when the API error should clear the TWIN session and redirect to login. */
export function shouldClearSessionOnApiError(
  status: number,
  message: string,
  apiPath?: string,
  options?: Pick<ApiFetchOptions, "preserveSessionOnUnauthorized">,
): boolean {
  if (options?.preserveSessionOnUnauthorized) return false;
  if (isCalendarIntegrationFailure(status, message, apiPath)) return false;
  return status === 401 || (status === 403 && isAuthFailureMessage(message)) || isAuthFailureMessage(message);
}

function handleAuthFailure(
  status: number,
  message: string,
  apiPath?: string,
  options?: Pick<ApiFetchOptions, "preserveSessionOnUnauthorized">,
): void {
  if (typeof window === "undefined") return;
  if (!shouldClearSessionOnApiError(status, message, apiPath, options)) return;
  clearToken();
  const path = window.location.pathname;
  if (path === "/login" || path.startsWith("/login/")) return;
  const next = `${window.location.pathname}${window.location.search}`;
  const loginUrl = next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";
  window.location.assign(loginUrl);
}

function applyAuthHeaders(headers: Headers, token?: string | null): boolean {
  const resolvedToken = resolveAuthToken(token);
  const hasAuth = Boolean(resolvedToken);
  if (hasAuth) {
    const bearer = `Bearer ${resolvedToken}`;
    headers.set("Authorization", bearer);
    headers.set("X-Twin-Authorization", bearer);
  }
  return hasAuth;
}

async function throwIfNotOk(res: Response, apiPath: string, options?: Pick<ApiFetchOptions, "preserveSessionOnUnauthorized">): Promise<void> {
  if (res.ok) return;
  const errMsg = formatApiErrorMessageWithResponseId(await parseError(res), res);
  handleAuthFailure(res.status, errMsg, apiPath, options);
  throw new Error(errMsg);
}

export type ApiFetchOptions = RequestInit & {
  locale?: string | null;
  /** Calendar/provider errors must not clear the TWIN JWT (see isCalendarIntegrationFailure). */
  preserveSessionOnUnauthorized?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
  token?: string | null,
): Promise<T> {
  const { locale: localeOverride, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  ensureLocaleHeader(headers, localeOverride);
  ensureTraceHeaders(headers);
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  const hasAuth = applyAuthHeaders(headers, token);

  const directOrigin = clientApiOriginForRequest(hasAuth);
  const fetchOpts: RequestInit = {
    ...fetchOptions,
    cache: fetchOptions.cache ?? "no-store",
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
  await throwIfNotOk(res, path, options);
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
  options: ApiFetchOptions = {},
  token?: string | null,
): Promise<Blob> {
  const { locale: localeOverride, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  ensureLocaleHeader(headers, localeOverride);
  ensureTraceHeaders(headers);
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  const hasAuth = applyAuthHeaders(headers, token);

  const directOrigin = clientApiOriginForRequest(hasAuth);
  const fetchOpts: RequestInit = {
    ...fetchOptions,
    cache: fetchOptions.cache ?? "no-store",
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
  await throwIfNotOk(res, path, options);
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
  const hasAuth = applyAuthHeaders(headers, token);

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
  await throwIfNotOk(res, path);
  return res.json() as Promise<T>;
}
