import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

async function proxyOpsAdmin(req: Request, path: string) {
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
  const incoming = new URL(req.url);
  const url = `${base.replace(/\/$/, "")}${path}${incoming.search}`;
  const upstream = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request) {
  return proxyOpsAdmin(req, "/api/v1/admin/funnel");
}
