import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const CANARY_SESSION_COOKIE = "twin_founder_canary_session";
export const CANARY_CSRF_COOKIE = "twin_founder_canary_csrf";
export const CANARY_COOKIE_PATH = "/api/ops-admin/canary";

export function canaryCookieOptions(maxAge: number, httpOnly = true) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: CANARY_COOKIE_PATH,
    maxAge,
    priority: "high" as const,
  };
}

export function clearCanaryCookies(response: NextResponse): void {
  response.cookies.set(CANARY_SESSION_COOKIE, "", canaryCookieOptions(0));
  response.cookies.set(CANARY_CSRF_COOKIE, "", canaryCookieOptions(0));
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validateCanaryMutation(request: NextRequest): NextResponse | null {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "invalid_origin" }, { status: 403 });
  }
  const header = request.headers.get("x-csrf-token")?.trim() ?? "";
  const cookie = request.cookies.get(CANARY_CSRF_COOKIE)?.value.trim() ?? "";
  if (!header || !cookie || !safeEqual(header, cookie)) {
    return NextResponse.json({ detail: "invalid_csrf" }, { status: 403 });
  }
  return null;
}

export async function proxyCanaryRequest(
  request: NextRequest,
  upstreamPath: string,
): Promise<NextResponse> {
  const canaryToken = request.cookies.get(CANARY_SESSION_COOKIE)?.value.trim();
  if (!canaryToken) {
    return NextResponse.json({ detail: "canary_session_required" }, { status: 401 });
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    const rejected = validateCanaryMutation(request);
    if (rejected) return rejected;
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "api_base_unavailable" }, { status: 503 });
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${canaryToken}`,
    Accept: "application/json",
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const locale = request.headers.get("x-locale");
  if (locale) headers["X-Locale"] = locale;
  const mutating = !["GET", "HEAD"].includes(request.method.toUpperCase());
  const upstream = await fetch(`${base.replace(/\/$/, "")}${upstreamPath}`, {
    method: request.method,
    headers,
    body: mutating ? await request.text() : undefined,
    cache: "no-store",
  });
  const body = await upstream.text();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
    },
  });
  if (upstream.status === 401 || upstream.status === 403) clearCanaryCookies(response);
  return response;
}
