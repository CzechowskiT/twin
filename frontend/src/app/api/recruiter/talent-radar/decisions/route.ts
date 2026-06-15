import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

async function proxyDecisions(req: Request) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/talent-radar/decisions?${url.searchParams.toString()}`;
  const init: RequestInit = {
    method: req.method,
    headers: recruiterInboxUpstreamHeaders(req),
  };
  if (req.method === "POST") {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = await req.text();
  }
  const upstream = await fetch(upstreamUrl, init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request) {
  return proxyDecisions(req);
}

export async function POST(req: Request) {
  return proxyDecisions(req);
}
