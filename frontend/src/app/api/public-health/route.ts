import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/** Public proxy: API liveness + db_ok + ops flags (no secrets). */
export async function GET() {
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const root = base.replace(/\/$/, "");
  const [healthRes, celeryRes] = await Promise.all([
    fetch(`${root}/api/v1/health?db=1&ops=1`, { cache: "no-store" }),
    fetch(`${root}/api/v1/health/celery-status`, { cache: "no-store" }),
  ]);
  if (!healthRes.ok) {
    const body = await healthRes.text();
    return new NextResponse(body, {
      status: healthRes.status,
      headers: { "Content-Type": healthRes.headers.get("content-type") ?? "application/json" },
    });
  }
  const health = (await healthRes.json()) as Record<string, unknown>;
  let celery: Record<string, unknown> = {};
  if (celeryRes.ok) {
    celery = (await celeryRes.json()) as Record<string, unknown>;
  }
  return NextResponse.json({ ...health, celery });
}
