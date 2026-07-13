import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ recordId: string }> };

export async function GET(req: Request, { params }: Params) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const { recordId } = await params;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/talent-pool/${recordId}?${url.searchParams.toString()}`;
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

export async function PATCH(req: Request, { params }: Params) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const { recordId } = await params;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/talent-pool/${recordId}?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method: "PATCH",
    headers: recruiterInboxUpstreamHeaders(req),
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
