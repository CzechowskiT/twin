import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const { itemId } = await params;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/trust-review-queue/${itemId}/decisions?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      ...recruiterInboxUpstreamHeaders(req),
      "Content-Type": "application/json",
    },
    body: await req.text(),
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request, { params }: Params) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const { itemId } = await params;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/trust-review-queue/${itemId}/decisions?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    headers: recruiterInboxUpstreamHeaders(req),
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
