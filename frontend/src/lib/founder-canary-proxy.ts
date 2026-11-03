/**
 * Shared Founder-canary BFF proxy — cookie elevated session + CSRF.
 * Never accepts OPS_ADMIN_TOKEN from the browser; never copies it into JS storage.
 */

import { NextResponse } from "next/server";

import {
  CANARY_AT_COOKIE,
  CANARY_CSRF_COOKIE,
  CANARY_ELEVATED_COOKIE,
  assertFounderUserJwt,
  assertMutatingCsrf,
  cookieValue,
  looksLikeMachineOpsSecret,
  readBrowserBearer,
} from "@/lib/founder-canary-bff";
import { getUpstreamApiBase } from "@/lib/public-api-base";

function upstreamHeaders(opts: {
  accessToken: string | null;
  elevated: string | null;
  rawCsrf: string | null;
  contentType: string | null;
  stepUp: string | null;
  mfaCode: string | null;
  mutating: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
  if (opts.elevated) headers["X-Twin-Founder-Canary-Elevated"] = opts.elevated;
  if (opts.mutating && opts.rawCsrf) {
    headers["X-CSRF-Token"] = opts.rawCsrf;
  }
  if (opts.contentType) headers["Content-Type"] = opts.contentType;
  if (opts.stepUp) headers["X-Twin-Step-Up"] = opts.stepUp;
  if (opts.mfaCode) headers["X-Twin-Mfa-Code"] = opts.mfaCode;
  return headers;
}

export async function proxyFounderCanary(
  req: Request,
  upstreamPath: string,
): Promise<NextResponse> {
  const method = req.method.toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);

  const browserBearer = readBrowserBearer(req);
  if (browserBearer && looksLikeMachineOpsSecret(browserBearer)) {
    return NextResponse.json(
      { detail: "Machine ops secrets are not accepted from the browser" },
      { status: 401 },
    );
  }

  const cookieAt = cookieValue(req, CANARY_AT_COOKIE);
  const elevated = cookieValue(req, CANARY_ELEVATED_COOKIE);
  const csrfCookie = cookieValue(req, CANARY_CSRF_COOKIE);
  const accessToken = cookieAt || browserBearer;

  if (!accessToken && !elevated) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (accessToken && !elevated) {
    const gate = await assertFounderUserJwt(accessToken);
    if (gate instanceof Response) {
      return new NextResponse(await gate.text(), {
        status: gate.status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let rawCsrf: string | null = null;
  if (mutating) {
    const csrf = assertMutatingCsrf({
      elevated,
      csrfCookie,
      csrfHeader: req.headers.get("x-csrf-token"),
    });
    if (!csrf.ok) {
      return NextResponse.json({ detail: csrf.detail }, { status: csrf.status });
    }
    rawCsrf = csrf.rawCsrf;
  }

  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }

  const url = `${base.replace(/\/$/, "")}${upstreamPath}`;
  const init: RequestInit = {
    method,
    headers: upstreamHeaders({
      accessToken,
      elevated,
      rawCsrf,
      contentType: req.headers.get("content-type"),
      stepUp: req.headers.get("x-twin-step-up"),
      mfaCode: req.headers.get("x-twin-mfa-code"),
      mutating,
    }),
    cache: "no-store",
  };
  if (mutating) {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(url, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
