import { NextResponse } from "next/server";

import {
  extractBearerToken,
  founderAllowlistFromEnv,
  founderCommandUpstreamToken,
  isEmailInAllowlist,
} from "@/lib/founder-command-bff";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type MeOut = { email?: string; is_active?: boolean };

async function assertFounderSession(userJwt: string, apiBase: string): Promise<NextResponse | null> {
  const allowlist = founderAllowlistFromEnv();
  if (allowlist.size === 0) {
    return NextResponse.json(
      { detail: "FOUNDER_COMMAND_ALLOWLIST is not configured on the Next.js deployment" },
      { status: 503 },
    );
  }
  const meRes = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${userJwt}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (meRes.status === 401 || meRes.status === 403) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!meRes.ok) {
    return NextResponse.json({ detail: "Unable to verify session" }, { status: 502 });
  }
  const me = (await meRes.json()) as MeOut;
  const email = (me.email ?? "").trim();
  if (!email || me.is_active === false || !isEmailInAllowlist(email, allowlist)) {
    return NextResponse.json({ detail: "Forbidden — founder session required" }, { status: 403 });
  }
  return null;
}

async function fetchUpstreamCsrf(apiBase: string, founderToken: string): Promise<string> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/founder-command/csrf`, {
    headers: { Authorization: `Bearer ${founderToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`csrf_upstream_${res.status}`);
  }
  const data = (await res.json()) as { csrf_token?: string };
  const token = data.csrf_token?.trim();
  if (!token) throw new Error("csrf_missing");
  return token;
}

async function proxy(
  req: Request,
  pathSegments: string[] | undefined,
): Promise<NextResponse> {
  const userJwt = extractBearerToken(req.headers.get("authorization"));
  if (!userJwt) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const founderToken = founderCommandUpstreamToken();
  if (!founderToken) {
    return NextResponse.json(
      {
        detail:
          "FOUNDER_COMMAND_TOKEN (or OPS_ADMIN_TOKEN) is not set on the Next.js deployment",
      },
      { status: 503 },
    );
  }

  const apiBase = getUpstreamApiBase();
  if (!apiBase) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }

  const gate = await assertFounderSession(userJwt, apiBase);
  if (gate) return gate;

  const sub = (pathSegments ?? []).join("/");
  const url = new URL(req.url);
  const upstreamUrl = `${apiBase.replace(/\/$/, "")}/api/v1/founder-command/${sub}${url.search}`;

  const method = req.method.toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${founderToken}`,
    Accept: "application/json",
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const idempotency = req.headers.get("idempotency-key");
  if (idempotency) headers["Idempotency-Key"] = idempotency;

  if (mutating) {
    try {
      headers["X-CSRF-Token"] = await fetchUpstreamCsrf(apiBase, founderToken);
    } catch {
      return NextResponse.json({ detail: "Unable to obtain CSRF token" }, { status: 502 });
    }
  }

  const body = mutating ? await req.arrayBuffer() : undefined;
  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
