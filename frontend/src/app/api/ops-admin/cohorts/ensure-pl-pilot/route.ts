import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const upstream = await fetch(`${base.replace(/\/$/, "")}/api/v1/admin/cohorts/ensure-pl-pilot`, {
    method: "POST",
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
