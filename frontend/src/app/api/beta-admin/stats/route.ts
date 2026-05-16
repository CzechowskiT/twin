import { NextResponse } from "next/server";

import { getPublicApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/**
 * Proxies authenticated admin stats from the FastAPI backend.
 * Caller must send `Authorization: Bearer <BETA_ADMIN_TOKEN>` matching this app's env.
 */
export async function GET(req: Request) {
  const serverToken = process.env.BETA_ADMIN_TOKEN?.trim();
  if (!serverToken) {
    return NextResponse.json({ detail: "BETA_ADMIN_TOKEN is not set on the Next.js deployment" }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${serverToken}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const base = getPublicApiBase();
  if (!base) {
    return NextResponse.json({ detail: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });
  }
  const url = `${base.replace(/\/$/, "")}/api/v1/beta/admin/stats`;
  const upstream = await fetch(url, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
