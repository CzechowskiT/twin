import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> },
) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const { applicationId } = await ctx.params;
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/pipeline/${applicationId}/transition?${url.searchParams.toString()}`;
  const body = await req.text();
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: { ...recruiterInboxUpstreamHeaders(req), "Content-Type": "application/json" },
    body: body || "{}",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
