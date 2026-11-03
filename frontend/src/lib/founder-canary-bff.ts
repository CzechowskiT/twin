/**
 * Server-only helpers for Founder canary admin BFF.
 * OPS_ADMIN_TOKEN / elevated session material must never be writable from browser JS.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  extractBearerToken,
  isEmailInAllowlist,
  parseFounderAllowlist,
} from "@/lib/founder-command-bff";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const CANARY_AT_COOKIE = "twin_founder_canary_at";
export const CANARY_ELEVATED_COOKIE = "twin_founder_canary_elevated";
export const CANARY_CSRF_COOKIE = "twin_founder_canary_csrf";

const COOKIE_PATH = "/api/ops-admin/canary";

export function founderCanaryAllowlistFromEnv(): Set<string> {
  const canary = parseFounderAllowlist(process.env.FOUNDER_CANARY_ALLOWLIST);
  if (canary.size > 0) return canary;
  return parseFounderAllowlist(process.env.FOUNDER_COMMAND_ALLOWLIST);
}

export function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function secureCookieAttrs(maxAge: number): string {
  const secure =
    process.env.NODE_ENV === "production" ||
    (process.env.VERCEL_ENV || "").toLowerCase() === "production" ||
    (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");
  const parts = [
    `Path=${COOKIE_PATH}`,
    "SameSite=Strict",
    `Max-Age=${Math.max(0, maxAge)}`,
    "HttpOnly",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function csrfCookieAttrs(maxAge: number): string {
  // Readable by JS for double-submit CSRF header — still SameSite=Strict.
  const secure =
    process.env.NODE_ENV === "production" ||
    (process.env.VERCEL_ENV || "").toLowerCase() === "production" ||
    (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");
  const parts = [`Path=${COOKIE_PATH}`, "SameSite=Strict", `Max-Age=${Math.max(0, maxAge)}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(name: string, httpOnly: boolean): string {
  const base = httpOnly ? secureCookieAttrs(0) : csrfCookieAttrs(0);
  return `${name}=; ${base}`;
}

type MeOut = { email?: string; is_active?: boolean };

export async function assertFounderUserJwt(
  userJwt: string,
): Promise<{ email: string } | Response> {
  const allowlist = founderCanaryAllowlistFromEnv();
  if (allowlist.size === 0) {
    return Response.json(
      { detail: "FOUNDER_CANARY_ALLOWLIST / FOUNDER_COMMAND_ALLOWLIST is not configured" },
      { status: 503 },
    );
  }
  const apiBase = getUpstreamApiBase();
  if (!apiBase) {
    return Response.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const meRes = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${userJwt}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (meRes.status === 401 || meRes.status === 403) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!meRes.ok) {
    return Response.json({ detail: "Unable to verify session" }, { status: 502 });
  }
  const me = (await meRes.json()) as MeOut;
  const email = (me.email ?? "").trim();
  if (!email || me.is_active === false || !isEmailInAllowlist(email, allowlist)) {
    return Response.json({ detail: "Forbidden — founder session required" }, { status: 403 });
  }
  return { email: email.toLowerCase() };
}

export function readBrowserBearer(req: Request): string | null {
  return extractBearerToken(req.headers.get("authorization"));
}

/** Reject browser-presented OPS/BETA/FOUNDER machine secrets (fail closed). */
export function looksLikeMachineOpsSecret(token: string): boolean {
  const candidates = [
    process.env.OPS_ADMIN_TOKEN,
    process.env.BETA_ADMIN_TOKEN,
    process.env.FOUNDER_COMMAND_TOKEN,
  ]
    .map((v) => (v || "").trim())
    .filter(Boolean);
  const presented = token.trim();
  for (const expected of candidates) {
    try {
      const a = Buffer.from(presented);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* length mismatch */
    }
  }
  return false;
}

export function sessionSecret(): string {
  return (
    process.env.FOUNDER_CANARY_SESSION_SECRET?.trim() ||
    process.env.FOUNDER_COMMAND_CSRF_SECRET?.trim() ||
    process.env.SECRET_KEY?.trim() ||
    ""
  );
}

/** Bind CSRF cookie value to elevated token so stolen CSRF alone is insufficient. */
export function bindCsrfToElevated(elevated: string, csrf: string): string {
  const secret = sessionSecret();
  if (!secret) return csrf;
  const digest = createHmac("sha256", secret).update(`${elevated}:${csrf}`).digest("hex").slice(0, 32);
  return `${csrf}.${digest}`;
}

export function verifyBoundCsrf(elevated: string, bound: string | null, header: string | null): boolean {
  const presented = (header || "").trim();
  const cookie = (bound || "").trim();
  if (!presented || !cookie) return false;
  const rawCsrf = cookie.includes(".") ? cookie.slice(0, cookie.lastIndexOf(".")) : cookie;
  if (presented !== cookie && presented !== rawCsrf) return false;
  const secret = sessionSecret();
  if (!secret) {
    return true;
  }
  const expectedBound = bindCsrfToElevated(elevated, rawCsrf);
  try {
    const a = Buffer.from(cookie);
    const b = Buffer.from(expectedBound);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Mutating canary BFF requests must send an explicit X-CSRF-Token header.
 * A valid CSRF cookie alone must never authorize the request.
 */
export function assertMutatingCsrf(opts: {
  elevated: string | null;
  csrfCookie: string | null;
  csrfHeader: string | null;
}): { ok: true; rawCsrf: string } | { ok: false; detail: string; status: number } {
  if (!opts.elevated?.trim()) {
    return { ok: false, detail: "Founder elevated session required for canary mutations", status: 403 };
  }
  const header = (opts.csrfHeader || "").trim();
  if (!header) {
    return { ok: false, detail: "CSRF header required", status: 403 };
  }
  const cookie = (opts.csrfCookie || "").trim();
  if (!cookie) {
    return { ok: false, detail: "CSRF cookie missing", status: 403 };
  }
  if (!verifyBoundCsrf(opts.elevated, cookie, header)) {
    return { ok: false, detail: "Invalid CSRF token", status: 403 };
  }
  const rawCsrf = cookie.includes(".") ? cookie.slice(0, cookie.lastIndexOf(".")) : cookie;
  return { ok: true, rawCsrf };
}

export { COOKIE_PATH };
