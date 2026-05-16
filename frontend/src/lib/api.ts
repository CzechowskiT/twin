/**
 * Browser calls use same-origin `/api/v1/...` → proxied by `app/api/v1/[[...path]]/route.ts` to FastAPI.
 * When `NEXT_PUBLIC_API_URL` is set in the browser, requests that include a Bearer token use that origin
 * directly so Vercel does not strip `Authorization` on dynamic `/api` routes. Unauthenticated calls stay
 * on the proxy (no extra CORS for login/register).
 * Local: set NEXT_PUBLIC_API_URL in `.env.local` (e.g. http://127.0.0.1:8000).
 */

import { getPublicApiBase } from "@/lib/public-api-base";

/** Same-origin relative path (SSR and unauthenticated browser calls). */
export const API_URL = "";

/**
 * In the browser, when `NEXT_PUBLIC_API_URL` is set, return the Railway base for authenticated fetches only.
 */
export function clientApiOriginForRequest(authenticated: boolean): string {
  if (typeof window === "undefined") return "";
  const base = getPublicApiBase();
  if (!base) return "";
  return authenticated ? base : "";
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
  headers.set("Content-Type", "application/json");
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

  const origin = clientApiOriginForRequest(hasAuth);
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    cache: "no-store",
    headers,
    body,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}
