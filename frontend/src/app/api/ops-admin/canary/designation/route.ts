import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/** Proxy GET/POST /api/v1/admin/canary/designation (ops Bearer). Never logs body. */
async function proxy(req: Request) {
  const serverToken = (process.env.OPS_ADMIN_TOKEN || process.env.BETA_ADMIN_TOKEN)?.trim();
  if (!serverToken) {
    return NextResponse.json(
      { detail: "OPS_ADMIN_TOKEN or BETA_ADMIN_TOKEN is not set" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${serverToken}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const url = `${base.replace(/\/$/, "")}/api/v1/admin/canary/designation`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }
  const upstream = await fetch(url, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request) {
  return proxy(req);
}

export async function POST(req: Request) {
  return proxy(req);
}
