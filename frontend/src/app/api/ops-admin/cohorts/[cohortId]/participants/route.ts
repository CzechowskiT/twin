import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ cohortId: string }> };

async function proxy(req: Request, path: string, init?: RequestInit) {
  const serverToken = (process.env.OPS_ADMIN_TOKEN || process.env.BETA_ADMIN_TOKEN)?.trim();
  if (!serverToken) {
    return NextResponse.json({ detail: "OPS_ADMIN_TOKEN or BETA_ADMIN_TOKEN is not set" }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${serverToken}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const upstream = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const { cohortId } = await ctx.params;
  return proxy(req, `/api/v1/admin/cohorts/${cohortId}/participants`);
}

export async function POST(req: Request, ctx: Ctx) {
  const { cohortId } = await ctx.params;
  const raw = await req.text();
  return proxy(req, `/api/v1/admin/cohorts/${cohortId}/participants`, {
    method: "POST",
    body: raw,
  });
}
