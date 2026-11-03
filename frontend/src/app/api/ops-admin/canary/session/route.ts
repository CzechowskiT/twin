import { NextResponse } from "next/server";

import {
  CANARY_AT_COOKIE,
  CANARY_CSRF_COOKIE,
  CANARY_ELEVATED_COOKIE,
  assertFounderUserJwt,
  bindCsrfToElevated,
  clearCookie,
  cookieValue,
  csrfCookieAttrs,
  looksLikeMachineOpsSecret,
  readBrowserBearer,
  secureCookieAttrs,
} from "@/lib/founder-canary-bff";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ElevateOut = {
  elevated_token?: string;
  csrf_token?: string;
  expires_in?: number;
  email?: string;
  mfa_enabled?: boolean;
  detail?: string;
};

/**
 * GET — status of Founder canary cookie session (no secrets).
 * POST — elevate after step-up/MFA; sets Secure HttpOnly SameSite cookies.
 * DELETE — clear elevated cookies.
 */
export async function GET(req: Request) {
  const elevated = Boolean(cookieValue(req, CANARY_ELEVATED_COOKIE));
  const hasAt = Boolean(cookieValue(req, CANARY_AT_COOKIE));
  const bearer = readBrowserBearer(req);
  let founder = false;
  let email: string | null = null;
  const probe = cookieValue(req, CANARY_AT_COOKIE) || bearer;
  if (probe && !looksLikeMachineOpsSecret(probe)) {
    const gate = await assertFounderUserJwt(probe);
    if (!(gate instanceof Response)) {
      founder = true;
      email = gate.email;
    }
  }
  return NextResponse.json(
    {
      founder,
      elevated,
      has_access_cookie: hasAt,
      email,
      cookie_auth: elevated || hasAt,
      ops_token_browser_storage: false,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const bearer = readBrowserBearer(req);
  if (!bearer) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (looksLikeMachineOpsSecret(bearer)) {
    return NextResponse.json(
      { detail: "Machine ops secrets are not accepted from the browser" },
      { status: 401 },
    );
  }

  const gate = await assertFounderUserJwt(bearer);
  if (gate instanceof Response) {
    return new NextResponse(await gate.text(), {
      status: gate.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiBase = getUpstreamApiBase();
  if (!apiBase) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }

  const stepUp = req.headers.get("x-twin-step-up");
  const mfaCode = req.headers.get("x-twin-mfa-code");
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    bodyText = "";
  }

  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${bearer}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (stepUp) upstreamHeaders["X-Twin-Step-Up"] = stepUp;
  if (mfaCode) upstreamHeaders["X-Twin-Mfa-Code"] = mfaCode;

  const upstream = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/v1/admin/canary/founder-elevate`,
    {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyText || "{}",
      cache: "no-store",
    },
  );
  const raw = await upstream.text();
  let data: ElevateOut = {};
  try {
    data = JSON.parse(raw) as ElevateOut;
  } catch {
    data = { detail: raw || `HTTP ${upstream.status}` };
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: typeof data.detail === "string" ? data.detail : `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const elevated = (data.elevated_token || "").trim();
  const csrf = (data.csrf_token || "").trim();
  const maxAge = Math.max(60, Math.min(15 * 60, Number(data.expires_in) || 15 * 60));
  if (!elevated || !csrf) {
    return NextResponse.json({ detail: "elevate_incomplete" }, { status: 502 });
  }

  const boundCsrf = bindCsrfToElevated(elevated, csrf);
  const res = NextResponse.json(
    {
      ok: true,
      elevated: true,
      email: data.email || gate.email,
      expires_in: maxAge,
      mfa_enabled: Boolean(data.mfa_enabled),
      // CSRF returned once so the client can send the header without reading HttpOnly cookies.
      csrf_token: boundCsrf,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  res.headers.append(
    "Set-Cookie",
    `${CANARY_AT_COOKIE}=${encodeURIComponent(bearer)}; ${secureCookieAttrs(maxAge)}`,
  );
  res.headers.append(
    "Set-Cookie",
    `${CANARY_ELEVATED_COOKIE}=${encodeURIComponent(elevated)}; ${secureCookieAttrs(maxAge)}`,
  );
  res.headers.append(
    "Set-Cookie",
    `${CANARY_CSRF_COOKIE}=${encodeURIComponent(boundCsrf)}; ${csrfCookieAttrs(maxAge)}`,
  );
  return res;
}

export async function DELETE() {
  const res = NextResponse.json(
    { ok: true, elevated: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  res.headers.append("Set-Cookie", clearCookie(CANARY_AT_COOKIE, true));
  res.headers.append("Set-Cookie", clearCookie(CANARY_ELEVATED_COOKIE, true));
  res.headers.append("Set-Cookie", clearCookie(CANARY_CSRF_COOKIE, false));
  return res;
}
