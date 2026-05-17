/**
 * Browser JSON calls use same-origin `/api/v1/...` → proxied by `app/api/v1/[[...path]]/route.ts` to FastAPI.
 * The proxy forwards `Authorization` / `X-Twin-Authorization`, so the SPA does not depend on Railway
 * `CORS_ORIGINS` matching every Vercel preview/production URL (a common billing/dashboard break).
 * Multipart uploads use the public API origin when set to reduce Vercel function body limits on proxies.
 * Local / Vercel: set `TWIN_API_BASE_URL` or `NEXT_PUBLIC_API_URL` so the server-side proxy can reach the API.
 */

import { getPublicApiBase } from "@/lib/public-api-base";

/** Same-origin relative path (SSR and unauthenticated browser calls). */
export const API_URL = "";

/** JSON `fetch` from the browser: always same-origin so the App Route proxy adds the upstream base. */
export function clientApiOriginForRequest(_authenticated: boolean): string {
  if (typeof window === "undefined") return "";
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
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

  const origin = clientApiOriginForRequest(hasAuth);
  const res = await fetch(`${origin}${path}`, {
    ...options,
    cache: options.cache ?? "no-store",
    headers,
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string | null,
  extraFields?: Record<string, string>,
): Promise<T> {
  const headers = new Headers();
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

  const origin = clientUploadApiOrigin(hasAuth);
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    cache: "no-store",
    headers,
    body,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}
