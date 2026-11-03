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
  founderCanaryConfigAudit,
  looksLikeMachineOpsSecret,
  readBrowserBearer,
  secureCookieAttrs,
  sessionSecret,
} from "@/lib/founder-canary-bff";
import { assertPreviewCanaryMutationAllowed } from "@/lib/founder-canary-preview-isolation";
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

type AuthStatusOut = {
  ok?: boolean;
  via?: string;
  email?: string | null;
  elevated?: boolean;
  mfa_enabled?: boolean;
  mfa_enrollment_required?: boolean;
  detail?: string;
};

function clearElevatedCookies(res: NextResponse): void {
  res.headers.append("Set-Cookie", clearCookie(CANARY_AT_COOKIE, true));
  res.headers.append("Set-Cookie", clearCookie(CANARY_ELEVATED_COOKIE, true));
  res.headers.append("Set-Cookie", clearCookie(CANARY_CSRF_COOKIE, true));
}

async function verifyElevatedUpstream(opts: {
  accessToken: string;
  elevated: string;
}): Promise<{ ok: true; body: AuthStatusOut } | { ok: false; status: number; detail: string }> {
  const apiBase = getUpstreamApiBase();
  if (!apiBase) {
    return { ok: false, status: 503, detail: "API base URL not configured" };
  }
  const upstream = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/v1/admin/canary/auth-status`,
    {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "X-Twin-Founder-Canary-Elevated": opts.elevated,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  const raw = await upstream.text();
  let body: AuthStatusOut = {};
  try {
    body = JSON.parse(raw) as AuthStatusOut;
  } catch {
    body = { detail: raw || `HTTP ${upstream.status}` };
  }
  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      detail: typeof body.detail === "string" ? body.detail : `HTTP ${upstream.status}`,
    };
  }
  if (!body.elevated && body.via !== "founder_elevated" && body.via !== "ops_machine") {
    return { ok: false, status: 401, detail: "Elevated session invalid" };
  }
  return { ok: true, body };
}

/**
 * GET — validate Founder canary cookie session; return csrf_token for page header
 * after server-side elevated verification. Never returns elevated/machine secrets.
 * POST — elevate after step-up/MFA; sets Secure HttpOnly SameSite cookies.
 * DELETE — clear elevated cookies.
 */
export async function GET(req: Request) {
  const audit = founderCanaryConfigAudit();
  const elevatedRaw = cookieValue(req, CANARY_ELEVATED_COOKIE);
  const atCookie = cookieValue(req, CANARY_AT_COOKIE);
  const csrfCookie = cookieValue(req, CANARY_CSRF_COOKIE);
  const bearer = readBrowserBearer(req);
  const probe = atCookie || bearer;

  let founder = false;
  let email: string | null = null;
  let mfaEnabled = false;

  if (probe && !looksLikeMachineOpsSecret(probe)) {
    const gate = await assertFounderUserJwt(probe);
    if (!(gate instanceof Response)) {
      founder = true;
      email = gate.email;
    }
  }

  // Cookie present is insufficient — must re-validate elevated session upstream.
  if (elevatedRaw && atCookie) {
    if (looksLikeMachineOpsSecret(atCookie)) {
      const res = NextResponse.json(
        {
          founder: false,
          elevated: false,
          has_access_cookie: false,
          email: null,
          cookie_auth: false,
          csrf_token: null,
          cleared: true,
          detail: "Machine ops secrets are not accepted from the browser",
          config_audit: audit,
          ops_token_browser_storage: false,
        },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
      clearElevatedCookies(res);
      return res;
    }

    const verified = await verifyElevatedUpstream({
      accessToken: atCookie,
      elevated: elevatedRaw,
    });
    if (!verified.ok) {
      const res = NextResponse.json(
        {
          founder,
          elevated: false,
          has_access_cookie: false,
          email,
          cookie_auth: false,
          csrf_token: null,
          cleared: true,
          detail: verified.detail,
          mfa_enabled: mfaEnabled,
          config_audit: audit,
          ops_token_browser_storage: false,
        },
        {
          status: verified.status === 403 ? 403 : 200,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
      clearElevatedCookies(res);
      return res;
    }

    mfaEnabled = Boolean(verified.body.mfa_enabled);
    email = (verified.body.email || email || "").trim().toLowerCase() || email;
    const csrfForClient = csrfCookie || null;
    const mfaEnrollmentRequired = Boolean(verified.body.mfa_enrollment_required);
    // If cookie CSRF missing but elevated still valid, fail closed to re-elevate
    // rather than inventing a new CSRF unbound to the elevated token.
    if (!csrfForClient || !sessionSecret()) {
      const res = NextResponse.json(
        {
          founder: true,
          elevated: false,
          has_access_cookie: Boolean(atCookie),
          email,
          cookie_auth: false,
          csrf_token: null,
          cleared: true,
          detail: "csrf_session_incomplete",
          mfa_enabled: mfaEnabled,
          mfa_enrollment_required: mfaEnrollmentRequired,
          config_audit: audit,
          ops_token_browser_storage: false,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      clearElevatedCookies(res);
      return res;
    }

    return NextResponse.json(
      {
        founder: true,
        elevated: true,
        has_access_cookie: true,
        email,
        cookie_auth: true,
        // Bound CSRF for X-CSRF-Token header after refresh — not elevated credentials.
        csrf_token: csrfForClient,
        mfa_enabled: mfaEnabled,
        mfa_enrollment_required: mfaEnrollmentRequired,
        via: verified.body.via || "founder_elevated",
        config_audit: audit,
        ops_token_browser_storage: false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // Elevated cookie without AT — invalid; clear.
  if (elevatedRaw && !atCookie) {
    const res = NextResponse.json(
      {
        founder,
        elevated: false,
        has_access_cookie: false,
        email,
        cookie_auth: false,
        csrf_token: null,
        cleared: true,
        detail: "Elevated session missing bound access cookie",
        config_audit: audit,
        ops_token_browser_storage: false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    clearElevatedCookies(res);
    return res;
  }

  return NextResponse.json(
    {
      founder,
      elevated: false,
      has_access_cookie: Boolean(atCookie),
      email,
      cookie_auth: Boolean(atCookie),
      csrf_token: null,
      mfa_enabled: mfaEnabled,
      config_audit: audit,
      ops_token_browser_storage: false,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  // Elevate is state-changing (issues elevated cookies) — block on unisolated Preview.
  const isolation = assertPreviewCanaryMutationAllowed();
  if (!isolation.ok) {
    return NextResponse.json({ detail: isolation.detail }, { status: isolation.status });
  }

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
  if (!sessionSecret()) {
    return NextResponse.json(
      { detail: "FOUNDER_CANARY_SESSION_SECRET is not configured" },
      { status: 503 },
    );
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
      // CSRF for X-CSRF-Token — never elevated_token / OPS secrets.
      csrf_token: boundCsrf,
      config_audit: founderCanaryConfigAudit(),
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
    { ok: true, elevated: false, csrf_token: null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  clearElevatedCookies(res);
  return res;
}
