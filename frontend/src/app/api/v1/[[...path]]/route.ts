import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host"]);

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const base = getPublicApiBase();
  if (!base) {
    const onVercel = process.env.VERCEL === "1";
    return NextResponse.json(
      {
        detail: onVercel
          ? "Missing NEXT_PUBLIC_API_URL on Vercel. Add it in Project → Settings → Environment Variables (Railway https://…up.railway.app, no trailing slash), then redeploy."
          : "Missing NEXT_PUBLIC_API_URL. Set it in .env.local for local dev.",
      },
      { status: 503 },
    );
  }

  const sub = pathSegments.length ? pathSegments.join("/") : "";
  const target = new URL(`/api/v1/${sub}`, base);
  req.nextUrl.searchParams.forEach((v, k) => {
    target.searchParams.set(k, v);
  });

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  const bearer =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    req.headers.get("x-twin-authorization") ??
    req.headers.get("X-Twin-Authorization");
  if (bearer) {
    headers.set("Authorization", bearer);
  }
  headers.set("accept-encoding", "identity");

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      // Default "follow" would chase OAuth 302 to LinkedIn and return HTML instead of passing Location to the browser.
      redirect: "manual",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json(
      {
        detail: `Cannot reach API (${msg}). Check NEXT_PUBLIC_API_URL matches your live Railway URL and Railway service is Active.`,
      },
      { status: 502 },
    );
  }

  const payload = await upstream.arrayBuffer();
  const res = new NextResponse(payload, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    res.headers.append(key, value);
  });
  return res;
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}
