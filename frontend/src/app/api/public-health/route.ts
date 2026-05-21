import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/** Public proxy: API liveness + db_ok (no secrets). */
export async function GET() {
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const url = `${base.replace(/\/$/, "")}/api/v1/health?db=1`;
  const upstream = await fetch(url, { cache: "no-store" });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
