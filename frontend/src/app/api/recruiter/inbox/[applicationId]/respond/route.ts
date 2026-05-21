import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

function recruiterToken(req: Request): string | null {
  const header = req.headers.get("x-twin-recruiter-token")?.trim();
  if (header) return header;
  const url = new URL(req.url);
  return url.searchParams.get("token")?.trim() || null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> },
) {
  const serverToken = process.env.RECRUITER_INBOX_TOKEN?.trim();
  if (!serverToken) {
    return NextResponse.json({ detail: "RECRUITER_INBOX_TOKEN is not set" }, { status: 503 });
  }
  const supplied = recruiterToken(req);
  if (supplied !== serverToken) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const { applicationId } = await ctx.params;
  const url = new URL(req.url);
  const company = url.searchParams.get("company_slug")?.trim();
  if (!company) {
    return NextResponse.json({ detail: "company_slug is required" }, { status: 400 });
  }
  const upstreamUrl = `${base.replace(/\/$/, "")}/api/v1/recruiter/inbox/${applicationId}/respond?${url.searchParams.toString()}`;
  const body = await req.text();
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: { "X-Twin-Recruiter-Token": serverToken, "Content-Type": "application/json" },
    body: body || "{}",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
