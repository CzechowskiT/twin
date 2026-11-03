import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "org-settings",
  "permissions",
  "audit-log",
  "scorecards",
  "notifications/draft",
  "onboarding",
  "trust-summary",
  "team/invites/dry-run",
]);

function resolveUpstreamPath(segments: string[]): string | null {
  const joined = segments.join("/");
  if (!ALLOWED.has(joined)) return null;
  return joined;
}

async function proxy(req: Request, segments: string[], method: string): Promise<Response> {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const path = resolveUpstreamPath(segments);
  if (!path) {
    return NextResponse.json({ detail: "wave3_path_not_allowed" }, { status: 404 });
  }
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/company/${path}?${url.searchParams.toString()}`;
  const init: RequestInit = {
    method,
    headers: recruiterInboxUpstreamHeaders(req),
    cache: "no-store",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.text();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", req.headers.get("content-type") ?? "application/json");
    init.headers = headers;
  }
  const upstream = await fetch(upstreamUrl, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "GET");
}

export async function PUT(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "PUT");
}

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "POST");
}
