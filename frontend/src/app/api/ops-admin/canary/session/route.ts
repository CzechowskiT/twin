import { randomBytes } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  CANARY_CSRF_COOKIE,
  CANARY_SESSION_COOKIE,
  canaryCookieOptions,
  clearCanaryCookies,
  isSameOrigin,
  validateCanaryMutation,
} from "@/lib/canary-admin-bff";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SessionPayload = {
  canary_session_token_once?: string;
  expires_in_seconds?: number;
  [key: string]: unknown;
};

function csrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function withCsrf(payload: SessionPayload, status = 200): NextResponse {
  const csrf = csrfToken();
  const response = NextResponse.json({ ...payload, csrf_token: csrf }, { status });
  response.cookies.set(CANARY_CSRF_COOKIE, csrf, canaryCookieOptions(15 * 60));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function apiBase(): string | null {
  return getUpstreamApiBase()?.replace(/\/$/, "") || null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "invalid_origin" }, { status: 403 });
  }
  const authorization = request.headers.get("authorization")?.trim();
  const base = apiBase();
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ detail: "user_session_required" }, { status: 401 });
  }
  if (!base) return NextResponse.json({ detail: "api_base_unavailable" }, { status: 503 });
  const headers: Record<string, string> = { Authorization: authorization };
  const stepUp = request.headers.get("x-twin-step-up")?.trim();
  if (stepUp) headers["X-Twin-Step-Up"] = stepUp;
  const locale = request.headers.get("x-locale")?.trim();
  if (locale) headers["X-Locale"] = locale;
  const upstream = await fetch(`${base}/api/v1/admin/canary/session`, {
    method: "POST",
    headers,
    cache: "no-store",
  });
  const payload = (await upstream.json().catch(() => ({}))) as SessionPayload;
  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }
  const token = payload.canary_session_token_once?.trim();
  if (!token) return NextResponse.json({ detail: "canary_session_missing" }, { status: 502 });
  const maxAge = Math.min(Number(payload.expires_in_seconds) || 900, 30 * 60);
  delete payload.canary_session_token_once;
  const response = withCsrf({ ...payload, authenticated: true });
  response.cookies.set(CANARY_SESSION_COOKIE, token, canaryCookieOptions(maxAge));
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(CANARY_SESSION_COOKIE)?.value.trim();
  const base = apiBase();
  if (!token) return NextResponse.json({ detail: "canary_session_required" }, { status: 401 });
  if (!base) return NextResponse.json({ detail: "api_base_unavailable" }, { status: 503 });
  const upstream = await fetch(`${base}/api/v1/admin/canary/session`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(request.headers.get("x-locale")
        ? { "X-Locale": request.headers.get("x-locale") as string }
        : {}),
    },
    cache: "no-store",
  });
  const payload = (await upstream.json().catch(() => ({}))) as SessionPayload;
  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    clearCanaryCookies(response);
    return response;
  }
  return withCsrf(payload);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const rejected = validateCanaryMutation(request);
  if (rejected) return rejected;
  const response = NextResponse.json({ authenticated: false });
  clearCanaryCookies(response);
  return response;
}
