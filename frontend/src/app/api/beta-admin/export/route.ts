import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/** Proxies authenticated CSV export from the FastAPI backend. */
export async function GET(req: Request) {
  const serverToken = process.env.BETA_ADMIN_TOKEN?.trim();
  if (!serverToken) {
    return NextResponse.json({ detail: "BETA_ADMIN_TOKEN is not set on the Next.js deployment" }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${serverToken}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json(
      { detail: "TWIN_API_BASE_URL or NEXT_PUBLIC_API_URL is not set" },
      { status: 503 },
    );
  }
  const url = `${base.replace(/\/$/, "")}/api/v1/beta/admin/export`;
  const upstream = await fetch(url, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!upstream.ok) {
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  }
  const csv = await upstream.text();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="beta_waitlist.csv"',
    },
  });
}
